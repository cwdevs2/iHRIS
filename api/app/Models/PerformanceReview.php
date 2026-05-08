<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PerformanceReview extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'cycle_id',
        'employee_id',
        'reviewer_id',
        'review_type',
        'status',
        'overall_score',
        'strengths',
        'areas_for_improvement',
        'development_plan',
        'employee_comments',
        'is_anonymous',
        'submitted_at',
        'acknowledged_at',
    ];

    protected function casts(): array
    {
        return [
            'overall_score'    => 'decimal:2',
            'is_anonymous'     => 'boolean',
            'submitted_at'     => 'datetime',
            'acknowledged_at'  => 'datetime',
        ];
    }

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(PerformanceReviewCycle::class, 'cycle_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function scores(): HasMany
    {
        return $this->hasMany(PerformanceReviewScore::class, 'review_id');
    }
}
