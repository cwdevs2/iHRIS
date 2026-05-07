<?php

declare(strict_types=1);

namespace App\Http\Requests\Payroll;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePayrollPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'frequency' => ['sometimes', 'in:monthly,semi_monthly,weekly,bi_weekly'],
            'period_start' => ['sometimes', 'date'],
            'period_end' => ['sometimes', 'date', 'after_or_equal:period_start'],
            'pay_date' => ['nullable', 'date'],
            'working_days' => ['nullable', 'numeric', 'min:0', 'max:62'],
            'status' => ['sometimes', 'in:open,processing,closed'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ];
    }
}
