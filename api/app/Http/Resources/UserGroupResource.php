<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\UserGroup */
class UserGroupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'name'           => $this->name,
            'slug'           => $this->slug,
            'description'    => $this->description,
            'type'           => $this->type,
            'is_active'      => $this->is_active,
            'members_count'  => $this->members_count ?? $this->whenCounted('members'),
            'department_ids' => $this->whenLoaded(
                'departments',
                fn () => $this->departments->pluck('id')->values()->all(),
            ),
            'departments'    => $this->whenLoaded(
                'departments',
                fn () => $this->departments->map(fn ($d) => [
                    'id'   => $d->id,
                    'name' => $d->name,
                    'code' => $d->code,
                ])->values()->all(),
            ),
            'members'        => $this->whenLoaded(
                'members',
                fn () => $this->members->map(fn ($u) => [
                    'id'        => $u->id,
                    'full_name' => $u->full_name,
                    'email'     => $u->email,
                    'avatar_url' => $u->avatar_path ? url("storage/{$u->avatar_path}") : null,
                    'employee_number' => $u->employee?->employee_number,
                    'added_by'  => $u->pivot->added_by,
                    'added_at'  => $u->pivot->created_at?->toIso8601String(),
                ])->values()->all(),
            ),
            'created_by'     => $this->created_by,
            'creator'        => $this->whenLoaded('creator', fn () => [
                'id'        => $this->creator->id,
                'full_name' => $this->creator->full_name,
            ]),
            'created_at'     => $this->created_at?->toIso8601String(),
            'updated_at'     => $this->updated_at?->toIso8601String(),
        ];
    }
}
