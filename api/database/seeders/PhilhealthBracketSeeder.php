<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\PhilhealthBracket;
use Illuminate\Database\Seeder;

/**
 * PhilHealth premium schedule, 2024.
 * Per UHC Act + PhilHealth Circular: 5% premium rate, salary floor ₱10,000,
 * salary ceiling ₱100,000. Premium is split 50/50 between employee and employer,
 * so the employee share is 2.5% of the (capped) basic monthly salary.
 */
class PhilhealthBracketSeeder extends Seeder
{
    public function run(): void
    {
        PhilhealthBracket::updateOrCreate(
            ['effective_year' => 2024],
            [
                'rate' => 0.0500,
                'salary_floor' => 10000,
                'salary_ceiling' => 100000,
                'employee_share_pct' => 0.5000,
            ],
        );
    }
}
