<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\WebhookSubscription */
class WebhookSubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'target_url' => $this->target_url,
            'events' => $this->events ?? [],
            'is_active' => (bool) $this->is_active,
            'max_retries' => (int) $this->max_retries,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
