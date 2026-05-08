<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiKey extends Model
{
    use HasUuid;

    protected $fillable = [
        'name',
        'key_prefix',
        'key_hash',
        'scopes',
        'rate_limit_per_minute',
        'last_used_at',
        'last_used_ip',
        'revoked_at',
        'created_by',
    ];

    protected $hidden = ['key_hash'];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isActive(): bool
    {
        return $this->revoked_at === null;
    }
}
