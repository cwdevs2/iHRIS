<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee_id' => $this->employee_id,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar_url' => $this->avatar_path
                ? url("storage/{$this->avatar_path}")
                : null,
            'status' => $this->status,
            'mfa_enabled' => (bool) $this->mfa_enabled,
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'display_name' => $r->display_name,
                'hierarchy_level' => $r->hierarchy_level,
            ])),
            'permissions' => $this->whenLoaded('roles', function () {
                return $this->roles
                    ->loadMissing('permissions')
                    ->flatMap(fn ($r) => $r->permissions)
                    ->unique(fn ($p) => "{$p->module}.{$p->feature}.{$p->action}")
                    ->values()
                    ->map(fn ($p) => "{$p->module}.{$p->feature}.{$p->action}");
            }),
            // Groups expose the department scope for this user
            'groups' => $this->whenLoaded('groups', function () {
                return $this->groups->map(fn ($g) => [
                    'id'             => $g->id,
                    'name'           => $g->name,
                    'type'           => $g->type,
                    'department_ids' => $g->relationLoaded('departments')
                        ? $g->departments->pluck('id')->values()->all()
                        : [],
                ])->values()->all();
            }),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
