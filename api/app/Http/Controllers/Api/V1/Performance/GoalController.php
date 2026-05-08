<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Performance;

use App\Http\Controllers\Controller;
use App\Http\Resources\PerformanceGoalResource;
use App\Http\Resources\PerformanceReviewResource;
use App\Services\Performance\PerformanceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoalController extends Controller
{
    public function __construct(private PerformanceService $service) {}

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->service->listGoals($request->only([
            'employee_id', 'cycle_id', 'status', 'per_page', 'page',
        ]));

        return ApiResponse::success([
            'goals'      => PerformanceGoalResource::collection($paginator),
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
            'employee_id'  => 'required|uuid|exists:employees,id',
            'cycle_id'     => 'nullable|uuid|exists:performance_review_cycles,id',
            'title'        => 'required|string|max:300',
            'description'  => 'nullable|string',
            'target_value' => 'nullable|string|max:200',
            'unit'         => 'in:percentage,number,currency,boolean,text',
            'weight'       => 'numeric|min:0|max:100',
            'status'       => 'in:draft,active',
            'due_date'     => 'nullable|date',
        ]);

        $goal = $this->service->createGoal($data, $request->user());

        return ApiResponse::success(['goal' => new PerformanceGoalResource($goal)], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'title'        => 'string|max:300',
            'description'  => 'nullable|string',
            'target_value' => 'nullable|string|max:200',
            'actual_value' => 'nullable|string|max:200',
            'unit'         => 'in:percentage,number,currency,boolean,text',
            'weight'       => 'numeric|min:0|max:100',
            'status'       => 'in:draft,active,achieved,partially_achieved,missed,cancelled',
            'due_date'     => 'nullable|date',
        ]);

        $goal = $this->service->updateGoal($id, $data, $request->user());

        return ApiResponse::success(['goal' => new PerformanceGoalResource($goal)]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->service->deleteGoal($id, $request->user());

        return ApiResponse::success(['message' => 'Goal removed.']);
    }
}

class ReviewController extends Controller
{
    public function __construct(private PerformanceService $service) {}

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->service->listReviews($request->only([
            'cycle_id', 'employee_id', 'reviewer_id', 'review_type', 'status', 'per_page', 'page',
        ]));

        return ApiResponse::success([
            'reviews'    => PerformanceReviewResource::collection($paginator),
            'pagination' => [
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $review = $this->service->findReview($id);

        return ApiResponse::success(['review' => new PerformanceReviewResource($review)]);
    }

    public function submit(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'strengths'             => 'nullable|string',
            'areas_for_improvement' => 'nullable|string',
            'development_plan'      => 'nullable|string',
            'scores'                => 'nullable|array',
            'scores.*.criteria_id'  => 'required|uuid|exists:performance_review_criteria,id',
            'scores.*.score'        => 'required|numeric|min:0',
            'scores.*.comments'     => 'nullable|string',
        ]);

        $review = $this->service->submitReview($id, $data, $request->user());

        return ApiResponse::success(['review' => new PerformanceReviewResource($review)]);
    }

    public function acknowledge(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'employee_comments' => 'nullable|string|max:3000',
        ]);

        $review = $this->service->acknowledgeReview($id, $data['employee_comments'] ?? null, $request->user());

        return ApiResponse::success(['review' => new PerformanceReviewResource($review)]);
    }
}

class PerformanceAnalyticsController extends Controller
{
    public function __construct(private PerformanceService $service) {}

    public function index(Request $request): JsonResponse
    {
        $cycleId = $request->query('cycle_id');

        return ApiResponse::success($this->service->getAnalytics($cycleId));
    }
}
