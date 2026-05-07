<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\PagibigSetting;
use Illuminate\Database\Seeder;

/**
 * Pag-IBIG (HDMF) contribution settings, 2024.
 * Pre-Feb 2024 rules:
 *   - Monthly compensation ≤ ₱1,500 → employee 1%
 *   - Monthly compensation > ₱1,500 → employee 2%
 *   - Employer always 2%
 *   - Employee share capped at ₱100/month (because the cap base is ₱5,000 MSC).
 *
 * Note: HDMF Circular No. 460 raises the contribution cap effective Feb 2024,
 * but most employers still operate on the legacy cap during the transition.
 * The settings table lets HR Admin update these without a code deploy.
 */
class PagibigSettingSeeder extends Seeder
{
    public function run(): void
    {
        PagibigSetting::updateOrCreate(
            ['effective_year' => 2024],
            [
                'low_salary_threshold' => 1500,
                'low_rate' => 0.0100,
                'high_rate' => 0.0200,
                'max_employee_share' => 100,
                'employer_rate' => 0.0200,
            ],
        );
    }
}
