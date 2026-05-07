<?php

declare(strict_types=1);

namespace App\Http\Requests\Payroll;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLoanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'reference_number' => ['nullable', 'string', 'max:80'],
            'monthly_amortization' => ['sometimes', 'numeric', 'min:0'],
            'status' => ['sometimes', 'in:active,paid,cancelled,on_hold'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
