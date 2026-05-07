<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    /**
     * GET /api/v1/roles
     * Returns all non-deleted roles for use in dropdowns/assignment.
     */
    public function index(): JsonResponse
    {
        $roles = Role::orderBy('hierarchy_level', 'desc')
            ->get(['id', 'name', 'display_name', 'hierarchy_level']);

        return ApiResponse::success(['roles' => $roles]);
    }
}
