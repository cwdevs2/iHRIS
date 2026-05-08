<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobRequisition extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'department_id',
        'position_id',
        'requested_by',
        'approved_by',
        'headcount',
        'justification',
        'employment_type',
        'salary_min',
        'salary_max',
        'status',
        'notes',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'headcount'   => 'integer',
            'salary_min'  => 'decimal:4',
            'salary_max'  => 'decimal:4',
            'approved_at' => 'datetime',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function jobPostings(): HasMany
    {
        return $this->hasMany(JobPosting::class);
    }
}
