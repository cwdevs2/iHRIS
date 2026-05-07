<?php

declare(strict_types=1);

namespace App\Services\Payroll\Statutory;

use App\Models\BirTaxBracket;
use App\Services\Payroll\Money;
use RuntimeException;

/**
 * BIR withholding tax — TRAIN Law graduated computation.
 *
 *   1. Annualise the period taxable income: annual = period_taxable × pay_periods_per_year
 *   2. Find the bracket where annual_min ≤ annual < annual_max (top-open if max is null)
 *   3. annual_tax = base_tax + (annual − annual_min) × marginal_rate
 *   4. period_tax = annual_tax / pay_periods_per_year
 *
 * Pay-period factors:
 *   monthly       → 12
 *   semi_monthly  → 24
 *   weekly        → 52
 *   bi_weekly     → 26
 *   daily         → 261 (PH average working days/year)
 */
class BirTaxCalculator
{
    private const PERIODS_PER_YEAR = [
        'monthly' => 12,
        'semi_monthly' => 24,
        'weekly' => 52,
        'bi_weekly' => 26,
        'daily' => 261,
    ];

    /**
     * @param  string  $payFrequency  one of: monthly, semi_monthly, weekly, bi_weekly, daily
     * @return array{tax: float, annualised_taxable: float, annual_tax: float, bracket_min: float, marginal_rate: float}
     */
    public function compute(float $periodTaxableIncome, string $payFrequency, int $effectiveYear): array
    {
        if ($periodTaxableIncome <= 0) {
            return [
                'tax' => 0.0, 'annualised_taxable' => 0.0, 'annual_tax' => 0.0,
                'bracket_min' => 0.0, 'marginal_rate' => 0.0,
            ];
        }

        $factor = self::PERIODS_PER_YEAR[$payFrequency] ?? null;
        if ($factor === null) {
            throw new RuntimeException("Unknown pay frequency for BIR projection: {$payFrequency}");
        }

        $annualised = $periodTaxableIncome * $factor;

        // Use the most recent published year ≤ requested year (the TRAIN schedule
        // remained in force from 2023 onwards, so newer years inherit it until
        // a fresh schedule is seeded by HR Admin).
        $effectiveYearForLookup = (int) (BirTaxBracket::query()
            ->where('effective_year', '<=', $effectiveYear)
            ->max('effective_year') ?? $effectiveYear);

        $bracket = BirTaxBracket::query()
            ->where('effective_year', $effectiveYearForLookup)
            ->where('annual_min', '<=', $annualised)
            ->where(function ($q) use ($annualised) {
                $q->whereNull('annual_max')->orWhere('annual_max', '>', $annualised);
            })
            ->first();

        if (! $bracket) {
            throw new RuntimeException("No BIR tax bracket matched for annualised income {$annualised}.");
        }

        $rate = Money::toFloat($bracket->marginal_rate);
        $base = Money::toFloat($bracket->base_tax);
        $min = Money::toFloat($bracket->annual_min);

        $annualTax = $base + (($annualised - $min) * $rate);
        $periodTax = Money::round($annualTax / $factor);

        return [
            'tax' => max(0.0, $periodTax),
            'annualised_taxable' => Money::round($annualised),
            'annual_tax' => Money::round($annualTax),
            'bracket_min' => $min,
            'marginal_rate' => $rate,
        ];
    }
}
