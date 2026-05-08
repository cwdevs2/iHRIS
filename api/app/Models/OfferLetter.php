<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class OfferLetter extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'applicant_id',
        'job_posting_id',
        'position_id',
        'department_id',
        'generated_by',
        'offered_salary',
        'proposed_start_date',
        'expires_at',
        'status',
        'terms',
        'decline_reason',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'offered_salary'      => 'decimal:4',
            'proposed_start_date' => 'date',
            'expires_at'          => 'datetime',
            'responded_at'        => 'datetime',
        ];
    }

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(Applicant::class);
    }

    public function jobPosting(): BelongsTo
    {
        return $this->belongsTo(JobPosting::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
