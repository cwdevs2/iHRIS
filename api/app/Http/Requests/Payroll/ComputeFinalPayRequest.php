<?php

declare(strict_types=1);

namespace App\Http\Requests\Payroll;

use Illuminate\Foundation\Http\FormRequest;

class ComputeFinalPayRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'employee_id' => ['required', 'uuid', 'exists:employees,id'],
            'last_day_worked' => ['required', 'date'],
            'unpaid_days' => ['required', 'numeric', 'min:0'],
            'unused_leave_days' => ['nullable', 'numeric', 'min:0'],
            'separation_reason' => ['required', 'in:resignation,redundancy,retrenchment,closure_not_due_to_serious_losses,disease,installation_labor_saving_devices,end_of_contract,just_cause'],
            'additional_earnings' => ['nullable', 'array'],
            'additional_earnings.*.code' => ['required', 'string', 'max:50'],
            'additional_earnings.*.label' => ['required', 'string', 'max:120'],
            'additional_earnings.*.amount' => ['required', 'numeric'],
            'additional_deductions' => ['nullable', 'array'],
            'additional_deductions.*.code' => ['required', 'string', 'max:50'],
            'additional_deductions.*.label' => ['required', 'string', 'max:120'],
            'additional_deductions.*.amount' => ['required', 'numeric'],
        ];
    }
}
