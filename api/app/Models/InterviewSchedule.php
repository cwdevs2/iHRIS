<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterviewSchedule extends Model
{
    use HasUuid;

    protected $fillable = [
        'applicant_id',
        'scheduled_by',
        'interviewers',
        'scheduled_at',
        'duration_minutes',
        'type',
        'location',
        'meeting_link',
        'status',
        'notes',
        'feedback',
    ];

    protected function casts(): array
    {
        return [
            'interviewers'     => 'array',
            'scheduled_at'     => 'datetime',
            'duration_minutes' => 'integer',
        ];
    }

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(Applicant::class);
    }

    public function scheduler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scheduled_by');
    }
}
