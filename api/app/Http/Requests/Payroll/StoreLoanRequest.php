<?php

declare(strict_types=1);

namespace App\Http\Requests\Payroll;

use Illuminate\Foundation\Http\FormRequest;

class StoreLoanRequest extends FormRequest
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
            'type' => ['required', 'in:sss,pagibig,company,salary_advance,other'],
            'reference_number' => ['nullable', 'string', 'max:80'],
            'principal' => ['required', 'numeric', 'min:0.01'],
            'interest_rate' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'terms_months' => ['required', 'integer', 'min:1', 'max:120'],
            'monthly_amortization' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'in:active,paid,cancelled,on_hold'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
