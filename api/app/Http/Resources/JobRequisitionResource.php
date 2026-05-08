<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobRequisitionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'department'      => $this->whenLoaded('department', fn () => ['id' => $this->department->id, 'name' => $this->department->name]),
            'position'        => $this->whenLoaded('position', fn () => ['id' => $this->position->id, 'title' => $this->position->title]),
            'requested_by'    => $this->whenLoaded('requester', fn () => [
                'id'        => $this->requester->id,
                'full_name' => $this->requester->user?->full_name ?? 'Unknown',
            ]),
            'approved_by'     => $this->whenLoaded('approver', fn () => $this->approver ? [
                'id'        => $this->approver->id,
                'full_name' => $this->approver->full_name,
            ] : null),
            'headcount'       => $this->headcount,
            'justification'   => $this->justification,
            'employment_type' => $this->employment_type,
            'salary_min'      => $this->salary_min,
            'salary_max'      => $this->salary_max,
            'status'          => $this->status,
            'notes'           => $this->notes,
            'approved_at'     => $this->approved_at?->toIso8601String(),
            'job_postings'    => $this->whenLoaded('jobPostings', fn () => JobPostingResource::collection($this->jobPostings)),
            'created_at'      => $this->created_at->toIso8601String(),
            'updated_at'      => $this->updated_at->toIso8601String(),
        ];
    }
}
