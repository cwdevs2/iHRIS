<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Applicant extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'job_posting_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'resume_path',
        'cover_letter',
        'source',
        'referrer_name',
        'stage',
        'status',
        'rejection_reason',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class);
    }

    public function interviews(): HasMany
    {
        return $this->hasMany(InterviewSchedule::class);
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(CandidateEvaluation::class);
    }

    public function offerLetters(): HasMany
    {
        return $this->hasMany(OfferLetter::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
