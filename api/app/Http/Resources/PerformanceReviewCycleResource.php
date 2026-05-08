<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PerformanceReviewCycleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'name'                    => $this->name,
            'type'                    => $this->type,
            'period_start'            => $this->period_start->toDateString(),
            'period_end'              => $this->period_end->toDateString(),
            'self_assessment_due'     => $this->self_assessment_due?->toDateString(),
            'peer_review_due'         => $this->peer_review_due?->toDateString(),
            'manager_review_due'      => $this->manager_review_due?->toDateString(),
            'status'                  => $this->status,
            'enable_self_assessment'  => $this->enable_self_assessment,
            'enable_peer_review'      => $this->enable_peer_review,
            'peer_nomination_limit'   => $this->peer_nomination_limit,
            'instructions'            => $this->instructions,
            'criteria'                => $this->whenLoaded('criteria', fn () => $this->criteria->map(fn ($c) => [
                'id'          => $c->id,
                'name'        => $c->name,
                'description' => $c->description,
                'weight'      => $c->weight,
                'max_score'   => $c->max_score,
                'sort_order'  => $c->sort_order,
            ])),
            'creator'                 => $this->whenLoaded('creator', fn () => ['id' => $this->creator->id, 'full_name' => $this->creator->full_name]),
            'reviews_count'           => $this->whenCounted('reviews'),
            'created_at'              => $this->created_at->toIso8601String(),
            'updated_at'              => $this->updated_at->toIso8601String(),
        ];
    }
}
