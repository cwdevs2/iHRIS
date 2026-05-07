<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Position\StorePositionRequest;
use App\Http\Requests\Position\UpdatePositionRequest;
use App\Http\Resources\PositionResource;
use App\Services\PositionService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PositionController extends Controller
{
    public function __construct(private PositionService $service) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->boolean('all')) {
            return ApiResponse::success([
                'positions' => PositionResource::collection(
                    $this->service->allActive($request->query('department_id')),
                ),
            ]);
        }

        $paginator = $this->service->list($request->only([
            'search', 'department_id', 'is_active', 'per_page', 'page',
        ]));

        return ApiResponse::success([
            'positions'  => PositionResource::collection($paginator),
            'pagination' => [
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function store(StorePositionRequest $request): JsonResponse
    {
        $pos = $this->service->create($request->validated(), $request->user());

        return ApiResponse::success(['position' => new PositionResource($pos)], 201);
    }

    public function show(string $id): JsonResponse
    {
        return ApiResponse::success(['position' => new PositionResource($this->service->find($id))]);
    }

    public function update(UpdatePositionRequest $request, string $id): JsonResponse
    {
        $pos = $this->service->update($id, $request->validated(), $request->user());

        return ApiResponse::success(['position' => new PositionResource($pos)]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->service->delete($id, $request->user());

        return ApiResponse::success(['message' => 'Position archived.']);
    }
}
