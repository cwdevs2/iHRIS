<?php

declare(strict_types=1);

namespace App\Http\Requests\Payroll;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Body shape:
 * {
 *   "effective_year": 2026,
 *   "inputs": {
 *     "<employee_uuid>": {
 *       "regular_hours": 88,
 *       "overtime_hours": 4,
 *       "rest_day_hours": 0,
 *       "regular_holiday_hours": 0,
 *       "special_holiday_hours": 0,
 *       "night_diff_hours": 0,
 *       "absent_days": 0,
 *       "late_minutes": 0,
 *       "undertime_minutes": 0,
 *       "allowances": [{ "code": "TRANSPORT", "label": "Transport Allowance", "amount": 1500, "is_taxable": false }],
 *       "bonuses":    [{ "code": "PERF",      "label": "Performance Bonus",   "amount": 5000 }],
 *       "other_deductions": [{ "code": "ADV", "label": "Cash Advance", "amount": 2000 }]
 *     }
 *   }
 * }
 */
class GeneratePayslipsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'effective_year' => ['nullable', 'integer', 'min:2020', 'max:2099'],
            'inputs' => ['nullable', 'array'],
            'inputs.*' => ['array'],
            'inputs.*.regular_hours' => ['nullable', 'numeric', 'min:0'],
            'inputs.*.overtime_hours' => ['nullable', 'numeric', 'min:0'],
            'inputs.*.rest_day_hours' => ['nullable', 'numeric', 'min:0'],
            'inputs.*.regular_holiday_hours' => ['nullable', 'numeric', 'min:0'],
            'inputs.*.special_holiday_hours' => ['nullable', 'numeric', 'min:0'],
            'inputs.*.night_diff_hours' => ['nullable', 'numeric', 'min:0'],
            'inputs.*.absent_days' => ['nullable', 'numeric', 'min:0'],
            'inputs.*.late_minutes' => ['nullable', 'numeric', 'min:0'],
            'inputs.*.undertime_minutes' => ['nullable', 'numeric', 'min:0'],
            'inputs.*.allowances' => ['nullable', 'array'],
            'inputs.*.allowances.*.code' => ['required', 'string', 'max:50'],
            'inputs.*.allowances.*.label' => ['required', 'string', 'max:120'],
            'inputs.*.allowances.*.amount' => ['required', 'numeric'],
            'inputs.*.allowances.*.is_taxable' => ['nullable', 'boolean'],
            'inputs.*.bonuses' => ['nullable', 'array'],
            'inputs.*.bonuses.*.code' => ['required', 'string', 'max:50'],
            'inputs.*.bonuses.*.label' => ['required', 'string', 'max:120'],
            'inputs.*.bonuses.*.amount' => ['required', 'numeric'],
            'inputs.*.bonuses.*.is_taxable' => ['nullable', 'boolean'],
            'inputs.*.other_deductions' => ['nullable', 'array'],
            'inputs.*.other_deductions.*.code' => ['required', 'string', 'max:50'],
            'inputs.*.other_deductions.*.label' => ['required', 'string', 'max:120'],
            'inputs.*.other_deductions.*.amount' => ['required', 'numeric', 'min:0'],
        ];
    }
}
