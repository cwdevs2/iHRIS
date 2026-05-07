<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\PayrollRun */
class PayrollRunResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $generatedBy = $this->whenLoaded('generatedBy');
        $finalizedBy = $this->whenLoaded('finalizedBy');

        return [
            'id' => $this->id,
            'reference_number' => $this->reference_number,
            'payroll_period_id' => $this->payroll_period_id,
            'period' => $this->whenLoaded('period', fn () => new PayrollPeriodResource($this->period)),
            'scope' => $this->scope,
            'scope_filters' => $this->scope_filters,
            'status' => $this->status,
            'total_gross' => (float) $this->total_gross,
            'total_deductions' => (float) $this->total_deductions,
            'total_net' => (float) $this->total_net,
            'total_employer_cost' => (float) $this->total_employer_cost,
            'headcount' => $this->headcount,
            'generated_by' => $generatedBy instanceof \App\Models\User
                ? ['id' => $generatedBy->id, 'name' => $generatedBy->full_name, 'email' => $generatedBy->email]
                : null,
            'generated_at' => $this->generated_at?->toIso8601String(),
            'finalized_by' => $finalizedBy instanceof \App\Models\User
                ? ['id' => $finalizedBy->id, 'name' => $finalizedBy->full_name, 'email' => $finalizedBy->email]
                : null,
            'finalized_at' => $this->finalized_at?->toIso8601String(),
            'computation_snapshot' => $this->computation_snapshot,
            'notes' => $this->notes,
            'payslips' => PayslipResource::collection($this->whenLoaded('payslips')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
