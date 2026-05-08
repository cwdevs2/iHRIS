<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveBalance extends Model
{
    use HasUuid;

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'year',
        'credits',
        'used',
        'pending',
    ];

    protected function casts(): array
    {
        return [
            'credits' => 'decimal:2',
            'used'    => 'decimal:2',
            'pending' => 'decimal:2',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    /** Available = credits - used - pending */
    public function getAvailableAttribute(): float
    {
        return max(0, (float) $this->credits - (float) $this->used - (float) $this->pending);
    }
}
