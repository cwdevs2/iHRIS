<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InterviewScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'applicant_id'     => $this->applicant_id,
            'applicant'        => $this->whenLoaded('applicant', fn () => new ApplicantResource($this->applicant)),
            'scheduled_by'     => $this->scheduled_by,
            'scheduler'        => $this->whenLoaded('scheduler', fn () => ['id' => $this->scheduler->id, 'full_name' => $this->scheduler->full_name]),
            'interviewers'     => $this->interviewers ?? [],
            'scheduled_at'     => $this->scheduled_at->toIso8601String(),
            'duration_minutes' => $this->duration_minutes,
            'type'             => $this->type,
            'location'         => $this->location,
            'meeting_link'     => $this->meeting_link,
            'status'           => $this->status,
            'notes'            => $this->notes,
            'feedback'         => $this->feedback,
            'created_at'       => $this->created_at->toIso8601String(),
        ];
    }
}

class CandidateEvaluationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'applicant_id'    => $this->applicant_id,
            'evaluated_by'    => $this->evaluated_by,
            'evaluator'       => $this->whenLoaded('evaluator', fn () => ['id' => $this->evaluator->id, 'full_name' => $this->evaluator->full_name]),
            'stage'           => $this->stage,
            'overall_score'   => $this->overall_score,
            'recommendation'  => $this->recommendation,
            'strengths'       => $this->strengths,
            'concerns'        => $this->concerns,
            'criteria_scores' => $this->criteria_scores ?? [],
            'created_at'      => $this->created_at->toIso8601String(),
        ];
    }
}

class OfferLetterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'applicant_id'        => $this->applicant_id,
            'applicant'           => $this->whenLoaded('applicant', fn () => new ApplicantResource($this->applicant)),
            'position'            => $this->whenLoaded('position', fn () => ['id' => $this->position->id, 'title' => $this->position->title]),
            'department'          => $this->whenLoaded('department', fn () => ['id' => $this->department->id, 'name' => $this->department->name]),
            'offered_salary'      => $this->offered_salary,
            'proposed_start_date' => $this->proposed_start_date->toDateString(),
            'expires_at'          => $this->expires_at?->toIso8601String(),
            'status'              => $this->status,
            'terms'               => $this->terms,
            'decline_reason'      => $this->decline_reason,
            'responded_at'        => $this->responded_at?->toIso8601String(),
            'generated_by'        => $this->generated_by,
            'created_at'          => $this->created_at->toIso8601String(),
        ];
    }
}
