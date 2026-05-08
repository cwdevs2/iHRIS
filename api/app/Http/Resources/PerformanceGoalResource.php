<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PerformanceGoalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'employee_id'  => $this->employee_id,
            'employee'     => $this->whenLoaded('employee', fn () => [
                'id'        => $this->employee->id,
                'full_name' => $this->employee->user?->full_name ?? 'Unknown',
            ]),
            'cycle_id'     => $this->cycle_id,
            'cycle'        => $this->whenLoaded('cycle', fn () => $this->cycle ? [
                'id'   => $this->cycle->id,
                'name' => $this->cycle->name,
            ] : null),
            'title'        => $this->title,
            'description'  => $this->description,
            'target_value' => $this->target_value,
            'actual_value' => $this->actual_value,
            'unit'         => $this->unit,
            'weight'       => $this->weight,
            'status'       => $this->status,
            'due_date'     => $this->due_date?->toDateString(),
            'created_at'   => $this->created_at->toIso8601String(),
            'updated_at'   => $this->updated_at->toIso8601String(),
        ];
    }
}

class PerformanceReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'cycle_id'              => $this->cycle_id,
            'cycle'                 => $this->whenLoaded('cycle', fn () => [
                'id'       => $this->cycle->id,
                'name'     => $this->cycle->name,
                'criteria' => $this->cycle->criteria->map(fn ($c) => [
                    'id'        => $c->id,
                    'name'      => $c->name,
                    'weight'    => $c->weight,
                    'max_score' => $c->max_score,
                ]),
            ]),
            'employee_id'           => $this->employee_id,
            'employee'              => $this->whenLoaded('employee', fn () => [
                'id'        => $this->employee->id,
                'full_name' => $this->employee->user?->full_name ?? 'Unknown',
                'position'  => $this->employee->position?->title,
            ]),
            'reviewer_id'           => $this->reviewer_id,
            'reviewer'              => $this->whenLoaded('reviewer', fn () => [
                'id'        => $this->reviewer->id,
                'full_name' => $this->reviewer->full_name,
            ]),
            'review_type'           => $this->review_type,
            'status'                => $this->status,
            'overall_score'         => $this->overall_score,
            'strengths'             => $this->strengths,
            'areas_for_improvement' => $this->areas_for_improvement,
            'development_plan'      => $this->development_plan,
            'employee_comments'     => $this->employee_comments,
            'is_anonymous'          => $this->is_anonymous,
            'scores'                => $this->whenLoaded('scores', fn () => $this->scores->map(fn ($s) => [
                'criteria_id' => $s->criteria_id,
                'criteria'    => $s->whenLoaded('criteria', fn () => $s->criteria?->name),
                'score'       => $s->score,
                'comments'    => $s->comments,
            ])),
            'submitted_at'          => $this->submitted_at?->toIso8601String(),
            'acknowledged_at'       => $this->acknowledged_at?->toIso8601String(),
            'created_at'            => $this->created_at->toIso8601String(),
        ];
    }
}
