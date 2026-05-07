<?php

declare(strict_types=1);

namespace App\Services\Payroll;

/**
 * Input bundle for one payroll computation. Built up by the controller / service
 * and handed to PayrollEngineService::computeForEmployee().
 *
 * Hour fields are *period totals* (typically pulled from attendance/timekeeping).
 * Allowances and other earnings are arrays of {code, label, amount, taxable?, sort_order?}.
 */
final class PayrollInputs
{
    /**
     * @param  list<array{code: string, label: string, amount: float, is_taxable?: bool, sort_order?: int}>  $allowances
     * @param  list<array{code: string, label: string, amount: float, is_taxable?: bool, sort_order?: int}>  $bonuses
     * @param  list<array{code: string, label: string, amount: float, sort_order?: int}>  $otherDeductions
     */
    public function __construct(
        public readonly float $regularHours = 0.0,
        public readonly float $overtimeHours = 0.0,        // weekday OT
        public readonly float $restDayHours = 0.0,         // hours worked on a rest day
        public readonly float $regularHolidayHours = 0.0,  // hours worked on a regular holiday
        public readonly float $specialHolidayHours = 0.0,  // hours worked on a special non-working
        public readonly float $nightDiffHours = 0.0,       // 10pm–6am hours (subset of total worked)
        public readonly float $absentDays = 0.0,
        public readonly float $lateMinutes = 0.0,
        public readonly float $undertimeMinutes = 0.0,
        public readonly array $allowances = [],
        public readonly array $bonuses = [],
        public readonly array $otherDeductions = [],
        /** Employee earned regular-holiday pay even if not worked (fixed-pay employees). */
        public readonly bool $includeRegularHolidayBasePay = true,
    ) {}

    public static function empty(): self
    {
        return new self();
    }
}
