<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Loan */
class LoanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $employee = $this->whenLoaded('employee');

        return [
            'id' => $this->id,
            'employee_id' => $this->employee_id,
            'employee' => $employee instanceof \App\Models\Employee
                ? [
                    'id' => $employee->id,
                    'employee_number' => $employee->employee_number,
                    'full_name' => $employee->user?->full_name,
                ]
                : null,
            'type' => $this->type,
            'reference_number' => $this->reference_number,
            'principal' => (float) $this->principal,
            'interest_rate' => (float) $this->interest_rate,
            'terms_months' => (int) $this->terms_months,
            'monthly_amortization' => (float) $this->monthly_amortization,
            'outstanding_balance' => (float) $this->outstanding_balance,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'payments_count' => $this->whenCounted('payments'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
