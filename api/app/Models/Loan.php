<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Loan extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'employee_id',
        'type',
        'reference_number',
        'principal',
        'interest_rate',
        'terms_months',
        'monthly_amortization',
        'outstanding_balance',
        'start_date',
        'end_date',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'principal' => 'decimal:4',
            'interest_rate' => 'decimal:4',
            'monthly_amortization' => 'decimal:4',
            'outstanding_balance' => 'decimal:4',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(LoanPayment::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && (float) $this->outstanding_balance > 0.0;
    }
}
