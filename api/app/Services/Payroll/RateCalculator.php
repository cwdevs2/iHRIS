<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\Employee;

/**
 * Hourly / daily rate derivation from an employee's basic salary + pay frequency.
 *
 * PH Labor Code conventions used:
 *   - Equivalent monthly rate (EMR) → daily rate via ÷ working_days/month (default 26)
 *   - Daily rate → hourly rate via ÷ 8
 *
 * The /26 divisor matches the Department of Labor "monthly-paid employee" formula
 * (313 working days a year ÷ 12 ≈ 26.08, rounded to 26 by most PH payroll
 * systems). Companies that use 22 working days a month can override via the
 * `monthly_working_days` argument when needed.
 */
final class RateCalculator
{
    public const DEFAULT_HOURS_PER_DAY = 8.0;
    public const DEFAULT_WORKING_DAYS_PER_MONTH = 26.0;

    /**
     * @return array{monthly: float, daily: float, hourly: float}
     */
    public static function fromEmployee(
        Employee $employee,
        ?float $monthlyWorkingDays = null,
        ?float $hoursPerDay = null,
    ): array {
        $basic = Money::toFloat($employee->basic_salary);
        $frequency = $employee->pay_frequency ?? 'semi_monthly';
        $workingDays = $monthlyWorkingDays ?? self::DEFAULT_WORKING_DAYS_PER_MONTH;
        $hours = $hoursPerDay ?? self::DEFAULT_HOURS_PER_DAY;

        // Project to a monthly equivalent for consistent statutory lookups.
        $monthly = match ($frequency) {
            'monthly' => $basic,
            'semi_monthly' => $basic * 2,
            'weekly' => $basic * (52 / 12),
            'bi_weekly' => $basic * (26 / 12),
            'daily' => $basic * $workingDays,
            default => $basic,
        };

        $daily = match ($frequency) {
            'daily' => $basic,
            default => $monthly > 0 && $workingDays > 0 ? $monthly / $workingDays : 0.0,
        };

        $hourly = $daily > 0 && $hours > 0 ? $daily / $hours : 0.0;

        return [
            'monthly' => Money::round($monthly),
            'daily' => Money::round($daily),
            'hourly' => Money::round($hourly),
        ];
    }
}
