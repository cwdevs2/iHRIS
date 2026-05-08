<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Compliance;

use App\Http\Controllers\Controller;
use App\Http\Resources\RegulatoryFilingResource;
use App\Models\RegulatoryFiling;
use App\Services\Compliance\ComplianceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FilingController extends Controller
{
    public function __construct(private readonly ComplianceService $compliance) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'agency' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:pending,in_progress,filed,overdue,cancelled'],
            'due_within_days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        // Auto-flag any newly-overdue filings before listing — keeps the dashboard accurate.
        $this->compliance->flagOverdueFilings();

        $page = $this->compliance->listFilings($request->only(['agency', 'status', 'due_within_days']));

        return ApiResponse::success([
            'filings' => RegulatoryFilingResource::collection($page->items()),
            'pagination' => [
                'current_page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'agency' => ['required', 'string', 'max:32'],
            'form_code' => ['required', 'string', 'max:64'],
            'title' => ['required', 'string', 'max:255'],
            'period_covered_start' => ['nullable', 'date'],
            'period_covered_end' => ['nullable', 'date', 'after_or_equal:period_covered_start'],
            'due_on' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $filing = $this->compliance->createFiling($data);
        return ApiResponse::success(['filing' => new RegulatoryFilingResource($filing)], 201);
    }

    public function markFiled(Request $request, string $id): JsonResponse
    {
        $filing = RegulatoryFiling::findOrFail($id);

        $data = $request->validate([
            'filed_on' => ['nullable', 'date'],
            'reference_number' => ['nullable', 'string', 'max:128'],
            'notes' => ['nullable', 'string'],
        ]);

        $filing = $this->compliance->markFiled($filing, $data);
        return ApiResponse::success(['filing' => new RegulatoryFilingResource($filing)]);
    }
}
