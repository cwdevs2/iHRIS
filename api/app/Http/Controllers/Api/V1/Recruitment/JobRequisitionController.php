<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Recruitment;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobRequisitionResource;
use App\Services\Recruitment\RecruitmentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobRequisitionController extends Controller
{
    public function __construct(private RecruitmentService $service) {}

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->service->listRequisitions($request->only([
            'search', 'status', 'department_id', 'per_page', 'page',
        ]));

        return ApiResponse::success([
            'requisitions' => JobRequisitionResource::collection($paginator),
            'pagination'   => [
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
            'department_id'   => 'nullable|uuid|exists:departments,id',
            'position_id'     => 'nullable|uuid|exists:positions,id',
            'requested_by'    => 'required|uuid|exists:employees,id',
            'headcount'       => 'required|integer|min:1|max:50',
            'justification'   => 'nullable|string|max:2000',
            'employment_type' => 'required|in:regular,probationary,contractual,part_time,project_based',
            'salary_min'      => 'nullable|numeric|min:0',
            'salary_max'      => 'nullable|numeric|gte:salary_min',
            'status'          => 'in:draft,pending_approval',
            'notes'           => 'nullable|string|max:2000',
        ]);

        $requisition = $this->service->createRequisition($data, $request->user());

        return ApiResponse::success(['requisition' => new JobRequisitionResource($requisition)], 201);
    }

    public function show(string $id): JsonResponse
    {
        $requisition = $this->service->findRequisition($id);

        return ApiResponse::success(['requisition' => new JobRequisitionResource($requisition)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'department_id'   => 'nullable|uuid|exists:departments,id',
            'position_id'     => 'nullable|uuid|exists:positions,id',
            'headcount'       => 'integer|min:1|max:50',
            'justification'   => 'nullable|string|max:2000',
            'employment_type' => 'in:regular,probationary,contractual,part_time,project_based',
            'salary_min'      => 'nullable|numeric|min:0',
            'salary_max'      => 'nullable|numeric|gte:salary_min',
            'status'          => 'in:draft,pending_approval,cancelled',
            'notes'           => 'nullable|string|max:2000',
        ]);

        $requisition = $this->service->updateRequisition($id, $data, $request->user());

        return ApiResponse::success(['requisition' => new JobRequisitionResource($requisition)]);
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['action' => 'required|in:approve,reject']);
        $requisition = $this->service->approveRequisition($id, $data['action'], $request->user());

        return ApiResponse::success(['requisition' => new JobRequisitionResource($requisition)]);
    }
}
