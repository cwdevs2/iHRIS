<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileUpdateRequest extends Model
{
    use HasUuid;

    protected $table = 'profile_update_requests';

    protected $fillable = [
        'employee_id',
        'requested_changes',
        'status',
        'reviewed_by',
        'reviewer_note',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'requested_changes' => 'array',
            'reviewed_at'       => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
