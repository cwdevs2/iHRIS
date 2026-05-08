<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Performance;

use App\Http\Controllers\Controller;
use App\Http\Resources\PerformanceReviewCycleResource;
use App\Services\Performance\PerformanceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewCycleController extends Controller
{
    public function __construct(private PerformanceService $service) {}

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->service->listCycles($request->only([
            'status', 'type', 'per_page', 'page',
        ]));

        return ApiResponse::success([
            'cycles'     => PerformanceReviewCycleResource::collection($paginator),
            'pagination' => [
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                    => 'required|string|max:200',
            'type'                    => 'required|in:quarterly,semi_annual,annual,probationary,custom',
            'period_start'            => 'required|date',
            'period_end'              => 'required|date|after:period_start',
            'self_assessment_due'     => 'nullable|date',
            'peer_review_due'         => 'nullable|date',
            'manager_review_due'      => 'nullable|date',
            'enable_self_assessment'  => 'boolean',
            'enable_peer_review'      => 'boolean',
            'peer_nomination_limit'   => 'integer|min:1|max:10',
            'instructions'            => 'nullable|string',
            'criteria'                => 'nullable|array',
            'criteria.*.name'         => 'required|string|max:200',
            'criteria.*.description'  => 'nullable|string',
            'criteria.*.weight'       => 'required|numeric|min:0|max:100',
            'criteria.*.max_score'    => 'integer|min:2|max:10',
        ]);

        $cycle = $this->service->createCycle($data, $request->user());

        return ApiResponse::success(['cycle' => new PerformanceReviewCycleResource($cycle)], 201);
    }

    public function show(string $id): JsonResponse
    {
        $cycle = $this->service->findCycle($id);

        return ApiResponse::success(['cycle' => new PerformanceReviewCycleResource($cycle)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'name'                    => 'string|max:200',
            'type'                    => 'in:quarterly,semi_annual,annual,probationary,custom',
            'period_start'            => 'date',
            'period_end'              => 'date',
            'self_assessment_due'     => 'nullable|date',
            'peer_review_due'         => 'nullable|date',
            'manager_review_due'      => 'nullable|date',
            'enable_self_assessment'  => 'boolean',
            'enable_peer_review'      => 'boolean',
            'peer_nomination_limit'   => 'integer|min:1|max:10',
            'instructions'            => 'nullable|string',
            'criteria'                => 'nullable|array',
            'criteria.*.name'         => 'required|string|max:200',
            'criteria.*.description'  => 'nullable|string',
            'criteria.*.weight'       => 'required|numeric|min:0|max:100',
            'criteria.*.max_score'    => 'integer|min:2|max:10',
        ]);

        $cycle = $this->service->updateCycle($id, $data, $request->user());

        return ApiResponse::success(['cycle' => new PerformanceReviewCycleResource($cycle)]);
    }

    public function activate(Request $request, string $id): JsonResponse
    {
        $cycle = $this->service->activateCycle($id, $request->user());

        return ApiResponse::success(['cycle' => new PerformanceReviewCycleResource($cycle)]);
    }

    public function close(Request $request, string $id): JsonResponse
    {
        $cycle = $this->service->closeCycle($id, $request->user());

        return ApiResponse::success(['cycle' => new PerformanceReviewCycleResource($cycle)]);
    }

    public function initiateReviews(Request $request, string $id): JsonResponse
    {
        $count = $this->service->initiateReviews($id, $request->user());

        return ApiResponse::success(['created_reviews' => $count]);
    }
}
