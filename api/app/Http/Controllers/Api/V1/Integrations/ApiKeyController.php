<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Integrations;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApiKeyResource;
use App\Models\ApiKey;
use App\Services\Integrations\ApiKeyService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiKeyController extends Controller
{
    public function __construct(private readonly ApiKeyService $keys) {}

    public function index(): JsonResponse
    {
        $rows = ApiKey::query()->orderByDesc('created_at')->get();
        return ApiResponse::success(['keys' => ApiKeyResource::collection($rows)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:128'],
            'scopes' => ['nullable', 'array'],
            'scopes.*' => ['string', 'max:64'],
            'rate_limit_per_minute' => ['nullable', 'integer', 'min:10', 'max:1000'],
        ]);

        $result = $this->keys->create($data);

        return ApiResponse::success([
            'key' => new ApiKeyResource($result['api_key']),
            // The plain token is shown ONCE — caller must save it now.
            'plain_token' => $result['plain_token'],
        ], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $key = ApiKey::findOrFail($id);
        $key = $this->keys->revoke($key);
        return ApiResponse::success(['key' => new ApiKeyResource($key)]);
    }
}
