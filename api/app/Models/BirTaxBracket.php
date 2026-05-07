<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class BirTaxBracket extends Model
{
    use HasUuid;

    protected $table = 'bir_tax_brackets';

    protected $fillable = [
        'effective_year',
        'annual_min',
        'annual_max',
        'base_tax',
        'marginal_rate',
    ];

    protected function casts(): array
    {
        return [
            'annual_min' => 'decimal:4',
            'annual_max' => 'decimal:4',
            'base_tax' => 'decimal:4',
            'marginal_rate' => 'decimal:4',
        ];
    }
}
