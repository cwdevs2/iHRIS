<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WebhookSubscription extends Model
{
    use HasUuid;

    protected $fillable = [
        'name',
        'target_url',
        'signing_secret',
        'events',
        'is_active',
        'max_retries',
        'created_by',
    ];

    protected $hidden = ['signing_secret'];

    protected function casts(): array
    {
        return [
            'events' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(WebhookDelivery::class, 'subscription_id');
    }
}
