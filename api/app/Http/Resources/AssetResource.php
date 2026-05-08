<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Asset */
class AssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $active = $this->relationLoaded('assignments')
            ? $this->assignments->firstWhere('returned_on', null)
            : $this->activeAssignment();

        return [
            'id' => $this->id,
            'asset_tag' => $this->asset_tag,
            'name' => $this->name,
            'brand' => $this->brand,
            'model' => $this->model,
            'serial_number' => $this->serial_number,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ]),
            'category_id' => $this->category_id,
            'status' => $this->status,
            'condition' => $this->condition,
            'location' => $this->location,
            'purchased_at' => $this->purchased_at?->toDateString(),
            'purchase_cost' => $this->purchase_cost !== null ? (float) $this->purchase_cost : null,
            'vendor' => $this->vendor,
            'warranty_expires_at' => $this->warranty_expires_at?->toDateString(),
            'notes' => $this->notes,
            'active_assignment' => $active ? [
                'id' => $active->id,
                'employee_id' => $active->employee_id,
                'employee_name' => trim(
                    ($active->employee?->user?->first_name ?? '')
                    . ' '
                    . ($active->employee?->user?->last_name ?? '')
                ),
                'assigned_on' => $active->assigned_on?->toDateString(),
            ] : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
