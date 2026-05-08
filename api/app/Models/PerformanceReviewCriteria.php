<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PerformanceReviewCriteria extends Model
{
    use HasUuid;

    protected $table = 'performance_review_criteria';

    protected $fillable = [
        'cycle_id',
        'name',
        'description',
        'weight',
        'max_score',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'weight'     => 'decimal:2',
            'max_score'  => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(PerformanceReviewCycle::class, 'cycle_id');
    }

    public function scores(): HasMany
    {
        return $this->hasMany(PerformanceReviewScore::class, 'criteria_id');
    }
}
