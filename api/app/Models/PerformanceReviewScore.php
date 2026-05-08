<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerformanceReviewScore extends Model
{
    use HasUuid;

    protected $table = 'performance_review_scores';

    protected $fillable = [
        'review_id',
        'criteria_id',
        'score',
        'comments',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
        ];
    }

    public function review(): BelongsTo
    {
        return $this->belongsTo(PerformanceReview::class, 'review_id');
    }

    public function criteria(): BelongsTo
    {
        return $this->belongsTo(PerformanceReviewCriteria::class, 'criteria_id');
    }
}
