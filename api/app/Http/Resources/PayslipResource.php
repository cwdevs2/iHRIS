<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Payslip */
class PayslipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $employee = $this->whenLoaded('employee');

        return [
            'id' => $this->id,
            'payroll_run_id' => $this->payroll_run_id,
            'employee_id' => $this->employee_id,
            'employee' => $employee instanceof \App\Models\Employee
                ? [
                    'id' => $employee->id,
                    'employee_number' => $employee->employee_number,
                    'full_name' => $employee->user?->full_name,
                    'email' => $employee->user?->email,
                    'department' => $employee->department?->name,
                    'position' => $employee->position?->title,
                ]
                : null,

            'basic_salary' => (float) $this->basic_salary,
            'daily_rate' => (float) $this->daily_rate,
            'hourly_rate' => (float) $this->hourly_rate,
            'pay_frequency' => $this->pay_frequency,

            'regular_hours' => (float) $this->regular_hours,
            'overtime_hours' => (float) $this->overtime_hours,
            'night_diff_hours' => (float) $this->night_diff_hours,
            'regular_holiday_hours' => (float) $this->regular_holiday_hours,
            'special_holiday_hours' => (float) $this->special_holiday_hours,
            'rest_day_hours' => (float) $this->rest_day_hours,
            'absent_days' => (float) $this->absent_days,
            'late_minutes' => (float) $this->late_minutes,
            'undertime_minutes' => (float) $this->undertime_minutes,

            'gross_earnings' => (float) $this->gross_earnings,
            'total_deductions' => (float) $this->total_deductions,
            'taxable_income' => (float) $this->taxable_income,
            'net_pay' => (float) $this->net_pay,

            'sss_employee' => (float) $this->sss_employee,
            'sss_employer' => (float) $this->sss_employer,
            'philhealth_employee' => (float) $this->philhealth_employee,
            'philhealth_employer' => (float) $this->philhealth_employer,
            'pagibig_employee' => (float) $this->pagibig_employee,
            'pagibig_employer' => (float) $this->pagibig_employer,
            'withholding_tax' => (float) $this->withholding_tax,

            'status' => $this->status,
            'generated_at' => $this->generated_at?->toIso8601String(),
            'items' => PayslipItemResource::collection($this->whenLoaded('items')),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
