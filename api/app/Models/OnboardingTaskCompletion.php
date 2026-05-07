<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnboardingTaskCompletion extends Model
{
    use HasUuid;

    protected $table = 'onboarding_task_completions';

    protected $fillable = [
        'assignment_id',
        'task_id',
        'completed_by',
        'completed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return ['completed_at' => 'datetime'];
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(OnboardingAssignment::class, 'assignment_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(OnboardingTask::class, 'task_id');
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
