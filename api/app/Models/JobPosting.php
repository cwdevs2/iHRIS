<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobPosting extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'job_requisition_id',
        'title',
        'description',
        'requirements',
        'responsibilities',
        'location',
        'employment_type',
        'salary_min',
        'salary_max',
        'show_salary',
        'status',
        'published_at',
        'closes_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'salary_min'   => 'decimal:4',
            'salary_max'   => 'decimal:4',
            'show_salary'  => 'boolean',
            'published_at' => 'datetime',
            'closes_at'    => 'datetime',
        ];
    }

    public function requisition(): BelongsTo
    {
        return $this->belongsTo(JobRequisition::class, 'job_requisition_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function applicants(): HasMany
    {
        return $this->hasMany(Applicant::class);
    }

    public function offerLetters(): HasMany
    {
        return $this->hasMany(OfferLetter::class);
    }
}
