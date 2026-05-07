<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanPayment extends Model
{
    use HasUuid;

    protected $fillable = [
        'loan_id',
        'payslip_id',
        'amount',
        'principal_portion',
        'interest_portion',
        'balance_after',
        'payment_date',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'principal_portion' => 'decimal:4',
            'interest_portion' => 'decimal:4',
            'balance_after' => 'decimal:4',
            'payment_date' => 'date',
        ];
    }

    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class);
    }

    public function payslip(): BelongsTo
    {
        return $this->belongsTo(Payslip::class);
    }
}
