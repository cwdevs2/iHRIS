<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserGroup\StoreUserGroupRequest;
use App\Http\Requests\UserGroup\UpdateUserGroupRequest;
use App\Http\Resources\UserGroupResource;
use App\Services\UserGroupService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserGroupController extends Controller
{
    public function __construct(private UserGroupService $service) {}

    /**
     * GET /user-groups
     * List all groups (paginated) or a flat list when ?all=true.
     * Supports ?department_id=uuid to filter by department scope.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'type', 'is_active', 'department_id', 'per_page', 'page']);

        if ($request->boolean('all')) {
            return ApiResponse::success([
                'groups' => UserGroupResource::collection($this->service->listAll($filters)),
            ]);
        }

        $paginator = $this->service->list($filters);

        return ApiResponse::success([
            'groups'     => UserGroupResource::collection($paginator),
            'pagination' => [
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * POST /user-groups
     */
    public function store(StoreUserGroupRequest $request): JsonResponse
    {
        $group = $this->service->create($request->validated(), $request->user());

        return ApiResponse::success(['group' => new UserGroupResource($group)], 201);
    }

    /**
     * GET /user-groups/{id}
     */
    public function show(string $id): JsonResponse
    {
        $group = $this->service->find($id);

        return ApiResponse::success(['group' => new UserGroupResource($group)]);
    }

    /**
     * PATCH /user-groups/{id}
     */
    public function update(UpdateUserGroupRequest $request, string $id): JsonResponse
    {
        $group = $this->service->update($id, $request->validated(), $request->user());

        return ApiResponse::success(['group' => new UserGroupResource($group)]);
    }

    /**
     * DELETE /user-groups/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->service->delete($id, $request->user());

        return ApiResponse::success(['message' => 'User group archived.']);
    }

    /**
     * POST /user-groups/{id}/members
     * Body: { user_id: uuid }
     */
    public function addMember(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
        ]);

        $group = $this->service->addMember($id, $data['user_id'], $request->user());

        return ApiResponse::success(['group' => new UserGroupResource($group)]);
    }

    /**
     * DELETE /user-groups/{id}/members/{userId}
     */
    public function removeMember(Request $request, string $id, string $userId): JsonResponse
    {
        $group = $this->service->removeMember($id, $userId, $request->user());

        return ApiResponse::success(['group' => new UserGroupResource($group)]);
    }
}
