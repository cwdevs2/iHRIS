<?php

declare(strict_types=1);

namespace App\Services\Payroll\Statutory;

use App\Models\PhilhealthBracket;
use App\Services\Payroll\Money;
use RuntimeException;

/**
 * PhilHealth premium computation.
 *
 *   total_premium = clamp(monthly_basic, floor, ceiling) × rate
 *   employee_share = total_premium × employee_share_pct
 *   employer_share = total_premium − employee_share
 */
class PhilhealthCalculator
{
    /**
     * @return array{employee: float, employer: float, total: float, base: float}
     */
    public function compute(float $monthlyBasic, int $effectiveYear): array
    {
        if ($monthlyBasic <= 0) {
            return ['employee' => 0.0, 'employer' => 0.0, 'total' => 0.0, 'base' => 0.0];
        }

        $config = PhilhealthBracket::query()
            ->where('effective_year', '<=', $effectiveYear)
            ->orderByDesc('effective_year')
            ->first();

        if (! $config) {
            throw new RuntimeException("No PhilHealth schedule available on or before year {$effectiveYear}.");
        }

        $base = max(
            Money::toFloat($config->salary_floor),
            min($monthlyBasic, Money::toFloat($config->salary_ceiling)),
        );

        $rate = Money::toFloat($config->rate);
        $eePct = Money::toFloat($config->employee_share_pct);

        $total = Money::round($base * $rate);
        $employee = Money::round($total * $eePct);
        $employer = Money::round($total - $employee);

        return [
            'employee' => $employee,
            'employer' => $employer,
            'total' => $total,
            'base' => $base,
        ];
    }
}
