<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeaveType extends Model
{
    use HasUuid;

    protected $fillable = [
        'code',
        'name',
        'description',
        'default_credits',
        'requires_attachment',
        'is_paid',
        'is_active',
        'is_system',
    ];

    protected function casts(): array
    {
        return [
            'requires_attachment' => 'boolean',
            'is_paid'             => 'boolean',
            'is_active'           => 'boolean',
            'is_system'           => 'boolean',
        ];
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveBalances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }
}
