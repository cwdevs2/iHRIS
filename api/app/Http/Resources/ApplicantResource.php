<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApplicantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'job_posting_id'   => $this->job_posting_id,
            'job_posting'      => $this->whenLoaded('jobPosting', fn () => new JobPostingResource($this->jobPosting)),
            'first_name'       => $this->first_name,
            'last_name'        => $this->last_name,
            'full_name'        => $this->full_name,
            'email'            => $this->email,
            'phone'            => $this->phone,
            'has_resume'       => (bool) $this->resume_path,
            'cover_letter'     => $this->cover_letter,
            'source'           => $this->source,
            'referrer_name'    => $this->referrer_name,
            'stage'            => $this->stage,
            'status'           => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'interviews'       => $this->whenLoaded('interviews', fn () => InterviewScheduleResource::collection($this->interviews)),
            'evaluations'      => $this->whenLoaded('evaluations', fn () => CandidateEvaluationResource::collection($this->evaluations)),
            'offer_letters'    => $this->whenLoaded('offerLetters', fn () => OfferLetterResource::collection($this->offerLetters)),
            'created_at'       => $this->created_at->toIso8601String(),
            'updated_at'       => $this->updated_at->toIso8601String(),
        ];
    }
}
