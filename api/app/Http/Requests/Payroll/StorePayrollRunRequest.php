<?php

declare(strict_types=1);

namespace App\Http\Requests\Payroll;

use Illuminate\Foundation\Http\FormRequest;

class StorePayrollRunRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'payroll_period_id' => ['required', 'uuid', 'exists:payroll_periods,id'],
            'scope' => ['nullable', 'in:company,department,custom'],
            'scope_filters' => ['nullable', 'array'],
            'scope_filters.department_ids' => ['nullable', 'array'],
            'scope_filters.department_ids.*' => ['uuid', 'exists:departments,id'],
            'scope_filters.employee_ids' => ['nullable', 'array'],
            'scope_filters.employee_ids.*' => ['uuid', 'exists:employees,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
