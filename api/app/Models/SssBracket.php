<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class SssBracket extends Model
{
    use HasUuid;

    protected $table = 'sss_contribution_brackets';

    protected $fillable = [
        'effective_year',
        'msc_min',
        'msc_max',
        'employee_share',
        'employer_share',
        'ec_share',
        'total_contribution',
    ];

    protected function casts(): array
    {
        return [
            'msc_min' => 'decimal:4',
            'msc_max' => 'decimal:4',
            'employee_share' => 'decimal:4',
            'employer_share' => 'decimal:4',
            'ec_share' => 'decimal:4',
            'total_contribution' => 'decimal:4',
        ];
    }
}
