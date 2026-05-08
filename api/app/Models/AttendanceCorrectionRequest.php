<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceCorrectionRequest extends Model
{
    use HasUuid;

    protected $table = 'attendance_correction_requests';

    protected $fillable = [
        'employee_id',
        'attendance_log_id',
        'work_date',
        'requested_clock_in',
        'requested_clock_out',
        'reason',
        'status',
        'reviewed_by',
        'reviewer_note',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'work_date'   => 'date',
            'reviewed_at' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function attendanceLog(): BelongsTo
    {
        return $this->belongsTo(AttendanceLog::class, 'attendance_log_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
