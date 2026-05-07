<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\Employee;
use App\Models\PayrollPeriod;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipItem;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Orchestrates a payroll run end-to-end.
 *
 * Lifecycle:
 *   1. createDraft()       — creates a draft run, attaches the period, captures scope
 *   2. generatePayslips()  — for each in-scope employee, runs the engine + persists payslip + items + loan payments
 *   3. finalize()          — locks the run; payslips become read-only
 *   4. markPaid()          — marks the run + child payslips as paid
 *   5. cancel()            — only for drafts
 */
class PayrollRunService
{
    public function __construct(
        private PayrollEngineService $engine,
        private LoanService $loans,
        private AuditLogger $audit,
    ) {}

    public function createDraft(array $data, User $actor): PayrollRun
    {
        return DB::transaction(function () use ($data, $actor) {
            /** @var PayrollPeriod $period */
            $period = PayrollPeriod::findOrFail($data['payroll_period_id']);

            $run = PayrollRun::create([
                'payroll_period_id' => $period->id,
                'reference_number' => $this->nextReferenceNumber(),
                'scope' => $data['scope'] ?? 'company',
                'scope_filters' => $data['scope_filters'] ?? null,
                'status' => 'draft',
                'generated_by_id' => $actor->id,
                'generated_at' => now(),
                'notes' => $data['notes'] ?? null,
            ]);

            $this->audit->log(
                'payroll.run.created',
                target: $run,
                after: $run->toArray(),
                actor: $actor,
            );

            return $run->load(['period', 'generatedBy']);
        });
    }

    /**
     * Generate (or regenerate) payslips for all in-scope employees.
     *
     * @param  array<string, PayrollInputs>  $perEmployeeInputs  Keyed by employee_id; absent
     *                                                            employees default to PayrollInputs::empty().
     */
    public function generatePayslips(
        PayrollRun $run,
        array $perEmployeeInputs,
        User $actor,
        ?int $effectiveYear = null,
    ): PayrollRun {
        if ($run->isLocked()) {
            throw ValidationException::withMessages([
                'status' => ['Cannot regenerate payslips on a finalized or paid run.'],
            ]);
        }

        $effectiveYear ??= (int) now()->format('Y');

        return DB::transaction(function () use ($run, $perEmployeeInputs, $actor, $effectiveYear) {
            // Wipe any existing draft payslips so regeneration is clean.
            $run->payslips()->each(function (Payslip $payslip) {
                $payslip->loanPayments()->delete();
                $payslip->items()->delete();
                $payslip->forceDelete();
            });

            $employees = $this->resolveScope($run);

            $totalGross = 0.0;
            $totalDeductions = 0.0;
            $totalNet = 0.0;
            $totalEmployerCost = 0.0;

            foreach ($employees as $employee) {
                $inputs = $perEmployeeInputs[$employee->id] ?? PayrollInputs::empty();
                $computed = $this->engine->computeForEmployee($employee, $inputs, $effectiveYear);
                $summary = $computed['summary'];

                $payslip = Payslip::create([
                    'payroll_run_id' => $run->id,
                    'employee_id' => $employee->id,
                    ...$summary,
                    'status' => 'draft',
                    'generated_at' => now(),
                ]);

                // Persist line items
                foreach ($computed['items'] as $item) {
                    PayslipItem::create([
                        'payslip_id' => $payslip->id,
                        ...$item,
                    ]);
                }

                // Apply loan amortisation as additional deductions
                $loanApplications = $this->loans->applyAmortisationForPayslip($employee, $payslip);
                foreach ($loanApplications as $application) {
                    PayslipItem::create([
                        'payslip_id' => $payslip->id,
                        ...$application['deduction_item'],
                    ]);

                    // Adjust payslip totals to include the loan deduction
                    $loanAmount = (float) $application['deduction_item']['amount'];
                    $payslip->total_deductions = Money::round((float) $payslip->total_deductions + $loanAmount);
                    $payslip->net_pay = Money::round((float) $payslip->net_pay - $loanAmount);
                }
                if (! empty($loanApplications)) {
                    $payslip->save();
                }

                $totalGross += (float) $payslip->gross_earnings;
                $totalDeductions += (float) $payslip->total_deductions;
                $totalNet += (float) $payslip->net_pay;
                $totalEmployerCost += (float) $payslip->gross_earnings
                    + (float) $payslip->sss_employer
                    + (float) $payslip->sss_ec_employer
                    + (float) $payslip->philhealth_employer
                    + (float) $payslip->pagibig_employer;
            }

            $run->update([
                'total_gross' => Money::round($totalGross),
                'total_deductions' => Money::round($totalDeductions),
                'total_net' => Money::round($totalNet),
                'total_employer_cost' => Money::round($totalEmployerCost),
                'headcount' => $employees->count(),
                'computation_snapshot' => [
                    'effective_year' => $effectiveYear,
                    'generated_at' => now()->toIso8601String(),
                ],
            ]);

            $this->audit->log(
                'payroll.run.payslips_generated',
                target: $run,
                after: ['headcount' => $run->headcount, 'total_net' => (float) $run->total_net],
                actor: $actor,
            );

            return $run->fresh(['period', 'payslips.employee.user', 'payslips.items']);
        });
    }

    public function finalize(PayrollRun $run, User $actor): PayrollRun
    {
        if ($run->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ["Cannot finalize a run with status '{$run->status}'."],
            ]);
        }

        if ($run->payslips()->count() === 0) {
            throw ValidationException::withMessages([
                'payslips' => ['Cannot finalize a run with no payslips. Generate payslips first.'],
            ]);
        }

        $before = $run->toArray();

        $run->update([
            'status' => 'finalized',
            'finalized_by_id' => $actor->id,
            'finalized_at' => now(),
        ]);

        $run->payslips()->update(['status' => 'finalized']);

        $this->audit->log(
            'payroll.run.finalized',
            target: $run,
            before: $before,
            after: $run->fresh()->toArray(),
            actor: $actor,
        );

        return $run->fresh(['period', 'payslips']);
    }

    public function markPaid(PayrollRun $run, User $actor): PayrollRun
    {
        if ($run->status !== 'finalized') {
            throw ValidationException::withMessages([
                'status' => ['Only finalized runs can be marked as paid.'],
            ]);
        }

        $before = $run->toArray();
        $run->update(['status' => 'paid']);
        $run->payslips()->update(['status' => 'paid']);

        $this->audit->log(
            'payroll.run.marked_paid',
            target: $run,
            before: $before,
            after: $run->fresh()->toArray(),
            actor: $actor,
        );

        return $run->fresh(['period', 'payslips']);
    }

    public function cancel(PayrollRun $run, User $actor): PayrollRun
    {
        if ($run->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft runs can be canceled.'],
            ]);
        }

        $before = $run->toArray();
        $run->update(['status' => 'canceled']);

        $this->audit->log(
            'payroll.run.canceled',
            target: $run,
            before: $before,
            actor: $actor,
        );

        return $run->fresh();
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Employee>
     */
    private function resolveScope(PayrollRun $run): \Illuminate\Database\Eloquent\Collection
    {
        $query = Employee::query()
            ->with(['user', 'department', 'position'])
            ->whereNotIn('employment_status', ['resigned', 'terminated'])
            ->where('basic_salary', '>', 0);

        $filters = $run->scope_filters ?? [];

        if ($run->scope === 'department' && ! empty($filters['department_ids'])) {
            $query->whereIn('department_id', $filters['department_ids']);
        }

        if ($run->scope === 'custom' && ! empty($filters['employee_ids'])) {
            $query->whereIn('id', $filters['employee_ids']);
        }

        return $query->orderBy('employee_number')->get();
    }

    private function nextReferenceNumber(): string
    {
        $prefix = 'PR-' . now()->format('Ym') . '-';
        $latest = PayrollRun::query()
            ->where('reference_number', 'like', "{$prefix}%")
            ->orderByDesc('reference_number')
            ->value('reference_number');

        $seq = $latest ? ((int) substr($latest, strlen($prefix))) + 1 : 1;

        return sprintf('%s%03d', $prefix, $seq);
    }

    public function paginate(array $filters = []): LengthAwarePaginator
    {
        $perPage = min((int) ($filters['per_page'] ?? 15), 100);

        return PayrollRun::query()
            ->with(['period', 'generatedBy', 'finalizedBy'])
            ->when(isset($filters['status']), fn (Builder $q) => $q->where('status', $filters['status']))
            ->when(isset($filters['payroll_period_id']), fn (Builder $q) => $q->where('payroll_period_id', $filters['payroll_period_id']))
            ->when(isset($filters['date_from']), fn (Builder $q) => $q->whereHas('period', fn ($p) => $p->where('period_start', '>=', $filters['date_from'])))
            ->when(isset($filters['date_to']), fn (Builder $q) => $q->whereHas('period', fn ($p) => $p->where('period_end', '<=', $filters['date_to'])))
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function find(string $id): PayrollRun
    {
        $run = PayrollRun::with(['period', 'generatedBy', 'finalizedBy', 'payslips.employee.user'])->find($id);
        if (! $run) {
            abort(404, 'Payroll run not found.');
        }
        return $run;
    }
}
