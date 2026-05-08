<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Recruitment;

use App\Http\Controllers\Controller;
use App\Http\Resources\InterviewScheduleResource;
use App\Http\Resources\CandidateEvaluationResource;
use App\Http\Resources\OfferLetterResource;
use App\Services\Recruitment\RecruitmentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InterviewController extends Controller
{
    public function __construct(private RecruitmentService $service) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'applicant_id'     => 'required|uuid|exists:applicants,id',
            'interviewers'     => 'nullable|array',
            'interviewers.*'   => 'uuid|exists:users,id',
            'scheduled_at'     => 'required|date|after:now',
            'duration_minutes' => 'integer|min:15|max:480',
            'type'             => 'required|in:phone_screen,online,onsite,panel,technical,final',
            'location'         => 'nullable|string|max:500',
            'meeting_link'     => 'nullable|url|max:1000',
            'notes'            => 'nullable|string|max:2000',
        ]);

        $interview = $this->service->scheduleInterview($data, $request->user());

        return ApiResponse::success(['interview' => new InterviewScheduleResource($interview)], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'interviewers'     => 'nullable|array',
            'interviewers.*'   => 'uuid|exists:users,id',
            'scheduled_at'     => 'date',
            'duration_minutes' => 'integer|min:15|max:480',
            'type'             => 'in:phone_screen,online,onsite,panel,technical,final',
            'location'         => 'nullable|string|max:500',
            'meeting_link'     => 'nullable|url|max:1000',
            'status'           => 'in:scheduled,completed,cancelled,no_show,rescheduled',
            'notes'            => 'nullable|string|max:2000',
            'feedback'         => 'nullable|string|max:5000',
        ]);

        $interview = $this->service->updateInterview($id, $data, $request->user());

        return ApiResponse::success(['interview' => new InterviewScheduleResource($interview)]);
    }
}

class EvaluationController extends Controller
{
    public function __construct(private RecruitmentService $service) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'applicant_id'   => 'required|uuid|exists:applicants,id',
            'stage'          => 'required|string|max:50',
            'overall_score'  => 'nullable|integer|min:1|max:10',
            'recommendation' => 'nullable|in:strong_hire,hire,hold,reject,strong_reject',
            'strengths'      => 'nullable|string|max:3000',
            'concerns'       => 'nullable|string|max:3000',
            'criteria_scores' => 'nullable|array',
            'criteria_scores.*.name'  => 'required|string',
            'criteria_scores.*.score' => 'required|integer|min:1|max:10',
            'criteria_scores.*.notes' => 'nullable|string',
        ]);

        $eval = $this->service->submitEvaluation($data, $request->user());

        return ApiResponse::success(['evaluation' => new CandidateEvaluationResource($eval)], 201);
    }
}

class OfferLetterController extends Controller
{
    public function __construct(private RecruitmentService $service) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'applicant_id'       => 'required|uuid|exists:applicants,id',
            'job_posting_id'     => 'nullable|uuid|exists:job_postings,id',
            'position_id'        => 'nullable|uuid|exists:positions,id',
            'department_id'      => 'nullable|uuid|exists:departments,id',
            'offered_salary'     => 'required|numeric|min:0',
            'proposed_start_date'=> 'required|date|after:today',
            'expires_at'         => 'nullable|date|after:today',
            'terms'              => 'nullable|string',
        ]);

        $offer = $this->service->generateOffer($data, $request->user());

        return ApiResponse::success(['offer_letter' => new OfferLetterResource($offer)], 201);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'status'         => 'required|in:sent,accepted,declined,expired,withdrawn',
            'decline_reason' => 'nullable|required_if:status,declined|string|max:1000',
        ]);

        $offer = $this->service->updateOfferStatus($id, $data['status'], $request->user(), $data['decline_reason'] ?? null);

        return ApiResponse::success(['offer_letter' => new OfferLetterResource($offer)]);
    }
}
