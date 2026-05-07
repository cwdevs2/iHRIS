<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PayrollRun extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'payroll_period_id',
        'reference_number',
        'scope',
        'scope_filters',
        'status',
        'total_gross',
        'total_deductions',
        'total_net',
        'total_employer_cost',
        'headcount',
        'generated_by_id',
        'generated_at',
        'finalized_by_id',
        'finalized_at',
        'computation_snapshot',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'scope_filters' => 'array',
            'total_gross' => 'decimal:4',
            'total_deductions' => 'decimal:4',
            'total_net' => 'decimal:4',
            'total_employer_cost' => 'decimal:4',
            'generated_at' => 'datetime',
            'finalized_at' => 'datetime',
            'computation_snapshot' => 'array',
        ];
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class, 'payroll_period_id');
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by_id');
    }

    public function finalizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by_id');
    }

    public function isLocked(): bool
    {
        return in_array($this->status, ['finalized', 'paid'], true);
    }
}
