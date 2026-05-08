<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookDelivery extends Model
{
    use HasUuid;

    protected $fillable = [
        'subscription_id',
        'event_name',
        'payload',
        'response_status',
        'response_body',
        'attempts',
        'delivered_at',
        'failed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'delivered_at' => 'datetime',
            'failed_at' => 'datetime',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(WebhookSubscription::class, 'subscription_id');
    }
}
