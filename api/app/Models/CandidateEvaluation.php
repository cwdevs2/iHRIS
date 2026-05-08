<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CandidateEvaluation extends Model
{
    use HasUuid;

    protected $fillable = [
        'applicant_id',
        'evaluated_by',
        'stage',
        'overall_score',
        'recommendation',
        'strengths',
        'concerns',
        'criteria_scores',
    ];

    protected function casts(): array
    {
        return [
            'overall_score'   => 'integer',
            'criteria_scores' => 'array',
        ];
    }

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(Applicant::class);
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by');
    }
}
