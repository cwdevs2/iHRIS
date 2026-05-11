<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasUuid;
    use Notifiable;
    use SoftDeletes;

    protected $fillable = [
        'employee_id',
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'password',
        'phone',
        'avatar_path',
        'status',
        'mfa_enabled',
        'mfa_secret',
        'mfa_recovery_codes',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
        'mfa_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'mfa_secret' => 'encrypted',
            'mfa_recovery_codes' => 'encrypted:array',
            'mfa_enabled' => 'boolean',
            'last_login_at' => 'datetime',
            'locked_until' => 'datetime',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function employee(): HasOne
    {
        return $this->hasOne(Employee::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles')
            ->withTimestamps()
            ->withPivot('assigned_by');
    }

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(UserGroup::class, 'user_group_members', 'user_id', 'user_group_id')
            ->withTimestamps()
            ->withPivot('added_by');
    }

    public function hasRole(string $name): bool
    {
        return $this->roles->contains(fn (Role $role) => $role->name === $name);
    }

    public function hasAnyRole(array $names): bool
    {
        return $this->roles->whereIn('name', $names)->isNotEmpty();
    }

    public function hasPermission(string $module, string $feature, string $action): bool
    {
        $this->loadMissing('roles.permissions');

        return $this->roles->some(function (Role $role) use ($module, $feature, $action) {
            return $role->permissions->some(
                fn (Permission $p) => $p->module === $module
                    && $p->feature === $feature
                    && $p->action === $action,
            );
        });
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    /**
     * Return the department IDs this user is allowed to manage via their groups.
     * Returns an empty collection when the user has no groups (caller should
     * treat that as "no delegated scope" rather than "all departments").
     */
    public function scopedDepartmentIds(): Collection
    {
        $this->loadMissing('groups.departments');

        return $this->groups
            ->flatMap(fn (UserGroup $g) => $g->departments->pluck('id'))
            ->unique()
            ->values();
    }

    /**
     * Whether this user has at least one department scope via groups.
     * Super-admins / HR admins with global permission bypass this entirely.
     */
    public function hasDepartmentScope(): bool
    {
        return $this->scopedDepartmentIds()->isNotEmpty();
    }
}
