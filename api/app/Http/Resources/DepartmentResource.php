<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Department */
class DepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'code'           => $this->code,
            'name'           => $this->name,
            'description'    => $this->description,
            'is_active'      => $this->is_active,
            'employees_count'=> $this->whenCounted('employees'),
            'parent_id'      => $this->parent_id,
            'parent'         => $this->whenLoaded('parent', fn () => [
                'id'   => $this->parent->id,
                'name' => $this->parent->name,
            ]),
            'head_user_id'   => $this->head_user_id,
            'head'           => $this->whenLoaded('head', fn () => [
                'id'        => $this->head->id,
                'full_name' => $this->head->full_name,
            ]),
            'positions'      => $this->whenLoaded(
                'positions',
                fn () => PositionResource::collection($this->positions),
            ),
            'children'       => $this->whenLoaded(
                'children',
                fn () => DepartmentResource::collection($this->children),
            ),
            'created_at'     => $this->created_at->toIso8601String(),
            'updated_at'     => $this->updated_at->toIso8601String(),
        ];
    }
}
