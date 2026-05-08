<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationLog extends Model
{
    use HasUuid;

    public const UPDATED_AT = null;

    protected $fillable = [
        'integration',
        'direction',
        'endpoint',
        'status_code',
        'request_payload',
        'response_payload',
        'error_message',
        'api_key_id',
        'source_ip',
    ];

    protected function casts(): array
    {
        return [
            'request_payload' => 'array',
            'response_payload' => 'array',
        ];
    }

    public function apiKey(): BelongsTo
    {
        return $this->belongsTo(ApiKey::class);
    }
}
