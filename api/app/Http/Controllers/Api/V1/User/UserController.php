<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Services\UserService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private UserService $service) {}

    /**
     * GET /api/v1/users
     * Query: search, status, role, per_page, page, sort, direction
     */
    public function index(Request $request): JsonResponse
    {
        $paginator = $this->service->list($request->only([
            'search',
            'status',
            'role',
            'per_page',
            'page',
            'sort',
            'direction',
        ]));

        return ApiResponse::success([
            'users' => UserResource::collection($paginator),
            'pagination' => [
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/v1/users
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->service->create(
            $request->validated(),
            $request->user(),
        );

        return ApiResponse::success(
            ['user' => new UserResource($user)],
            201,
        );
    }

    /**
     * GET /api/v1/users/{id}
     */
    public function show(string $id): JsonResponse
    {
        $user = $this->service->find($id);

        return ApiResponse::success(['user' => new UserResource($user)]);
    }

    /**
     * PATCH /api/v1/users/{id}
     */
    public function update(UpdateUserRequest $request, string $id): JsonResponse
    {
        $user = $this->service->update($id, $request->validated(), $request->user());

        return ApiResponse::success(['user' => new UserResource($user)]);
    }

    /**
     * DELETE /api/v1/users/{id}
     * Soft-delete only.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->service->delete($id, $request->user());

        return ApiResponse::success([], 200, 'User deactivated.');
    }
}
