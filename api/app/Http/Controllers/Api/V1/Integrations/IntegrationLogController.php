<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Integrations;

use App\Http\Controllers\Controller;
use App\Models\IntegrationLog;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntegrationLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'integration' => ['nullable', 'string'],
            'direction' => ['nullable', 'string', 'in:inbound,outbound'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $page = IntegrationLog::query()
            ->when($request->query('integration'), fn ($q, $v) => $q->where('integration', $v))
            ->when($request->query('direction'), fn ($q, $v) => $q->where('direction', $v))
            ->when($request->query('date_from'), fn ($q, $v) => $q->where('created_at', '>=', $v))
            ->when($request->query('date_to'), fn ($q, $v) => $q->where('created_at', '<=', $v))
            ->orderByDesc('created_at')
            ->paginate((int) ($request->query('per_page') ?? 25));

        return ApiResponse::success([
            'logs' => $page->items(),
            'pagination' => [
                'current_page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }
}
