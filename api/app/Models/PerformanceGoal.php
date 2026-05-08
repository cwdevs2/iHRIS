<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PerformanceGoal extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'employee_id',
        'cycle_id',
        'title',
        'description',
        'target_value',
        'actual_value',
        'unit',
        'weight',
        'status',
        'due_date',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'weight'   => 'decimal:2',
            'due_date' => 'date',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(PerformanceReviewCycle::class, 'cycle_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
