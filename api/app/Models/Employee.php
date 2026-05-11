<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'employee_number',
        'department_id',
        'position_id',
        'reports_to_id',
        'birth_date',
        'gender',
        'civil_status',
        'nationality',
        'religion',
        'address_line_1',
        'address_line_2',
        'city',
        'province',
        'postal_code',
        'country',
        'sss_number',
        'philhealth_number',
        'pagibig_number',
        'tin',
        'employment_status',
        'date_hired',
        'regularization_date',
        'separation_date',
        'separation_reason',
        'basic_salary',
        'pay_frequency',
        'emergency_contact',
        'shift_type',
        'shift_start',
        'shift_end',
        'work_days',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'date_hired' => 'date',
            'regularization_date' => 'date',
            'separation_date' => 'date',
            'basic_salary' => 'decimal:4',
            'sss_number' => 'encrypted',
            'philhealth_number' => 'encrypted',
            'pagibig_number' => 'encrypted',
            'tin' => 'encrypted',
            'emergency_contact' => 'array',
            'work_days' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reports_to_id');
    }

    public function documents(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EmployeeDocument::class);
    }
}
