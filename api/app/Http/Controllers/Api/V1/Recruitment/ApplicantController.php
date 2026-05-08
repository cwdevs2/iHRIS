<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Recruitment;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApplicantResource;
use App\Services\Recruitment\RecruitmentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicantController extends Controller
{
    public function __construct(private RecruitmentService $service) {}

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->service->listApplicants($request->only([
            'search', 'job_posting_id', 'stage', 'status', 'per_page', 'page',
        ]));

        return ApiResponse::success([
            'applicants' => ApplicantResource::collection($paginator),
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
            'job_posting_id' => 'required|uuid|exists:job_postings,id',
            'first_name'     => 'required|string|max:100',
            'last_name'      => 'required|string|max:100',
            'email'          => 'required|email|max:200',
            'phone'          => 'nullable|string|max:30',
            'cover_letter'   => 'nullable|string',
            'source'         => 'nullable|string|max:100',
            'referrer_name'  => 'nullable|string|max:200',
        ]);

        $applicant = $this->service->createApplicant($data, $request->user());

        return ApiResponse::success(['applicant' => new ApplicantResource($applicant)], 201);
    }

    public function show(string $id): JsonResponse
    {
        $applicant = $this->service->findApplicant($id);

        return ApiResponse::success(['applicant' => new ApplicantResource($applicant)]);
    }

    public function advanceStage(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'stage'            => 'required|in:applied,screening,interview,evaluation,offer,hired,rejected',
            'rejection_reason' => 'nullable|required_if:stage,rejected|string|max:1000',
        ]);

        $applicant = $this->service->advanceApplicantStage(
            $id,
            $data['stage'],
            $request->user(),
            $data['rejection_reason'] ?? null,
        );

        return ApiResponse::success(['applicant' => new ApplicantResource($applicant)]);
    }

    public function uploadResume(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'resume' => 'required|file|mimes:pdf,doc,docx|max:10240',
        ]);

        $applicant = $this->service->uploadResume($id, $request->file('resume'), $request->user());

        return ApiResponse::success(['applicant' => new ApplicantResource($applicant)]);
    }
}
