<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\Employee;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Validation\ValidationException;

/**
 * Final pay (separation pay / last-pay) computation.
 *
 * DOLE Labor Advisory No. 06-20 ("Guidelines on the Payment of Final Pay") requires
 * release within 30 days of clearance. Final pay typically includes:
 *
 *   1. Unpaid earned salary up to the last day of work
 *   2. Pro-rated 13th-month pay for the current year
 *   3. Cash conversion of unused vacation leave (if SIL or company policy provides)
 *   4. Separation pay (where applicable per Labor Code Art. 298–299)
 *   5. Refund of any cash bonds / deposits
 *   6. Other earned but unreleased benefits
 *
 * This service computes the *amounts*; persisting them as a payroll run is
 * delegated to PayrollRunService when the HR admin chooses to.
 */
class FinalPayService
{
    public function __construct(
        private ThirteenthMonthService $thirteenthMonth,
        private AuditLogger $audit,
    ) {}

    /**
     * @param  array{
     *     last_day_worked: string,
     *     unpaid_days: float,
     *     unused_leave_days: float,
     *     separation_reason: string,
     *     additional_earnings?: list<array{code: string, label: string, amount: float}>,
     *     additional_deductions?: list<array{code: string, label: string, amount: float}>,
     * }  $context
     * @return array{
     *     unpaid_salary: float,
     *     prorated_13th_month: float,
     *     leave_encashment: float,
     *     separation_pay: float,
     *     additional_earnings: float,
     *     additional_deductions: float,
     *     gross_total: float,
     *     summary_lines: list<array{code: string, label: string, amount: float}>,
     * }
     */
    public function compute(Employee $employee, array $context): array
    {
        $rates = RateCalculator::fromEmployee($employee);
        $year = (int) date('Y', strtotime($context['last_day_worked']));

        $unpaidSalary = Money::round($rates['daily'] * (float) $context['unpaid_days']);

        $thirteenthMonth = $this->thirteenthMonth->computeForEmployee($employee, $year);
        $proratedThirteenth = $thirteenthMonth['thirteenth_month'];

        $leaveEncashment = Money::round($rates['daily'] * (float) $context['unused_leave_days']);

        $separationPay = $this->computeSeparationPay($employee, $context['separation_reason'], $rates['monthly']);

        $additionalEarnings = 0.0;
        $earningLines = [];
        foreach ($context['additional_earnings'] ?? [] as $row) {
            $additionalEarnings += (float) $row['amount'];
            $earningLines[] = [
                'code' => $row['code'],
                'label' => $row['label'],
                'amount' => Money::round((float) $row['amount']),
            ];
        }

        $additionalDeductions = 0.0;
        $deductionLines = [];
        foreach ($context['additional_deductions'] ?? [] as $row) {
            $additionalDeductions += (float) $row['amount'];
            $deductionLines[] = [
                'code' => $row['code'],
                'label' => $row['label'],
                'amount' => Money::round((float) $row['amount']),
            ];
        }

        $grossTotal = Money::round(
            $unpaidSalary + $proratedThirteenth + $leaveEncashment
            + $separationPay + $additionalEarnings - $additionalDeductions
        );

        $summaryLines = array_merge(
            [
                ['code' => 'UNPAID_SALARY', 'label' => 'Unpaid Salary', 'amount' => $unpaidSalary],
                ['code' => 'PRORATED_13TH', 'label' => 'Pro-rated 13th-Month Pay', 'amount' => $proratedThirteenth],
                ['code' => 'LEAVE_ENCASHMENT', 'label' => 'Unused Leave Conversion', 'amount' => $leaveEncashment],
            ],
            $separationPay > 0
                ? [['code' => 'SEPARATION_PAY', 'label' => 'Separation Pay', 'amount' => $separationPay]]
                : [],
            $earningLines,
            array_map(fn (array $r) => [...$r, 'amount' => -1 * $r['amount']], $deductionLines),
        );

        return [
            'unpaid_salary' => $unpaidSalary,
            'prorated_13th_month' => $proratedThirteenth,
            'leave_encashment' => $leaveEncashment,
            'separation_pay' => $separationPay,
            'additional_earnings' => Money::round($additionalEarnings),
            'additional_deductions' => Money::round($additionalDeductions),
            'gross_total' => $grossTotal,
            'summary_lines' => $summaryLines,
        ];
    }

    /**
     * Separation pay rules per Labor Code Art. 298–299:
     *   - Authorised causes (redundancy, retrenchment, closure, disease):
     *       at least 1 month or ½ month per year of service, whichever is higher
     *       (full 1 month for redundancy / installation of labour-saving devices)
     *   - Resignation / termination for just cause: no separation pay
     */
    private function computeSeparationPay(Employee $employee, string $reason, float $monthlyEquivalent): float
    {
        if (! $employee->date_hired) {
            return 0.0;
        }

        $yearsOfService = max(1, (int) round($employee->date_hired->diffInYears(now())));

        return match ($reason) {
            'redundancy', 'installation_labor_saving_devices' =>
                Money::round(max($monthlyEquivalent, $monthlyEquivalent * $yearsOfService)),
            'retrenchment', 'closure_not_due_to_serious_losses', 'disease' =>
                Money::round(max($monthlyEquivalent, $monthlyEquivalent * 0.5 * $yearsOfService)),
            default => 0.0, // resignation, just_cause, end_of_contract
        };
    }

    public function record(Employee $employee, array $context, User $actor): array
    {
        if (! in_array($employee->employment_status, ['resigned', 'terminated', 'on_leave', 'regular'], true)) {
            throw ValidationException::withMessages([
                'employee' => ['Final pay can only be recorded for employees in a separable status.'],
            ]);
        }

        $result = $this->compute($employee, $context);

        $this->audit->log(
            'payroll.final_pay.computed',
            target: $employee,
            after: $result,
            metadata: ['context' => $context],
            actor: $actor,
        );

        return $result;
    }
}
