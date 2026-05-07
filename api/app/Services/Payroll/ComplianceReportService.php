<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\Employee;
use App\Models\Payslip;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Government compliance reports — SSS, PhilHealth, Pag-IBIG, and the BIR Alpha List.
 * Each method returns a structured array (rows + totals + meta) that the
 * controller can serve as JSON or hand to a CSV/XLSX writer.
 */
class ComplianceReportService
{
    /**
     * SSS R-3 (Contribution Collection List) — one row per employee for the period,
     * showing EE / ER / EC contributions.
     *
     * @return array{rows: list<array<string, mixed>>, totals: array<string, float>, meta: array<string, mixed>}
     */
    public function sssReport(string $dateFrom, string $dateTo): array
    {
        $payslips = $this->finalizedPayslipsBetween($dateFrom, $dateTo);

        $rows = [];
        $totalEE = 0.0;
        $totalER = 0.0;
        $totalEC = 0.0;

        $byEmployee = $payslips->groupBy('employee_id');
        foreach ($byEmployee as $employeeId => $slips) {
            $employee = $slips->first()->employee;
            $ee = $slips->sum(fn ($p) => (float) $p->sss_employee);
            $er = $slips->sum(fn ($p) => (float) $p->sss_employer);
            $ec = $slips->sum(fn ($p) => (float) $p->sss_ec_employer);

            $rows[] = [
                'sss_number' => $employee?->sss_number,
                'employee_number' => $employee?->employee_number,
                'name' => $employee?->user?->full_name,
                'employee_share' => Money::round($ee),
                'employer_share' => Money::round($er),
                'ec_share' => Money::round($ec),
                'total' => Money::round($ee + $er + $ec),
            ];

            $totalEE += $ee;
            $totalER += $er;
            $totalEC += $ec;
        }

        return [
            'rows' => $rows,
            'totals' => [
                'employee_share' => Money::round($totalEE),
                'employer_share' => Money::round($totalER),
                'ec_share' => Money::round($totalEC),
                'grand_total' => Money::round($totalEE + $totalER + $totalEC),
            ],
            'meta' => [
                'report' => 'sss_r3',
                'period_from' => $dateFrom,
                'period_to' => $dateTo,
                'employee_count' => count($rows),
            ],
        ];
    }

    /**
     * PhilHealth RF-1 (Employer's Remittance Report).
     */
    public function philhealthReport(string $dateFrom, string $dateTo): array
    {
        $payslips = $this->finalizedPayslipsBetween($dateFrom, $dateTo);

        $rows = [];
        $totalEE = 0.0;
        $totalER = 0.0;

        foreach ($payslips->groupBy('employee_id') as $slips) {
            $employee = $slips->first()->employee;
            $ee = $slips->sum(fn ($p) => (float) $p->philhealth_employee);
            $er = $slips->sum(fn ($p) => (float) $p->philhealth_employer);

            $rows[] = [
                'philhealth_number' => $employee?->philhealth_number,
                'employee_number' => $employee?->employee_number,
                'name' => $employee?->user?->full_name,
                'employee_share' => Money::round($ee),
                'employer_share' => Money::round($er),
                'total' => Money::round($ee + $er),
            ];

            $totalEE += $ee;
            $totalER += $er;
        }

        return [
            'rows' => $rows,
            'totals' => [
                'employee_share' => Money::round($totalEE),
                'employer_share' => Money::round($totalER),
                'grand_total' => Money::round($totalEE + $totalER),
            ],
            'meta' => [
                'report' => 'philhealth_rf1',
                'period_from' => $dateFrom,
                'period_to' => $dateTo,
                'employee_count' => count($rows),
            ],
        ];
    }

    /**
     * Pag-IBIG MCRF (Member's Contribution Remittance Form).
     */
    public function pagibigReport(string $dateFrom, string $dateTo): array
    {
        $payslips = $this->finalizedPayslipsBetween($dateFrom, $dateTo);

        $rows = [];
        $totalEE = 0.0;
        $totalER = 0.0;

        foreach ($payslips->groupBy('employee_id') as $slips) {
            $employee = $slips->first()->employee;
            $ee = $slips->sum(fn ($p) => (float) $p->pagibig_employee);
            $er = $slips->sum(fn ($p) => (float) $p->pagibig_employer);

            $rows[] = [
                'pagibig_number' => $employee?->pagibig_number,
                'employee_number' => $employee?->employee_number,
                'name' => $employee?->user?->full_name,
                'employee_share' => Money::round($ee),
                'employer_share' => Money::round($er),
                'total' => Money::round($ee + $er),
            ];

            $totalEE += $ee;
            $totalER += $er;
        }

        return [
            'rows' => $rows,
            'totals' => [
                'employee_share' => Money::round($totalEE),
                'employer_share' => Money::round($totalER),
                'grand_total' => Money::round($totalEE + $totalER),
            ],
            'meta' => [
                'report' => 'pagibig_mcrf',
                'period_from' => $dateFrom,
                'period_to' => $dateTo,
                'employee_count' => count($rows),
            ],
        ];
    }

    /**
     * BIR Alpha List of Employees — annualised view of compensation, exemptions,
     * and tax withheld for the whole year.
     */
    public function birAlphaList(int $year): array
    {
        $start = Carbon::create($year, 1, 1)->startOfYear()->toDateString();
        $end = Carbon::create($year, 12, 31)->endOfYear()->toDateString();
        $payslips = $this->finalizedPayslipsBetween($start, $end);

        $rows = [];
        $grossTotal = 0.0;
        $taxableTotal = 0.0;
        $taxTotal = 0.0;

        foreach ($payslips->groupBy('employee_id') as $slips) {
            $employee = $slips->first()->employee;
            $gross = $slips->sum(fn ($p) => (float) $p->gross_earnings);
            $taxable = $slips->sum(fn ($p) => (float) $p->taxable_income);
            $tax = $slips->sum(fn ($p) => (float) $p->withholding_tax);
            $statutory = $slips->sum(fn ($p) => (float) $p->sss_employee + (float) $p->philhealth_employee + (float) $p->pagibig_employee);

            $rows[] = [
                'tin' => $employee?->tin,
                'employee_number' => $employee?->employee_number,
                'name' => $employee?->user?->full_name,
                'gross_compensation' => Money::round($gross),
                'mandatory_contributions' => Money::round($statutory),
                'taxable_compensation' => Money::round($taxable),
                'tax_withheld' => Money::round($tax),
            ];

            $grossTotal += $gross;
            $taxableTotal += $taxable;
            $taxTotal += $tax;
        }

        return [
            'rows' => $rows,
            'totals' => [
                'gross_compensation' => Money::round($grossTotal),
                'taxable_compensation' => Money::round($taxableTotal),
                'tax_withheld' => Money::round($taxTotal),
            ],
            'meta' => [
                'report' => 'bir_alpha_list',
                'year' => $year,
                'employee_count' => count($rows),
            ],
        ];
    }

    private function finalizedPayslipsBetween(string $dateFrom, string $dateTo)
    {
        return Payslip::query()
            ->with(['employee.user'])
            ->whereIn('status', ['finalized', 'paid'])
            ->whereHas('run.period', function (Builder $q) use ($dateFrom, $dateTo) {
                $q->where('period_start', '>=', $dateFrom)
                  ->where('period_end', '<=', $dateTo);
            })
            ->get();
    }
}
