<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class PhilhealthBracket extends Model
{
    use HasUuid;

    protected $table = 'philhealth_brackets';

    protected $fillable = [
        'effective_year',
        'rate',
        'salary_floor',
        'salary_ceiling',
        'employee_share_pct',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:4',
            'salary_floor' => 'decimal:4',
            'salary_ceiling' => 'decimal:4',
            'employee_share_pct' => 'decimal:4',
        ];
    }
}
