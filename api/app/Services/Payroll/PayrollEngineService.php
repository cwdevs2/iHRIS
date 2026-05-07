<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\Employee;
use App\Services\Payroll\Statutory\BirTaxCalculator;
use App\Services\Payroll\Statutory\PagibigCalculator;
use App\Services\Payroll\Statutory\PhilhealthCalculator;
use App\Services\Payroll\Statutory\SssCalculator;

/**
 * Pure-computation engine. Given an employee + period inputs, produces a fully
 * itemised payslip representation as plain arrays — *no DB writes happen here*.
 * Persistence is the caller's responsibility (PayrollRunService), keeping this
 * class trivially unit-testable per HRIS_MASTER §6 ("Payroll engine is a
 * standalone Laravel Service class with unit tests").
 *
 * Premium rates applied (PH Labor Code, current rates):
 *   - Overtime (weekday)            +25%   → hourly_rate × 1.25
 *   - Overtime on rest day          +30%   → hourly_rate × 1.30 × 1.30 (premium then OT)
 *   - Rest day worked               +30%   → hourly_rate × 1.30 (regular hours portion)
 *   - Regular holiday worked        +100%  → hourly_rate × 2.00 (200% of daily rate)
 *   - Regular holiday OT            +100%+30% → hourly_rate × 2.00 × 1.30
 *   - Special non-working worked    +30%   → hourly_rate × 1.30
 *   - Night differential            +10%   → hourly_rate × 0.10 (added on top of OT/HOL premiums)
 */
class PayrollEngineService
{
    public function __construct(
        private SssCalculator $sss,
        private PhilhealthCalculator $philhealth,
        private PagibigCalculator $pagibig,
        private BirTaxCalculator $bir,
    ) {}

    /**
     * Compute one employee's payslip for a period.
     *
     * @param  Employee  $employee  Must have basic_salary + pay_frequency loaded.
     * @return array{
     *   summary: array<string, float|string|int>,
     *   items:   list<array{category: string, code: string, label: string, quantity: float, rate: float, amount: float, is_taxable: bool, sort_order: int, meta?: array<string, mixed>}>,
     *   snapshot: array<string, mixed>,
     * }
     */
    public function computeForEmployee(
        Employee $employee,
        PayrollInputs $inputs,
        int $effectiveYear,
        ?float $monthlyWorkingDays = null,
    ): array {
        $rates = RateCalculator::fromEmployee($employee, $monthlyWorkingDays);
        $hourly = $rates['hourly'];
        $daily = $rates['daily'];

        $earnings = [];
        $deductions = [];

        // ── Earnings: basic / OT / holiday / night diff / allowances / bonuses ──

        // Basic pay — pay-period proportion of the monthly equivalent.
        $basicForPeriod = $this->basicForPeriod($employee, $rates['monthly']);
        $earnings[] = [
            'category' => 'earning_basic',
            'code' => 'BASIC',
            'label' => 'Basic Pay',
            'quantity' => 1.0,
            'rate' => $basicForPeriod,
            'amount' => Money::round($basicForPeriod),
            'is_taxable' => true,
            'sort_order' => 10,
            'meta' => ['monthly_rate' => $rates['monthly'], 'pay_frequency' => $employee->pay_frequency],
        ];

        // Late / undertime / absences — apply as negative earning items, *not* deductions.
        // Reduces gross & taxable income (matches BIR treatment of "no work, no pay").
        if ($inputs->absentDays > 0 && $daily > 0) {
            $absentAmount = -1 * Money::round($daily * $inputs->absentDays);
            $earnings[] = [
                'category' => 'earning_basic',
                'code' => 'ABSENT',
                'label' => 'Absences',
                'quantity' => $inputs->absentDays,
                'rate' => $daily,
                'amount' => $absentAmount,
                'is_taxable' => true,
                'sort_order' => 11,
            ];
        }

        if ($inputs->lateMinutes > 0 && $hourly > 0) {
            $lateAmount = -1 * Money::round(($hourly / 60) * $inputs->lateMinutes);
            $earnings[] = [
                'category' => 'earning_basic',
                'code' => 'LATE',
                'label' => 'Tardiness',
                'quantity' => $inputs->lateMinutes,
                'rate' => Money::round($hourly / 60),
                'amount' => $lateAmount,
                'is_taxable' => true,
                'sort_order' => 12,
            ];
        }

        if ($inputs->undertimeMinutes > 0 && $hourly > 0) {
            $utAmount = -1 * Money::round(($hourly / 60) * $inputs->undertimeMinutes);
            $earnings[] = [
                'category' => 'earning_basic',
                'code' => 'UT',
                'label' => 'Undertime',
                'quantity' => $inputs->undertimeMinutes,
                'rate' => Money::round($hourly / 60),
                'amount' => $utAmount,
                'is_taxable' => true,
                'sort_order' => 13,
            ];
        }

        // Overtime — weekday OT @ +25%
        if ($inputs->overtimeHours > 0 && $hourly > 0) {
            $otRate = $hourly * 1.25;
            $earnings[] = [
                'category' => 'earning_overtime',
                'code' => 'OT_REG',
                'label' => 'Overtime (Regular)',
                'quantity' => $inputs->overtimeHours,
                'rate' => Money::round($otRate),
                'amount' => Money::round($otRate * $inputs->overtimeHours),
                'is_taxable' => true,
                'sort_order' => 20,
                'meta' => ['premium' => 0.25],
            ];
        }

        // Rest day worked — +30%
        if ($inputs->restDayHours > 0 && $hourly > 0) {
            $rdRate = $hourly * 1.30;
            $earnings[] = [
                'category' => 'earning_overtime',
                'code' => 'REST_DAY',
                'label' => 'Rest Day Premium',
                'quantity' => $inputs->restDayHours,
                'rate' => Money::round($rdRate),
                'amount' => Money::round($rdRate * $inputs->restDayHours),
                'is_taxable' => true,
                'sort_order' => 21,
                'meta' => ['premium' => 0.30],
            ];
        }

        // Regular holiday — 200% (basic + 100% premium) when worked
        if ($inputs->regularHolidayHours > 0 && $hourly > 0) {
            $rhRate = $hourly * 2.00;
            $earnings[] = [
                'category' => 'earning_holiday',
                'code' => 'HOL_REG',
                'label' => 'Regular Holiday Pay',
                'quantity' => $inputs->regularHolidayHours,
                'rate' => Money::round($rhRate),
                'amount' => Money::round($rhRate * $inputs->regularHolidayHours),
                'is_taxable' => true,
                'sort_order' => 22,
                'meta' => ['premium' => 1.00],
            ];
        }

        // Special non-working holiday — 130% when worked
        if ($inputs->specialHolidayHours > 0 && $hourly > 0) {
            $shRate = $hourly * 1.30;
            $earnings[] = [
                'category' => 'earning_holiday',
                'code' => 'HOL_SPECIAL',
                'label' => 'Special Holiday Pay',
                'quantity' => $inputs->specialHolidayHours,
                'rate' => Money::round($shRate),
                'amount' => Money::round($shRate * $inputs->specialHolidayHours),
                'is_taxable' => true,
                'sort_order' => 23,
                'meta' => ['premium' => 0.30],
            ];
        }

        // Night differential — +10% on top of regular hourly rate, applied to hours worked between 10PM–6AM
        if ($inputs->nightDiffHours > 0 && $hourly > 0) {
            $ndRate = $hourly * 0.10;
            $earnings[] = [
                'category' => 'earning_night_diff',
                'code' => 'ND',
                'label' => 'Night Differential',
                'quantity' => $inputs->nightDiffHours,
                'rate' => Money::round($ndRate),
                'amount' => Money::round($ndRate * $inputs->nightDiffHours),
                'is_taxable' => true,
                'sort_order' => 24,
                'meta' => ['premium' => 0.10],
            ];
        }

        // Allowances — taxability per item; non-taxable items are excluded from
        // the BIR projection (e.g. de minimis, transport allowance up to limit).
        $sortBase = 30;
        foreach ($inputs->allowances as $i => $allowance) {
            $earnings[] = [
                'category' => 'earning_allowance',
                'code' => $allowance['code'],
                'label' => $allowance['label'],
                'quantity' => 1.0,
                'rate' => $allowance['amount'],
                'amount' => Money::round($allowance['amount']),
                'is_taxable' => $allowance['is_taxable'] ?? true,
                'sort_order' => $allowance['sort_order'] ?? $sortBase + $i,
            ];
        }

        // Bonuses — typically taxable, but include `is_taxable=false` for the
        // ₱90,000 13th-month exemption when generated by 13th-month workflow.
        $sortBase = 40;
        foreach ($inputs->bonuses as $i => $bonus) {
            $earnings[] = [
                'category' => 'earning_bonus',
                'code' => $bonus['code'],
                'label' => $bonus['label'],
                'quantity' => 1.0,
                'rate' => $bonus['amount'],
                'amount' => Money::round($bonus['amount']),
                'is_taxable' => $bonus['is_taxable'] ?? true,
                'sort_order' => $bonus['sort_order'] ?? $sortBase + $i,
            ];
        }

        // ── Roll-up gross & taxable ──
        $grossEarnings = array_sum(array_column($earnings, 'amount'));
        $taxableIncomePreStatutory = array_sum(array_map(
            fn (array $i) => $i['is_taxable'] ? $i['amount'] : 0.0,
            $earnings,
        ));

        // ── Statutory deductions ──
        // SSS / PhilHealth / Pag-IBIG are computed off the *monthly* equivalent
        // even on semi-monthly payroll, then the EE share for the period is
        // taken as half (consistent with PH practice of splitting contributions
        // between the two cutoffs of the same month).
        $statutoryDivisor = match ($employee->pay_frequency) {
            'semi_monthly' => 2.0,
            'weekly' => 4.0,
            'bi_weekly' => 2.0,
            'daily' => 22.0,
            default => 1.0,
        };

        $sss = $this->sss->compute($rates['monthly'], $effectiveYear);
        $sssEE = Money::round($sss['employee'] / $statutoryDivisor);
        $deductions[] = [
            'category' => 'deduction_statutory',
            'code' => 'SSS_EE',
            'label' => 'SSS Contribution',
            'quantity' => 1.0,
            'rate' => $sssEE,
            'amount' => $sssEE,
            'is_taxable' => false,
            'sort_order' => 50,
            'meta' => ['monthly_share' => $sss['employee'], 'msc_min' => $sss['msc_min']],
        ];

        $philhealth = $this->philhealth->compute($rates['monthly'], $effectiveYear);
        $phicEE = Money::round($philhealth['employee'] / $statutoryDivisor);
        $deductions[] = [
            'category' => 'deduction_statutory',
            'code' => 'PHIC_EE',
            'label' => 'PhilHealth Contribution',
            'quantity' => 1.0,
            'rate' => $phicEE,
            'amount' => $phicEE,
            'is_taxable' => false,
            'sort_order' => 51,
            'meta' => ['monthly_share' => $philhealth['employee'], 'base' => $philhealth['base']],
        ];

        $pagibig = $this->pagibig->compute($rates['monthly'], $effectiveYear);
        $hdmfEE = Money::round($pagibig['employee'] / $statutoryDivisor);
        $deductions[] = [
            'category' => 'deduction_statutory',
            'code' => 'HDMF_EE',
            'label' => 'Pag-IBIG Contribution',
            'quantity' => 1.0,
            'rate' => $hdmfEE,
            'amount' => $hdmfEE,
            'is_taxable' => false,
            'sort_order' => 52,
            'meta' => ['monthly_share' => $pagibig['employee']],
        ];

        // BIR withholding — projected from the *period* taxable income net of statutory contributions
        // (PH Tax Code §32(B)(7)(f): SSS/PhilHealth/Pag-IBIG mandatory contributions are tax-exempt).
        $statutoryEEPeriod = $sssEE + $phicEE + $hdmfEE;
        $taxableIncome = max(0.0, $taxableIncomePreStatutory - $statutoryEEPeriod);
        $tax = $this->bir->compute(
            $taxableIncome,
            $employee->pay_frequency ?? 'semi_monthly',
            $effectiveYear,
        );
        if ($tax['tax'] > 0) {
            $deductions[] = [
                'category' => 'deduction_statutory',
                'code' => 'BIR_TAX',
                'label' => 'Withholding Tax',
                'quantity' => 1.0,
                'rate' => $tax['tax'],
                'amount' => $tax['tax'],
                'is_taxable' => false,
                'sort_order' => 53,
                'meta' => [
                    'annualised' => $tax['annualised_taxable'],
                    'annual_tax' => $tax['annual_tax'],
                    'bracket_min' => $tax['bracket_min'],
                    'rate' => $tax['marginal_rate'],
                ],
            ];
        }

        // Other deductions (loans are added by the calling service after this
        // pure pass — see PayrollRunService).
        $sortBase = 60;
        foreach ($inputs->otherDeductions as $i => $deduction) {
            $deductions[] = [
                'category' => 'deduction_other',
                'code' => $deduction['code'],
                'label' => $deduction['label'],
                'quantity' => 1.0,
                'rate' => $deduction['amount'],
                'amount' => Money::round($deduction['amount']),
                'is_taxable' => false,
                'sort_order' => $deduction['sort_order'] ?? $sortBase + $i,
            ];
        }

        $totalDeductions = array_sum(array_column($deductions, 'amount'));
        $netPay = Money::round($grossEarnings - $totalDeductions);

        return [
            'summary' => [
                'basic_salary' => Money::toFloat($employee->basic_salary),
                'daily_rate' => $daily,
                'hourly_rate' => $hourly,
                'pay_frequency' => $employee->pay_frequency ?? 'semi_monthly',
                'regular_hours' => $inputs->regularHours,
                'overtime_hours' => $inputs->overtimeHours,
                'night_diff_hours' => $inputs->nightDiffHours,
                'regular_holiday_hours' => $inputs->regularHolidayHours,
                'special_holiday_hours' => $inputs->specialHolidayHours,
                'rest_day_hours' => $inputs->restDayHours,
                'absent_days' => $inputs->absentDays,
                'late_minutes' => $inputs->lateMinutes,
                'undertime_minutes' => $inputs->undertimeMinutes,
                'gross_earnings' => Money::round($grossEarnings),
                'total_deductions' => Money::round($totalDeductions),
                'taxable_income' => Money::round($taxableIncome),
                'net_pay' => $netPay,
                'sss_employee' => $sssEE,
                'sss_employer' => Money::round($sss['employer'] / $statutoryDivisor),
                'sss_ec_employer' => Money::round($sss['ec'] / $statutoryDivisor),
                'philhealth_employee' => $phicEE,
                'philhealth_employer' => Money::round($philhealth['employer'] / $statutoryDivisor),
                'pagibig_employee' => $hdmfEE,
                'pagibig_employer' => Money::round($pagibig['employer'] / $statutoryDivisor),
                'withholding_tax' => $tax['tax'],
            ],
            'items' => array_merge($earnings, $deductions),
            'snapshot' => [
                'effective_year' => $effectiveYear,
                'sss_table_year' => $effectiveYear,
                'philhealth_year' => $effectiveYear,
                'pagibig_year' => $effectiveYear,
                'bir_year' => $effectiveYear,
                'rates' => $rates,
                'monthly_working_days' => $monthlyWorkingDays ?? RateCalculator::DEFAULT_WORKING_DAYS_PER_MONTH,
                'statutory_divisor' => $statutoryDivisor,
            ],
        ];
    }

    /**
     * Basic pay portion for the period being processed.
     */
    private function basicForPeriod(Employee $employee, float $monthlyEquivalent): float
    {
        return match ($employee->pay_frequency) {
            'monthly' => $monthlyEquivalent,
            'semi_monthly' => $monthlyEquivalent / 2,
            'weekly' => $monthlyEquivalent * (12 / 52),
            'bi_weekly' => $monthlyEquivalent * (12 / 26),
            'daily' => $monthlyEquivalent / RateCalculator::DEFAULT_WORKING_DAYS_PER_MONTH,
            default => $monthlyEquivalent / 2,
        };
    }
}
