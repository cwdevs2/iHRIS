<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoleController extends Controller
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Shape a role into the wire format consumed by the front-end. */
    private function format(Role $role): array
    {
        $role->loadMissing('permissions');

        return [
            'id'            => $role->id,
            'name'          => $role->name,
            'display_name'  => $role->display_name,
            'description'   => $role->description,
            'hierarchy_level' => $role->hierarchy_level,
            'is_system'     => $role->is_system,
            // Flat list of "module.feature.action" keys
            'permissions'   => $role->permissions
                ->map(fn ($p) => "{$p->module}.{$p->feature}.{$p->action}")
                ->values()
                ->all(),
            'users_count'   => $role->users()->count(),
            'created_at'    => $role->created_at?->toIso8601String(),
        ];
    }

    // ── Routes ────────────────────────────────────────────────────────────────

    /**
     * GET /roles
     * List all roles (full detail for management UI).
     */
    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')
            ->orderBy('hierarchy_level')
            ->get()
            ->map(fn ($r) => $this->format($r));

        return ApiResponse::success(['roles' => $roles]);
    }

    /**
     * POST /roles
     * Create a new custom role.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:80', 'unique:roles,name'],
            'display_name' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $role = Role::create([
            'name'         => $data['name'],
            'display_name' => $data['display_name'] ?? $data['name'],
            'description'  => $data['description'] ?? null,
            'hierarchy_level' => 200, // Custom roles are lowest priority
            'is_system'    => false,
        ]);

        return ApiResponse::success(['role' => $this->format($role)], 201);
    }

    /**
     * PUT /roles/{id}
     * Sync permissions on a role.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $role = Role::findOrFail($id);

        if ($role->name === 'super_admin') {
            return ApiResponse::fail(['message' => 'Super Admin permissions cannot be modified.'], 403);
        }

        $data = $request->validate([
            'permissions'   => ['required', 'array'],
            'permissions.*' => ['string'],
        ]);

        // Resolve permission keys ("module.feature.action") to UUIDs
        $permissionIds = Permission::all()
            ->filter(fn ($p) => in_array("{$p->module}.{$p->feature}.{$p->action}", $data['permissions'], true))
            ->pluck('id');

        $role->permissions()->sync($permissionIds);
        $role->load('permissions');

        return ApiResponse::success(['role' => $this->format($role)]);
    }

    /**
     * PATCH /roles/{id}/rename
     * Rename a custom (non-system) role.
     */
    public function rename(Request $request, string $id): JsonResponse
    {
        $role = Role::findOrFail($id);

        if ($role->is_system) {
            return ApiResponse::fail(['message' => 'System roles cannot be renamed.'], 403);
        }

        $data = $request->validate([
            'name'         => ['required', 'string', 'max:80', "unique:roles,name,{$role->id}"],
            'display_name' => ['nullable', 'string', 'max:120'],
        ]);

        $role->update([
            'name'         => $data['name'],
            'display_name' => $data['display_name'] ?? $data['name'],
        ]);

        return ApiResponse::success(['role' => $this->format($role)]);
    }

    /**
     * POST /roles/{id}/clone
     * Duplicate a role with all its permissions under a new name.
     */
    public function clone(Request $request, string $id): JsonResponse
    {
        $source = Role::with('permissions')->findOrFail($id);

        $data = $request->validate([
            'name'         => ['required', 'string', 'max:80', 'unique:roles,name'],
            'display_name' => ['nullable', 'string', 'max:120'],
        ]);

        $clone = DB::transaction(function () use ($source, $data) {
            $newRole = Role::create([
                'name'            => $data['name'],
                'display_name'    => $data['display_name'] ?? $data['name'],
                'description'     => $source->description,
                'hierarchy_level' => 200,
                'is_system'       => false,
            ]);

            $newRole->permissions()->sync($source->permissions->pluck('id'));

            return $newRole;
        });

        return ApiResponse::success(
            ['role' => $this->format($clone), 'message' => "Role \"{$clone->display_name}\" cloned successfully."],
            201,
        );
    }

    /**
     * DELETE /roles/{id}
     * Soft-delete a custom role.
     */
    public function destroy(string $id): JsonResponse
    {
        $role = Role::findOrFail($id);

        if ($role->is_system) {
            return ApiResponse::fail(['message' => 'System roles cannot be deleted.'], 403);
        }

        if ($role->users()->count() > 0) {
            return ApiResponse::fail(['message' => 'This role is assigned to one or more users and cannot be deleted.'], 409);
        }

        $role->delete();

        return ApiResponse::success(null, 204);
    }
}
