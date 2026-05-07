<?php

declare(strict_types=1);

namespace App\Http\Requests\Payroll;

use Illuminate\Foundation\Http\FormRequest;

class StorePayrollPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // RBAC enforced via middleware on the route.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'frequency' => ['required', 'in:monthly,semi_monthly,weekly,bi_weekly'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'pay_date' => ['nullable', 'date', 'after_or_equal:period_end'],
            'working_days' => ['nullable', 'numeric', 'min:0', 'max:62'],
            'status' => ['nullable', 'in:open,processing,closed'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ];
    }
}
