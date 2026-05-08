<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\CompliancePolicy */
class CompliancePolicyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'category' => $this->category,
            'version' => (int) $this->version,
            'body' => $this->body,
            'effective_on' => $this->effective_on?->toDateString(),
            'expires_on' => $this->expires_on?->toDateString(),
            'requires_acknowledgment' => (bool) $this->requires_acknowledgment,
            'status' => $this->status,
            'published_at' => $this->published_at?->toIso8601String(),
            'publisher' => $this->whenLoaded('publisher', fn () => $this->publisher
                ? trim(($this->publisher->first_name ?? '') . ' ' . ($this->publisher->last_name ?? ''))
                : null),
            'acknowledgments_count' => $this->when(isset($this->acknowledgments_count), (int) $this->acknowledgments_count),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
