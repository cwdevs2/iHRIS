<?php

declare(strict_types=1);

namespace App\Services\Payroll\Statutory;

use App\Models\SssBracket;
use App\Services\Payroll\Money;
use RuntimeException;

/**
 * SSS contribution lookup against the seeded brackets table.
 *
 * Inputs:
 *   - monthly_compensation (gross monthly basic salary)
 *   - effective_year       (defaults to the current year)
 *
 * Output: array of EE / ER / EC / total amounts.
 */
class SssCalculator
{
    /**
     * @return array{employee: float, employer: float, ec: float, total: float, msc_min: float, msc_max: float}
     */
    public function compute(float $monthlyCompensation, int $effectiveYear): array
    {
        if ($monthlyCompensation <= 0) {
            return [
                'employee' => 0.0, 'employer' => 0.0, 'ec' => 0.0, 'total' => 0.0,
                'msc_min' => 0.0, 'msc_max' => 0.0,
            ];
        }

        // Match the most recent published year ≤ requested year.
        $lookupYear = (int) (SssBracket::query()
            ->where('effective_year', '<=', $effectiveYear)
            ->max('effective_year') ?? $effectiveYear);

        $bracket = SssBracket::query()
            ->where('effective_year', $lookupYear)
            ->where('msc_min', '<=', $monthlyCompensation)
            ->where('msc_max', '>=', $monthlyCompensation)
            ->first();

        if (! $bracket) {
            // Fall back to the highest bracket for the year (top-open row).
            $bracket = SssBracket::query()
                ->where('effective_year', $lookupYear)
                ->orderByDesc('msc_min')
                ->first();
        }

        if (! $bracket) {
            throw new RuntimeException(
                "No SSS contribution table found for year {$effectiveYear}. "
                . 'Run database seeders or import the schedule via the statutory tables admin.',
            );
        }

        return [
            'employee' => Money::round(Money::toFloat($bracket->employee_share)),
            'employer' => Money::round(Money::toFloat($bracket->employer_share)),
            'ec' => Money::round(Money::toFloat($bracket->ec_share)),
            'total' => Money::round(Money::toFloat($bracket->total_contribution)),
            'msc_min' => Money::toFloat($bracket->msc_min),
            'msc_max' => Money::toFloat($bracket->msc_max),
        ];
    }
}
