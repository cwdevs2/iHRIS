<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\Employee;
use App\Models\Payslip;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * 13th-Month Pay computation per PD 851.
 *
 * Formula:
 *   13th-month = (total basic salary received Jan–Dec) ÷ 12
 *
 * "Basic salary" excludes overtime, holiday premium, night-differential, allowances,
 * cash equivalent of unused leave, and other monetary benefits — only the BASIC and
 * absences/late/UT corrections to it count. We compute this from finalized payslips,
 * summing items with code in (BASIC, ABSENT, LATE, UT) for the calendar year.
 *
 * Tax treatment: the first ₱90,000 of 13th-month + bonuses is tax-exempt (NIRC §32(B)(7)(e)).
 */
class ThirteenthMonthService
{
    /**
     * Compute the 13th-month entitlement for one employee for the given year.
     *
     * @return array{basic_total: float, thirteenth_month: float, taxable_excess: float, finalised_payslip_count: int}
     */
    public function computeForEmployee(Employee $employee, int $year): array
    {
        $payslips = Payslip::query()
            ->where('employee_id', $employee->id)
            ->whereIn('status', ['finalized', 'paid'])
            ->whereHas('run.period', function (Builder $q) use ($year) {
                $q->whereYear('period_start', '<=', $year)
                  ->whereYear('period_end', '>=', $year);
            })
            ->with('items')
            ->get();

        $basicTotal = 0.0;
        foreach ($payslips as $payslip) {
            foreach ($payslip->items as $item) {
                if (in_array($item->code, ['BASIC', 'ABSENT', 'LATE', 'UT'], true)) {
                    $basicTotal += (float) $item->amount;
                }
            }
        }

        $thirteenthMonth = Money::round($basicTotal / 12);
        $exemption = 90000.0;
        $taxableExcess = max(0.0, Money::round($thirteenthMonth - $exemption));

        return [
            'basic_total' => Money::round($basicTotal),
            'thirteenth_month' => $thirteenthMonth,
            'taxable_excess' => $taxableExcess,
            'finalised_payslip_count' => $payslips->count(),
        ];
    }

    /**
     * Compute 13th-month entitlements for all eligible employees for the year.
     *
     * @return Collection<int, array{employee: Employee, computation: array<string, float|int>}>
     */
    public function computeForCompany(int $year): Collection
    {
        return Employee::query()
            ->with('user')
            ->whereNotIn('employment_status', ['terminated'])
            ->where('basic_salary', '>', 0)
            ->orderBy('employee_number')
            ->get()
            ->map(fn (Employee $employee) => [
                'employee' => $employee,
                'computation' => $this->computeForEmployee($employee, $year),
            ]);
    }
}
