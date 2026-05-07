<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OnboardingAssignment extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'employee_id',
        'checklist_id',
        'assigned_by',
        'start_date',
        'status',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'start_date'   => 'date',
            'completed_at' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(OnboardingChecklist::class, 'checklist_id');
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function taskCompletions(): HasMany
    {
        return $this->hasMany(OnboardingTaskCompletion::class, 'assignment_id');
    }

    /** Computed progress percentage */
    public function getProgressAttribute(): int
    {
        $totalRequired = $this->checklist?->tasks->where('is_required', true)->count() ?? 0;
        if ($totalRequired === 0) return 100;

        $completed = $this->taskCompletions->whereNotNull('completed_at')->count();

        return (int) round(($completed / $totalRequired) * 100);
    }
}
