<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PolicyAcknowledgment extends Model
{
    use HasUuid;

    protected $fillable = [
        'policy_id',
        'employee_id',
        'acknowledged_at',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'acknowledged_at' => 'datetime',
        ];
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(CompliancePolicy::class, 'policy_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
