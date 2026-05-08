<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    use HasUuid;

    protected $fillable = [
        'employee_id',
        'work_date',
        'clock_in_at',
        'clock_out_at',
        'clock_in_ip',
        'clock_out_ip',
        'clock_in_lat',
        'clock_in_lng',
        'clock_out_lat',
        'clock_out_lng',
        'location_type',
        'regular_hours',
        'overtime_hours',
        'late_minutes',
        'undertime_minutes',
        'status',
        'is_corrected',
        'source',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'work_date'      => 'date',
            'clock_in_at'    => 'datetime',
            'clock_out_at'   => 'datetime',
            'clock_in_lat'   => 'decimal:7',
            'clock_in_lng'   => 'decimal:7',
            'clock_out_lat'  => 'decimal:7',
            'clock_out_lng'  => 'decimal:7',
            'regular_hours'  => 'decimal:2',
            'overtime_hours' => 'decimal:2',
            'late_minutes'   => 'decimal:2',
            'undertime_minutes' => 'decimal:2',
            'is_corrected'   => 'boolean',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
