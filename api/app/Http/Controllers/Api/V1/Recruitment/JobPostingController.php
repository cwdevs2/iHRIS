<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Recruitment;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobPostingResource;
use App\Services\Recruitment\RecruitmentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobPostingController extends Controller
{
    public function __construct(private RecruitmentService $service) {}

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->service->listPostings($request->only([
            'search', 'status', 'per_page', 'page',
        ]));

        return ApiResponse::success([
            'postings'   => JobPostingResource::collection($paginator),
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
            'job_requisition_id' => 'nullable|uuid|exists:job_requisitions,id',
            'title'              => 'required|string|max:200',
            'description'        => 'nullable|string',
            'requirements'       => 'nullable|string',
            'responsibilities'   => 'nullable|string',
            'location'           => 'nullable|string|max:200',
            'employment_type'    => 'required|in:regular,probationary,contractual,part_time,project_based',
            'salary_min'         => 'nullable|numeric|min:0',
            'salary_max'         => 'nullable|numeric|gte:salary_min',
            'show_salary'        => 'boolean',
            'status'             => 'in:draft,published',
            'closes_at'          => 'nullable|date|after:today',
        ]);

        $posting = $this->service->createPosting($data, $request->user());

        return ApiResponse::success(['posting' => new JobPostingResource($posting)], 201);
    }

    public function show(string $id): JsonResponse
    {
        $posting = $this->service->findPosting($id);

        return ApiResponse::success(['posting' => new JobPostingResource($posting)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'title'           => 'string|max:200',
            'description'     => 'nullable|string',
            'requirements'    => 'nullable|string',
            'responsibilities'=> 'nullable|string',
            'location'        => 'nullable|string|max:200',
            'employment_type' => 'in:regular,probationary,contractual,part_time,project_based',
            'salary_min'      => 'nullable|numeric|min:0',
            'salary_max'      => 'nullable|numeric|gte:salary_min',
            'show_salary'     => 'boolean',
            'status'          => 'in:draft,published,closed,archived',
            'closes_at'       => 'nullable|date',
        ]);

        $posting = $this->service->updatePosting($id, $data, $request->user());

        return ApiResponse::success(['posting' => new JobPostingResource($posting)]);
    }
}
