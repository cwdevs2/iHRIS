<?php

declare(strict_types=1);

namespace Tests\Feature\Payroll;

use App\Models\Employee;
use App\Models\User;
use App\Services\Payroll\PayrollEngineService;
use App\Services\Payroll\PayrollInputs;
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

class PayrollEngineServiceTest extends TestCase
{
    use RefreshDatabase;

    private PayrollEngineService $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            SssBracketSeeder::class,
            PhilhealthBracketSeeder::class,
            PagibigSettingSeeder::class,
            BirTaxBracketSeeder::class,
        ]);

        $this->engine = new PayrollEngineService(
            new SssCalculator(),
            new PhilhealthCalculator(),
            new PagibigCalculator(),
            new BirTaxCalculator(),
        );
    }

    private function makeEmployee(float $salary, string $frequency = 'semi_monthly'): Employee
    {
        $user = User::create([
            'first_name' => 'Test',
            'last_name' => 'Employee',
            'email' => 'test+'.uniqid().'@iHRIS.local',
            'password' => bcrypt('Secret!1234'),
            'status' => 'active',
        ]);

        return Employee::create([
            'user_id' => $user->id,
            'employee_number' => 'EMP-'.substr((string) microtime(true), -6),
            'employment_status' => 'regular',
            'basic_salary' => $salary,
            'pay_frequency' => $frequency,
        ]);
    }

    public function test_basic_pay_only_no_overtime_no_extras(): void
    {
        $employee = $this->makeEmployee(30000, 'semi_monthly');
        $result = $this->engine->computeForEmployee($employee, PayrollInputs::empty(), 2024);

        // Semi-monthly basic = 30,000 / 2 = 15,000 (this is the employee.basic_salary stored as period rate;
        // see PayrollEngineService::basicForPeriod() — for semi_monthly it returns monthly_equivalent / 2,
        // and monthly_equivalent for a semi_monthly employee = basic_salary × 2 = 60,000 / 2 = 30,000)
        $this->assertSame(30000.0, $result['summary']['gross_earnings']);
        $this->assertGreaterThan(0, $result['summary']['total_deductions']);
        $this->assertGreaterThan(0, $result['summary']['sss_employee']);
        $this->assertGreaterThan(0, $result['summary']['philhealth_employee']);
        $this->assertGreaterThan(0, $result['summary']['pagibig_employee']);
    }

    public function test_overtime_premium_25pct_added(): void
    {
        $employee = $this->makeEmployee(26000, 'monthly'); // ₱26k/mo → daily 1000 → hourly 125
        $inputs = new PayrollInputs(overtimeHours: 4);
        $result = $this->engine->computeForEmployee($employee, $inputs, 2024);

        $otItem = collect($result['items'])->first(fn ($i) => $i['code'] === 'OT_REG');
        $this->assertNotNull($otItem);
        $this->assertSame(125.0 * 1.25, (float) $otItem['rate']);     // hourly 125 × 1.25 = 156.25
        $this->assertEqualsWithDelta(625.0, (float) $otItem['amount'], 0.01); // 156.25 × 4
    }

    public function test_regular_holiday_pays_double_when_worked(): void
    {
        $employee = $this->makeEmployee(26000, 'monthly');
        $inputs = new PayrollInputs(regularHolidayHours: 8);
        $result = $this->engine->computeForEmployee($employee, $inputs, 2024);

        $rh = collect($result['items'])->first(fn ($i) => $i['code'] === 'HOL_REG');
        $this->assertNotNull($rh);
        $this->assertSame(125.0 * 2.0, (float) $rh['rate']);  // 200% of hourly
        $this->assertSame(2000.0, (float) $rh['amount']);     // 250 × 8
    }

    public function test_special_holiday_premium_30pct(): void
    {
        $employee = $this->makeEmployee(26000, 'monthly');
        $inputs = new PayrollInputs(specialHolidayHours: 8);
        $result = $this->engine->computeForEmployee($employee, $inputs, 2024);

        $sh = collect($result['items'])->first(fn ($i) => $i['code'] === 'HOL_SPECIAL');
        $this->assertSame(125.0 * 1.30, (float) $sh['rate']);
        $this->assertSame(1300.0, (float) $sh['amount']);
    }

    public function test_night_diff_premium_10pct(): void
    {
        $employee = $this->makeEmployee(26000, 'monthly');
        $inputs = new PayrollInputs(nightDiffHours: 5);
        $result = $this->engine->computeForEmployee($employee, $inputs, 2024);

        $nd = collect($result['items'])->first(fn ($i) => $i['code'] === 'ND');
        $this->assertSame(125.0 * 0.10, (float) $nd['rate']);
        $this->assertSame(62.5, (float) $nd['amount']);
    }

    public function test_absences_reduce_gross(): void
    {
        $employee = $this->makeEmployee(26000, 'monthly'); // daily 1000
        $baseline = $this->engine->computeForEmployee($employee, PayrollInputs::empty(), 2024);
        $withAbsence = $this->engine->computeForEmployee($employee, new PayrollInputs(absentDays: 1), 2024);

        $this->assertEqualsWithDelta(
            $baseline['summary']['gross_earnings'] - 1000.0,
            $withAbsence['summary']['gross_earnings'],
            0.01,
        );
    }

    public function test_non_taxable_allowance_excluded_from_taxable_income(): void
    {
        $employee = $this->makeEmployee(50000, 'monthly');
        $taxableAllow = $this->engine->computeForEmployee(
            $employee,
            new PayrollInputs(allowances: [
                ['code' => 'X', 'label' => 'Taxable Allowance', 'amount' => 5000, 'is_taxable' => true],
            ]),
            2024,
        );
        $nonTaxable = $this->engine->computeForEmployee(
            $employee,
            new PayrollInputs(allowances: [
                ['code' => 'X', 'label' => 'De minimis', 'amount' => 5000, 'is_taxable' => false],
            ]),
            2024,
        );

        // Both have the same gross, but the non-taxable variant has lower taxable income
        $this->assertSame(
            $taxableAllow['summary']['gross_earnings'],
            $nonTaxable['summary']['gross_earnings'],
        );
        $this->assertGreaterThan(
            $nonTaxable['summary']['taxable_income'],
            $taxableAllow['summary']['taxable_income'],
        );
    }

    public function test_net_pay_equals_gross_minus_deductions(): void
    {
        $employee = $this->makeEmployee(40000, 'monthly');
        $inputs = new PayrollInputs(
            overtimeHours: 8,
            allowances: [['code' => 'TRANS', 'label' => 'Transport', 'amount' => 1500, 'is_taxable' => false]],
            otherDeductions: [['code' => 'ADV', 'label' => 'Advance', 'amount' => 2000]],
        );
        $result = $this->engine->computeForEmployee($employee, $inputs, 2024);

        $this->assertEqualsWithDelta(
            $result['summary']['gross_earnings'] - $result['summary']['total_deductions'],
            $result['summary']['net_pay'],
            0.01,
        );
    }

    public function test_zero_salary_employee_yields_zero_payslip(): void
    {
        $employee = $this->makeEmployee(0, 'monthly');
        $result = $this->engine->computeForEmployee($employee, PayrollInputs::empty(), 2024);

        $this->assertSame(0.0, $result['summary']['gross_earnings']);
        $this->assertSame(0.0, $result['summary']['net_pay']);
        $this->assertSame(0.0, $result['summary']['sss_employee']);
        $this->assertSame(0.0, $result['summary']['withholding_tax']);
    }

    public function test_below_taxable_threshold_no_withholding(): void
    {
        // ₱20k monthly is below the ₱250k annual exemption — withholding should be 0.
        $employee = $this->makeEmployee(20000, 'monthly');
        $result = $this->engine->computeForEmployee($employee, PayrollInputs::empty(), 2024);

        $this->assertSame(0.0, $result['summary']['withholding_tax']);
    }
}
