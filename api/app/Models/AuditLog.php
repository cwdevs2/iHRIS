<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasUuid;

    public const UPDATED_AT = null;

    protected $fillable = [
        'actor_id',
        'actor_email',
        'action',
        'target_type',
        'target_id',
        'before',
        'after',
        'ip_address',
        'user_agent',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'before' => 'array',
            'after' => 'array',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * Audit logs are append-only.
     */
    public function update(array $attributes = [], array $options = []): bool
    {
        throw new \LogicException('audit_logs is append-only: UPDATE is forbidden');
    }

    public function delete(): bool
    {
        throw new \LogicException('audit_logs is append-only: DELETE is forbidden');
    }
}
