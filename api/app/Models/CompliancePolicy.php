<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CompliancePolicy extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'title',
        'category',
        'version',
        'body',
        'effective_on',
        'expires_on',
        'requires_acknowledgment',
        'status',
        'published_by',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'effective_on' => 'date',
            'expires_on' => 'date',
            'requires_acknowledgment' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    public function acknowledgments(): HasMany
    {
        return $this->hasMany(PolicyAcknowledgment::class, 'policy_id');
    }
}
