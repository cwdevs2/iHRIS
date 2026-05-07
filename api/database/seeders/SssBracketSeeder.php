<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\SssBracket;
use Illuminate\Database\Seeder;

/**
 * SSS contribution table effective January 2024 (14% combined rate, ₱20,000 MSC ceiling).
 *
 * Source: SSS Circular No. 2023-013 — Schedule of Regular Social Security and
 * Employees' Compensation (EC) Contributions for Employed Members.
 *
 * Each row maps a Monthly Salary Credit (MSC) range to:
 *   - employee_share (4.5% of MSC, rounded to nearest peso per the SSS schedule)
 *   - employer_share (9.5% of MSC)
 *   - ec_share       (₱10 if MSC < 15,000; ₱30 otherwise — employer-only)
 *   - total_contribution (sum of EE + ER + EC)
 *
 * Rows below are pre-computed from the published table (not from the percentages
 * directly) because SSS publishes specific rounded values that must be matched
 * exactly for compliance reporting.
 */
class SssBracketSeeder extends Seeder
{
    /** @var list<array{msc_min: float, msc_max: float, ee: float, er: float, ec: float, total: float}> */
    private const ROWS_2024 = [
        ['msc_min' =>     0, 'msc_max' =>  4249.99, 'ee' =>   180.00, 'er' =>   390.00, 'ec' => 10, 'total' =>   580.00],
        ['msc_min' =>  4250, 'msc_max' =>  4749.99, 'ee' =>   202.50, 'er' =>   427.50, 'ec' => 10, 'total' =>   640.00],
        ['msc_min' =>  4750, 'msc_max' =>  5249.99, 'ee' =>   225.00, 'er' =>   475.00, 'ec' => 10, 'total' =>   710.00],
        ['msc_min' =>  5250, 'msc_max' =>  5749.99, 'ee' =>   247.50, 'er' =>   522.50, 'ec' => 10, 'total' =>   780.00],
        ['msc_min' =>  5750, 'msc_max' =>  6249.99, 'ee' =>   270.00, 'er' =>   570.00, 'ec' => 10, 'total' =>   850.00],
        ['msc_min' =>  6250, 'msc_max' =>  6749.99, 'ee' =>   292.50, 'er' =>   617.50, 'ec' => 10, 'total' =>   920.00],
        ['msc_min' =>  6750, 'msc_max' =>  7249.99, 'ee' =>   315.00, 'er' =>   665.00, 'ec' => 10, 'total' =>   990.00],
        ['msc_min' =>  7250, 'msc_max' =>  7749.99, 'ee' =>   337.50, 'er' =>   712.50, 'ec' => 10, 'total' =>  1060.00],
        ['msc_min' =>  7750, 'msc_max' =>  8249.99, 'ee' =>   360.00, 'er' =>   760.00, 'ec' => 10, 'total' =>  1130.00],
        ['msc_min' =>  8250, 'msc_max' =>  8749.99, 'ee' =>   382.50, 'er' =>   807.50, 'ec' => 10, 'total' =>  1200.00],
        ['msc_min' =>  8750, 'msc_max' =>  9249.99, 'ee' =>   405.00, 'er' =>   855.00, 'ec' => 10, 'total' =>  1270.00],
        ['msc_min' =>  9250, 'msc_max' =>  9749.99, 'ee' =>   427.50, 'er' =>   902.50, 'ec' => 10, 'total' =>  1340.00],
        ['msc_min' =>  9750, 'msc_max' => 10249.99, 'ee' =>   450.00, 'er' =>   950.00, 'ec' => 10, 'total' =>  1410.00],
        ['msc_min' => 10250, 'msc_max' => 10749.99, 'ee' =>   472.50, 'er' =>   997.50, 'ec' => 10, 'total' =>  1480.00],
        ['msc_min' => 10750, 'msc_max' => 11249.99, 'ee' =>   495.00, 'er' =>  1045.00, 'ec' => 10, 'total' =>  1550.00],
        ['msc_min' => 11250, 'msc_max' => 11749.99, 'ee' =>   517.50, 'er' =>  1092.50, 'ec' => 10, 'total' =>  1620.00],
        ['msc_min' => 11750, 'msc_max' => 12249.99, 'ee' =>   540.00, 'er' =>  1140.00, 'ec' => 10, 'total' =>  1690.00],
        ['msc_min' => 12250, 'msc_max' => 12749.99, 'ee' =>   562.50, 'er' =>  1187.50, 'ec' => 10, 'total' =>  1760.00],
        ['msc_min' => 12750, 'msc_max' => 13249.99, 'ee' =>   585.00, 'er' =>  1235.00, 'ec' => 10, 'total' =>  1830.00],
        ['msc_min' => 13250, 'msc_max' => 13749.99, 'ee' =>   607.50, 'er' =>  1282.50, 'ec' => 10, 'total' =>  1900.00],
        ['msc_min' => 13750, 'msc_max' => 14249.99, 'ee' =>   630.00, 'er' =>  1330.00, 'ec' => 10, 'total' =>  1970.00],
        ['msc_min' => 14250, 'msc_max' => 14749.99, 'ee' =>   652.50, 'er' =>  1377.50, 'ec' => 10, 'total' =>  2040.00],
        ['msc_min' => 14750, 'msc_max' => 15249.99, 'ee' =>   675.00, 'er' =>  1425.00, 'ec' => 30, 'total' =>  2130.00],
        ['msc_min' => 15250, 'msc_max' => 15749.99, 'ee' =>   697.50, 'er' =>  1472.50, 'ec' => 30, 'total' =>  2200.00],
        ['msc_min' => 15750, 'msc_max' => 16249.99, 'ee' =>   720.00, 'er' =>  1520.00, 'ec' => 30, 'total' =>  2270.00],
        ['msc_min' => 16250, 'msc_max' => 16749.99, 'ee' =>   742.50, 'er' =>  1567.50, 'ec' => 30, 'total' =>  2340.00],
        ['msc_min' => 16750, 'msc_max' => 17249.99, 'ee' =>   765.00, 'er' =>  1615.00, 'ec' => 30, 'total' =>  2410.00],
        ['msc_min' => 17250, 'msc_max' => 17749.99, 'ee' =>   787.50, 'er' =>  1662.50, 'ec' => 30, 'total' =>  2480.00],
        ['msc_min' => 17750, 'msc_max' => 18249.99, 'ee' =>   810.00, 'er' =>  1710.00, 'ec' => 30, 'total' =>  2550.00],
        ['msc_min' => 18250, 'msc_max' => 18749.99, 'ee' =>   832.50, 'er' =>  1757.50, 'ec' => 30, 'total' =>  2620.00],
        ['msc_min' => 18750, 'msc_max' => 19249.99, 'ee' =>   855.00, 'er' =>  1805.00, 'ec' => 30, 'total' =>  2690.00],
        ['msc_min' => 19250, 'msc_max' => 19749.99, 'ee' =>   877.50, 'er' =>  1852.50, 'ec' => 30, 'total' =>  2760.00],
        // Top open bracket — anything ≥ 19,750 caps at MSC of 20,000
        ['msc_min' => 19750, 'msc_max' => 9999999, 'ee' =>   900.00, 'er' =>  1900.00, 'ec' => 30, 'total' =>  2830.00],
    ];

    public function run(): void
    {
        // Idempotent — wipe-and-reseed per year so updated rates are applied cleanly.
        SssBracket::where('effective_year', 2024)->delete();

        foreach (self::ROWS_2024 as $row) {
            SssBracket::create([
                'effective_year' => 2024,
                'msc_min' => $row['msc_min'],
                'msc_max' => $row['msc_max'],
                'employee_share' => $row['ee'],
                'employer_share' => $row['er'],
                'ec_share' => $row['ec'],
                'total_contribution' => $row['total'],
            ]);
        }
    }
}
