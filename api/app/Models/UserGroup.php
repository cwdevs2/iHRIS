<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class UserGroup extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'type',
        'is_active',
        'created_by',
        'director_id',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    // ── Auto-slug ──────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (UserGroup $group): void {
            if (empty($group->slug)) {
                $group->slug = Str::slug($group->name);
            }
        });
    }

    // ── Relationships ──────────────────────────────────────────────────────────

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The designated director / admin of this group.
     * The director can manage group members without needing the global
     * hr.user_groups.manage_members permission.
     */
    public function director(): BelongsTo
    {
        return $this->belongsTo(User::class, 'director_id');
    }

    /**
     * Departments this group is scoped to manage.
     * Empty = no departments assigned yet (not "all departments").
     */
    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(
            Department::class,
            'user_group_departments',
            'user_group_id',
            'department_id',
        );
    }

    /**
     * Users who are members of this group.
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'user_group_members',
            'user_group_id',
            'user_id',
        )->withTimestamps()->withPivot('added_by');
    }
}
