<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\BirTaxBracket;
use Illuminate\Database\Seeder;

/**
 * BIR Withholding Tax — TRAIN Law graduated schedule, effective Jan 1, 2023 onwards.
 * Reference: RA 10963 (TRAIN), updated rates per Section 24(A)(2)(a).
 *
 * Brackets are quoted on **annualised taxable compensation**. The payroll engine
 * projects the period taxable income to an annual figure, looks up the bracket,
 * computes annual tax, and divides back to the period.
 */
class BirTaxBracketSeeder extends Seeder
{
    /** @var list<array{annual_min: float, annual_max: float|null, base: float, rate: float}> */
    private const ROWS_2023_PLUS = [
        ['annual_min' =>        0, 'annual_max' =>   250000, 'base' =>        0, 'rate' => 0.00],
        ['annual_min' =>   250000, 'annual_max' =>   400000, 'base' =>        0, 'rate' => 0.15],
        ['annual_min' =>   400000, 'annual_max' =>   800000, 'base' =>    22500, 'rate' => 0.20],
        ['annual_min' =>   800000, 'annual_max' =>  2000000, 'base' =>   102500, 'rate' => 0.25],
        ['annual_min' =>  2000000, 'annual_max' =>  8000000, 'base' =>   402500, 'rate' => 0.30],
        ['annual_min' =>  8000000, 'annual_max' =>     null, 'base' =>  2202500, 'rate' => 0.35],
    ];

    public function run(): void
    {
        BirTaxBracket::where('effective_year', 2023)->delete();

        foreach (self::ROWS_2023_PLUS as $row) {
            BirTaxBracket::create([
                'effective_year' => 2023,
                'annual_min' => $row['annual_min'],
                'annual_max' => $row['annual_max'],
                'base_tax' => $row['base'],
                'marginal_rate' => $row['rate'],
            ]);
        }
    }
}
