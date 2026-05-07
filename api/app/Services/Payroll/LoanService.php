<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\Employee;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Payslip;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

/**
 * Loan lifecycle: creation, amortisation, payments. The payroll run pipeline
 * calls applyAmortisation() per payslip *after* the engine has computed the
 * statutory + manual deductions, but *before* the run is finalised.
 */
class LoanService
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * @param  array<string, mixed>  $data  Validated loan input.
     */
    public function create(array $data, User $actor): Loan
    {
        $data['outstanding_balance'] = $data['outstanding_balance'] ?? $data['principal'];
        $data['monthly_amortization'] = $data['monthly_amortization']
            ?? Money::round((float) $data['principal'] / max((int) $data['terms_months'], 1));

        $loan = Loan::create($data);

        $this->audit->log(
            'payroll.loan.created',
            target: $loan,
            after: $loan->toArray(),
            actor: $actor,
        );

        return $loan->load('employee.user');
    }

    public function update(Loan $loan, array $data, User $actor): Loan
    {
        $before = $loan->toArray();
        $loan->fill($data)->save();

        $this->audit->log(
            'payroll.loan.updated',
            target: $loan,
            before: $before,
            after: $loan->fresh()->toArray(),
            actor: $actor,
        );

        return $loan->fresh(['employee.user']);
    }

    /**
     * Active loans for an employee, ordered by start_date.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, Loan>
     */
    public function activeForEmployee(string $employeeId): \Illuminate\Database\Eloquent\Collection
    {
        return Loan::query()
            ->where('employee_id', $employeeId)
            ->where('status', 'active')
            ->where('outstanding_balance', '>', 0)
            ->orderBy('start_date')
            ->get();
    }

    /**
     * Apply this period's amortisation to all active loans of an employee.
     * Persists a LoanPayment per loan and reduces the outstanding balance.
     *
     * The caller (PayrollRunService) is expected to have wrapped this in a DB
     * transaction so a failure mid-run rolls back the loan deductions.
     *
     * @return list<array{loan: Loan, payment: LoanPayment, deduction_item: array<string, mixed>}>
     */
    public function applyAmortisationForPayslip(Employee $employee, Payslip $payslip): array
    {
        $loans = $this->activeForEmployee($employee->id);
        if ($loans->isEmpty()) {
            return [];
        }

        $applied = [];
        foreach ($loans as $loan) {
            // Cap the amortisation at the outstanding balance so the final
            // period only deducts what's left, not the full instalment.
            $amount = min(
                Money::toFloat($loan->monthly_amortization),
                Money::toFloat($loan->outstanding_balance),
            );
            if ($amount <= 0) {
                continue;
            }

            $newBalance = Money::round(Money::toFloat($loan->outstanding_balance) - $amount);

            $payment = LoanPayment::create([
                'loan_id' => $loan->id,
                'payslip_id' => $payslip->id,
                'amount' => $amount,
                'principal_portion' => $amount,    // Simple straight-line; interest model can extend this.
                'interest_portion' => 0,
                'balance_after' => $newBalance,
                'payment_date' => $payslip->generated_at?->toDateString() ?? now()->toDateString(),
            ]);

            $loan->outstanding_balance = $newBalance;
            $loan->status = $newBalance <= 0 ? 'paid' : 'active';
            $loan->save();

            $applied[] = [
                'loan' => $loan,
                'payment' => $payment,
                'deduction_item' => [
                    'category' => 'deduction_loan',
                    'code' => "LOAN_{$loan->type}",
                    'label' => $this->loanLabel($loan),
                    'quantity' => 1.0,
                    'rate' => $amount,
                    'amount' => $amount,
                    'is_taxable' => false,
                    'sort_order' => 70,
                    'meta' => [
                        'loan_id' => $loan->id,
                        'loan_type' => $loan->type,
                        'reference_number' => $loan->reference_number,
                        'balance_after' => $newBalance,
                    ],
                ],
            ];
        }

        return $applied;
    }

    private function loanLabel(Loan $loan): string
    {
        return match ($loan->type) {
            'sss' => 'SSS Salary Loan',
            'pagibig' => 'Pag-IBIG Loan',
            'company' => 'Company Loan',
            'salary_advance' => 'Salary Advance',
            default => 'Loan Deduction',
        };
    }

    public function paginate(array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $perPage = min((int) ($filters['per_page'] ?? 15), 100);

        return Loan::query()
            ->with(['employee.user'])
            ->when(isset($filters['employee_id']), fn ($q) => $q->where('employee_id', $filters['employee_id']))
            ->when(isset($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(isset($filters['type']), fn ($q) => $q->where('type', $filters['type']))
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function find(string $id): Loan
    {
        $loan = Loan::with(['employee.user', 'payments.payslip'])->find($id);
        if (! $loan) {
            abort(404, 'Loan not found.');
        }
        return $loan;
    }
}
