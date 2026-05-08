<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Assets;

use App\Http\Controllers\Controller;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetCategory;
use App\Services\Assets\AssetService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class AssetController extends Controller
{
    public function __construct(private readonly AssetService $assets) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', 'string', 'in:available,assigned,under_maintenance,lost,retired'],
            'category_id' => ['nullable', 'string', 'uuid'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $page = $this->assets->list($request->only(['status', 'category_id', 'search']), (int) ($request->query('per_page') ?? 25));

        return ApiResponse::success([
            'assets' => AssetResource::collection($page->items()),
            'pagination' => [
                'current_page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $asset = Asset::with(['category', 'assignments.employee.user', 'maintenanceLogs.logger'])
            ->findOrFail($id);

        return ApiResponse::success(['asset' => new AssetResource($asset)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'asset_tag' => ['required', 'string', 'max:64', 'unique:assets,asset_tag'],
            'category_id' => ['nullable', 'string', 'uuid', 'exists:asset_categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:128'],
            'model' => ['nullable', 'string', 'max:128'],
            'serial_number' => ['nullable', 'string', 'max:128'],
            'purchased_at' => ['nullable', 'date'],
            'purchase_cost' => ['nullable', 'numeric', 'min:0'],
            'vendor' => ['nullable', 'string', 'max:128'],
            'warranty_expires_at' => ['nullable', 'date'],
            'condition' => ['nullable', 'string', 'in:new,good,fair,poor,damaged'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $asset = $this->assets->create($data);

        return ApiResponse::success(['asset' => new AssetResource($asset)], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $asset = Asset::findOrFail($id);

        $data = $request->validate([
            'category_id' => ['nullable', 'string', 'uuid', 'exists:asset_categories,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:128'],
            'model' => ['nullable', 'string', 'max:128'],
            'serial_number' => ['nullable', 'string', 'max:128'],
            'purchased_at' => ['nullable', 'date'],
            'purchase_cost' => ['nullable', 'numeric', 'min:0'],
            'vendor' => ['nullable', 'string', 'max:128'],
            'warranty_expires_at' => ['nullable', 'date'],
            'condition' => ['nullable', 'string', 'in:new,good,fair,poor,damaged'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $asset = $this->assets->update($asset, $data);
        return ApiResponse::success(['asset' => new AssetResource($asset)]);
    }

    public function retire(Request $request, string $id): JsonResponse
    {
        $asset = Asset::findOrFail($id);

        $request->validate(['reason' => ['nullable', 'string']]);

        try {
            $asset = $this->assets->retire($asset, $request->input('reason'));
        } catch (RuntimeException $e) {
            return ApiResponse::fail(['asset' => $e->getMessage()], 422);
        }

        return ApiResponse::success(['asset' => new AssetResource($asset)]);
    }

    public function assign(Request $request, string $id): JsonResponse
    {
        $asset = Asset::findOrFail($id);

        $data = $request->validate([
            'employee_id' => ['required', 'string', 'uuid', 'exists:employees,id'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $assignment = $this->assets->assign($asset, $data['employee_id'], $data['notes'] ?? null);
        } catch (RuntimeException $e) {
            return ApiResponse::fail(['asset' => $e->getMessage()], 422);
        }

        return ApiResponse::success(['assignment' => $assignment->load('employee.user')]);
    }

    public function returnAsset(Request $request, string $assignmentId): JsonResponse
    {
        $assignment = AssetAssignment::findOrFail($assignmentId);

        $data = $request->validate([
            'condition' => ['nullable', 'string', 'in:new,good,fair,poor,damaged'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $assignment = $this->assets->returnAsset($assignment, $data['condition'] ?? null, $data['notes'] ?? null);
        } catch (RuntimeException $e) {
            return ApiResponse::fail(['assignment' => $e->getMessage()], 422);
        }

        return ApiResponse::success(['assignment' => $assignment]);
    }

    public function logMaintenance(Request $request, string $id): JsonResponse
    {
        $asset = Asset::findOrFail($id);

        $data = $request->validate([
            'type' => ['required', 'string', 'in:inspection,repair,upgrade,cleaning,other'],
            'performed_on' => ['required', 'date'],
            'next_due_on' => ['nullable', 'date', 'after_or_equal:performed_on'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'vendor' => ['nullable', 'string', 'max:128'],
            'description' => ['nullable', 'string'],
        ]);

        $log = $this->assets->logMaintenance($asset, $data);
        return ApiResponse::success(['log' => $log], 201);
    }

    /** GET /assets/categories */
    public function categories(): JsonResponse
    {
        return ApiResponse::success([
            'categories' => AssetCategory::orderBy('name')->get(['id', 'name', 'icon', 'description']),
        ]);
    }

    /** POST /assets/categories */
    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:128', 'unique:asset_categories,name'],
            'icon' => ['nullable', 'string', 'max:64'],
            'description' => ['nullable', 'string'],
        ]);

        $category = AssetCategory::create($data);
        return ApiResponse::success(['category' => $category], 201);
    }
}
