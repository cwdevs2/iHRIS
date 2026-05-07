<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayslipItem extends Model
{
    use HasUuid;

    public const EARNING_CATEGORIES = [
        'earning_basic',
        'earning_overtime',
        'earning_holiday',
        'earning_night_diff',
        'earning_allowance',
        'earning_bonus',
        'earning_thirteenth_month',
        'earning_other',
    ];

    public const DEDUCTION_CATEGORIES = [
        'deduction_statutory',
        'deduction_loan',
        'deduction_other',
    ];

    protected $fillable = [
        'payslip_id',
        'category',
        'code',
        'label',
        'quantity',
        'rate',
        'amount',
        'is_taxable',
        'meta',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'rate' => 'decimal:4',
            'amount' => 'decimal:4',
            'is_taxable' => 'boolean',
            'meta' => 'array',
        ];
    }

    public function payslip(): BelongsTo
    {
        return $this->belongsTo(Payslip::class);
    }

    public function isEarning(): bool
    {
        return in_array($this->category, self::EARNING_CATEGORIES, true);
    }

    public function isDeduction(): bool
    {
        return in_array($this->category, self::DEDUCTION_CATEGORIES, true);
    }
}
