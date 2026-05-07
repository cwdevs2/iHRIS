<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Position */
class PositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'code'            => $this->code,
            'title'           => $this->title,
            'description'     => $this->description,
            'rank_level'      => $this->rank_level,
            'min_salary'      => $this->min_salary,
            'max_salary'      => $this->max_salary,
            'is_active'       => $this->is_active,
            'employees_count' => $this->whenCounted('employees'),
            'employee_count'  => $this->whenCounted('employees'),
            'department_id'   => $this->department_id,
            'department'      => $this->whenLoaded('department', fn () => [
                'id'   => $this->department->id,
                'name' => $this->department->name,
            ]),
            'created_at'      => $this->created_at->toIso8601String(),
            'updated_at'      => $this->updated_at->toIso8601String(),
        ];
    }
}
