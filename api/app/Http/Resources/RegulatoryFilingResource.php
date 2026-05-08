<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\RegulatoryFiling */
class RegulatoryFilingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $today = Carbon::today();

        return [
            'id' => $this->id,
            'agency' => $this->agency,
            'form_code' => $this->form_code,
            'title' => $this->title,
            'period' => [
                'start' => $this->period_covered_start?->toDateString(),
                'end' => $this->period_covered_end?->toDateString(),
            ],
            'due_on' => $this->due_on?->toDateString(),
            'days_until_due' => $this->due_on ? $today->diffInDays($this->due_on, false) : null,
            'status' => $this->status,
            'filed_on' => $this->filed_on?->toDateString(),
            'reference_number' => $this->reference_number,
            'notes' => $this->notes,
            'filer' => $this->whenLoaded('filer', fn () => $this->filer
                ? trim(($this->filer->first_name ?? '') . ' ' . ($this->filer->last_name ?? ''))
                : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
