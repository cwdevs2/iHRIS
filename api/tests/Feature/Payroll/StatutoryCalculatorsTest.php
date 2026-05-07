<?php

declare(strict_types=1);

namespace Tests\Feature\Payroll;

use App\Services\Payroll\Statutory\BirTaxCalculator;
use App\Services\Payroll\Statutory\PagibigCalculator;
use App\Services\Payroll\Statutory\PhilhealthCalculator;
use App\Services\Payroll\Statutory\SssCalculator;
use Database\Seeders\BirTaxBracketSeeder;
use Database\Seeders\PagibigSettingSeeder;
use Database\Seeders\PhilhealthBracketSeeder;
use Database\Seeders\SssBracketSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatutoryCalculatorsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            SssBracketSeeder::class,
            PhilhealthBracketSeeder::class,
            PagibigSettingSeeder::class,
            BirTaxBracketSeeder::class,
        ]);
    }

    // ─── SSS ──────────────────────────────────────────────────────────────────

    public function test_sss_returns_zero_for_zero_compensation(): void
    {
        $result = (new SssCalculator())->compute(0, 2024);
        $this->assertSame(0.0, $result['employee']);
        $this->assertSame(0.0, $result['employer']);
    }

    public function test_sss_uses_lowest_bracket_for_minimum_wage(): void
    {
        // ₱4,000 falls in the first bracket (≤4,249.99).
        $result = (new SssCalculator())->compute(4000, 2024);
        $this->assertSame(180.00, $result['employee']);
        $this->assertSame(390.00, $result['employer']);
        $this->assertSame(10.00, $result['ec']);
    }

    public function test_sss_caps_at_top_bracket_for_high_earners(): void
    {
        // ₱50,000 is way above the published ₱29,750+ ceiling — should snap to top bracket.
        $result = (new SssCalculator())->compute(50000, 2024);
        $this->assertSame(900.00, $result['employee']);   // top bracket EE share for 2024
        $this->assertSame(1900.00, $result['employer']);
        $this->assertSame(30.00, $result['ec']);
    }

    public function test_sss_picks_correct_mid_bracket(): void
    {
        // ₱15,000 falls into [14,750 – 15,249.99] → EE 675, ER 1425, EC 30
        $result = (new SssCalculator())->compute(15000, 2024);
        $this->assertSame(675.00, $result['employee']);
        $this->assertSame(1425.00, $result['employer']);
    }

    // ─── PhilHealth ───────────────────────────────────────────────────────────

    public function test_philhealth_uses_floor_for_low_earners(): void
    {
        // ₱5,000 < ₱10,000 floor → base = 10,000; total = 500; EE = 250
        $result = (new PhilhealthCalculator())->compute(5000, 2024);
        $this->assertSame(10000.0, $result['base']);
        $this->assertSame(500.00, $result['total']);
        $this->assertSame(250.00, $result['employee']);
    }

    public function test_philhealth_clamps_at_ceiling_for_high_earners(): void
    {
        // ₱200,000 > ₱100,000 ceiling → base = 100,000; total = 5,000; EE = 2,500
        $result = (new PhilhealthCalculator())->compute(200000, 2024);
        $this->assertSame(100000.0, $result['base']);
        $this->assertSame(5000.00, $result['total']);
        $this->assertSame(2500.00, $result['employee']);
    }

    public function test_philhealth_within_band_uses_actual_compensation(): void
    {
        // ₱30,000 → total = 1,500; EE = 750
        $result = (new PhilhealthCalculator())->compute(30000, 2024);
        $this->assertSame(30000.0, $result['base']);
        $this->assertSame(1500.00, $result['total']);
        $this->assertSame(750.00, $result['employee']);
    }

    // ─── Pag-IBIG ─────────────────────────────────────────────────────────────

    public function test_pagibig_uses_low_rate_for_below_threshold(): void
    {
        // ₱1,000 ≤ ₱1,500 → 1% of ₱1,000 = ₱10
        $result = (new PagibigCalculator())->compute(1000, 2024);
        $this->assertSame(10.00, $result['employee']);
        // Employer @ 2% = ₱20
        $this->assertSame(20.00, $result['employer']);
    }

    public function test_pagibig_caps_employee_share_at_one_hundred(): void
    {
        // ₱30,000 × 2% = ₱600, but capped to ₱100
        $result = (new PagibigCalculator())->compute(30000, 2024);
        $this->assertSame(100.00, $result['employee']);
        $this->assertSame(100.00, $result['employer']);  // employer also capped
    }

    // ─── BIR Tax ──────────────────────────────────────────────────────────────

    public function test_bir_zero_for_below_taxable_threshold(): void
    {
        // ₱20,000 monthly × 12 = ₱240,000 < ₱250,000 floor → no tax
        $result = (new BirTaxCalculator())->compute(20000, 'monthly', 2023);
        $this->assertSame(0.0, $result['tax']);
    }

    public function test_bir_15pct_bracket(): void
    {
        // ₱25,000 monthly × 12 = ₱300,000 → falls in [250k, 400k) bracket
        // Annual tax = 0 + (300,000 − 250,000) × 0.15 = 7,500
        // Monthly tax = 7,500 / 12 = 625.00
        $result = (new BirTaxCalculator())->compute(25000, 'monthly', 2023);
        $this->assertSame(625.00, $result['tax']);
        $this->assertSame(7500.00, $result['annual_tax']);
    }

    public function test_bir_top_bracket_for_high_income(): void
    {
        // ₱1,000,000 monthly × 12 = ₱12,000,000 → top bracket (>8M)
        // Annual tax = 2,202,500 + (12,000,000 − 8,000,000) × 0.35 = 3,602,500
        // Monthly = 300,208.33
        $result = (new BirTaxCalculator())->compute(1_000_000, 'monthly', 2023);
        $this->assertEqualsWithDelta(300_208.33, $result['tax'], 0.01);
        $this->assertSame(0.35, (float) $result['marginal_rate']);
    }

    public function test_bir_semi_monthly_uses_24_factor(): void
    {
        // Same person paid semi-monthly should owe the same annual tax.
        $monthly = (new BirTaxCalculator())->compute(50_000, 'monthly', 2023);
        $semi = (new BirTaxCalculator())->compute(25_000, 'semi_monthly', 2023);

        $this->assertEqualsWithDelta($monthly['annual_tax'], $semi['annual_tax'], 0.01);
    }
}
