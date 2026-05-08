<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobPostingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'job_requisition_id' => $this->job_requisition_id,
            'requisition'        => $this->whenLoaded('requisition', fn () => new JobRequisitionResource($this->requisition)),
            'title'              => $this->title,
            'description'        => $this->description,
            'requirements'       => $this->requirements,
            'responsibilities'   => $this->responsibilities,
            'location'           => $this->location,
            'employment_type'    => $this->employment_type,
            'salary_min'         => $this->when($this->show_salary, $this->salary_min),
            'salary_max'         => $this->when($this->show_salary, $this->salary_max),
            'show_salary'        => $this->show_salary,
            'status'             => $this->status,
            'published_at'       => $this->published_at?->toIso8601String(),
            'closes_at'          => $this->closes_at?->toIso8601String(),
            'applicants_count'   => $this->whenCounted('applicants'),
            'creator'            => $this->whenLoaded('creator', fn () => ['id' => $this->creator->id, 'full_name' => $this->creator->full_name]),
            'created_at'         => $this->created_at->toIso8601String(),
            'updated_at'         => $this->updated_at->toIso8601String(),
        ];
    }
}
