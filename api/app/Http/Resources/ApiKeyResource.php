<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ApiKey */
class ApiKeyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'key_prefix' => $this->key_prefix,
            'masked' => $this->key_prefix . str_repeat('•', 12),
            'scopes' => $this->scopes ?? [],
            'rate_limit_per_minute' => (int) $this->rate_limit_per_minute,
            'last_used_at' => $this->last_used_at?->toIso8601String(),
            'last_used_ip' => $this->last_used_ip,
            'revoked_at' => $this->revoked_at?->toIso8601String(),
            'is_active' => $this->revoked_at === null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
