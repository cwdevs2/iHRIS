<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PerformanceReviewCycle extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $table = 'performance_review_cycles';

    protected $fillable = [
        'name',
        'type',
        'period_start',
        'period_end',
        'self_assessment_due',
        'peer_review_due',
        'manager_review_due',
        'status',
        'enable_self_assessment',
        'enable_peer_review',
        'peer_nomination_limit',
        'instructions',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'period_start'           => 'date',
            'period_end'             => 'date',
            'self_assessment_due'    => 'date',
            'peer_review_due'        => 'date',
            'manager_review_due'     => 'date',
            'enable_self_assessment' => 'boolean',
            'enable_peer_review'     => 'boolean',
            'peer_nomination_limit'  => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function criteria(): HasMany
    {
        return $this->hasMany(PerformanceReviewCriteria::class, 'cycle_id')->orderBy('sort_order');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(PerformanceReview::class, 'cycle_id');
    }

    public function goals(): HasMany
    {
        return $this->hasMany(PerformanceGoal::class, 'cycle_id');
    }
}
