<?php

declare(strict_types=1);

namespace Tests\Feature\Payroll;

use App\Models\Employee;
use App\Models\PayrollPeriod;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipItem;
use App\Models\User;
use App\Services\Payroll\ThirteenthMonthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThirteenthMonthServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_thirteenth_month_is_one_twelfth_of_basic_total(): void
    {
        [$employee, ] = $this->seedEmployeeWithPayslips(year: 2024, monthlyBasic: 30000, months: 12);

        $service = new ThirteenthMonthService();
        $result = $service->computeForEmployee($employee, 2024);

        // 30k × 12 / 12 = 30,000
        $this->assertSame(360000.0, $result['basic_total']);
        $this->assertSame(30000.0, $result['thirteenth_month']);
        // 30k < 90k exemption → no taxable excess
        $this->assertSame(0.0, $result['taxable_excess']);
    }

    public function test_thirteenth_month_taxable_excess_above_90k(): void
    {
        [$employee, ] = $this->seedEmployeeWithPayslips(year: 2024, monthlyBasic: 100000, months: 12);

        $result = (new ThirteenthMonthService())->computeForEmployee($employee, 2024);
        // 100k × 12 / 12 = 100,000 → 10,000 above the exemption
        $this->assertSame(100000.0, $result['thirteenth_month']);
        $this->assertSame(10000.0, $result['taxable_excess']);
    }

    public function test_partial_year_employee_gets_prorated_amount(): void
    {
        [$employee, ] = $this->seedEmployeeWithPayslips(year: 2024, monthlyBasic: 30000, months: 6);

        $result = (new ThirteenthMonthService())->computeForEmployee($employee, 2024);
        // 30k × 6 / 12 = 15,000
        $this->assertSame(15000.0, $result['thirteenth_month']);
    }

    /**
     * Helper: seed one employee + N finalized monthly payslips with a BASIC line item.
     *
     * @return array{0: Employee, 1: array<int, Payslip>}
     */
    private function seedEmployeeWithPayslips(int $year, float $monthlyBasic, int $months): array
    {
        $user = User::create([
            'first_name' => 'Iris',
            'last_name' => 'Santos',
            'email' => 'iris+'.uniqid().'@iHRIS.local',
            'password' => bcrypt('S3cret!'),
            'status' => 'active',
        ]);
        $employee = Employee::create([
            'user_id' => $user->id,
            'employee_number' => 'EMP-'.substr((string) microtime(true), -6),
            'employment_status' => 'regular',
            'basic_salary' => $monthlyBasic,
            'pay_frequency' => 'monthly',
        ]);

        $payslips = [];
        for ($m = 1; $m <= $months; $m++) {
            $period = PayrollPeriod::create([
                'name' => sprintf('%04d-%02d', $year, $m),
                'frequency' => 'monthly',
                'period_start' => sprintf('%04d-%02d-01', $year, $m),
                'period_end' => sprintf('%04d-%02d-%02d', $year, $m, (int) date('t', strtotime("$year-$m-01"))),
                'status' => 'closed',
            ]);
            $run = PayrollRun::create([
                'payroll_period_id' => $period->id,
                'reference_number' => 'PR-TEST-'.uniqid(),
                'scope' => 'company',
                'status' => 'finalized',
                'headcount' => 1,
                'finalized_at' => now(),
            ]);
            $payslip = Payslip::create([
                'payroll_run_id' => $run->id,
                'employee_id' => $employee->id,
                'basic_salary' => $monthlyBasic,
                'pay_frequency' => 'monthly',
                'gross_earnings' => $monthlyBasic,
                'net_pay' => $monthlyBasic,
                'status' => 'finalized',
                'generated_at' => now(),
            ]);
            PayslipItem::create([
                'payslip_id' => $payslip->id,
                'category' => 'earning_basic',
                'code' => 'BASIC',
                'label' => 'Basic Pay',
                'quantity' => 1,
                'rate' => $monthlyBasic,
                'amount' => $monthlyBasic,
                'is_taxable' => true,
                'sort_order' => 10,
            ]);
            $payslips[] = $payslip;
        }

        return [$employee, $payslips];
    }
}
