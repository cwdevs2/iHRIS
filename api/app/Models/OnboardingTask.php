<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OnboardingTask extends Model
{
    use HasUuid;

    protected $fillable = [
        'checklist_id',
        'title',
        'description',
        'sort_order',
        'is_required',
        'assigned_role',
        'due_days',
    ];

    protected function casts(): array
    {
        return [
            'sort_order'  => 'integer',
            'is_required' => 'boolean',
            'due_days'    => 'integer',
        ];
    }

    public function checklist(): BelongsTo
    {
        return $this->belongsTo(OnboardingChecklist::class, 'checklist_id');
    }

    public function completions(): HasMany
    {
        return $this->hasMany(OnboardingTaskCompletion::class, 'task_id');
    }
}
