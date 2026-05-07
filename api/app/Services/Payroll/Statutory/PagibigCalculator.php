<?php

declare(strict_types=1);

namespace App\Services\Payroll\Statutory;

use App\Models\PagibigSetting;
use App\Services\Payroll\Money;
use RuntimeException;

/**
 * Pag-IBIG (HDMF) contribution computation.
 *
 *   employee_rate  = (compensation ≤ low_salary_threshold) ? low_rate : high_rate
 *   employee_share = min(compensation × employee_rate, max_employee_share)
 *   employer_share = compensation × employer_rate (subject to same cap)
 */
class PagibigCalculator
{
    /**
     * @return array{employee: float, employer: float, total: float}
     */
    public function compute(float $monthlyCompensation, int $effectiveYear): array
    {
        if ($monthlyCompensation <= 0) {
            return ['employee' => 0.0, 'employer' => 0.0, 'total' => 0.0];
        }

        $config = PagibigSetting::query()
            ->where('effective_year', '<=', $effectiveYear)
            ->orderByDesc('effective_year')
            ->first();

        if (! $config) {
            throw new RuntimeException("No Pag-IBIG settings available on or before year {$effectiveYear}.");
        }

        $threshold = Money::toFloat($config->low_salary_threshold);
        $eeRate = $monthlyCompensation <= $threshold
            ? Money::toFloat($config->low_rate)
            : Money::toFloat($config->high_rate);
        $erRate = Money::toFloat($config->employer_rate);
        $cap = Money::toFloat($config->max_employee_share);

        $employee = Money::round(min($monthlyCompensation * $eeRate, $cap));
        $employer = Money::round(min($monthlyCompensation * $erRate, $cap));

        return [
            'employee' => $employee,
            'employer' => $employer,
            'total' => Money::round($employee + $employer),
        ];
    }
}
