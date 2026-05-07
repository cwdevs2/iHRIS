<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class PagibigSetting extends Model
{
    use HasUuid;

    protected $table = 'pagibig_settings';

    protected $fillable = [
        'effective_year',
        'low_salary_threshold',
        'low_rate',
        'high_rate',
        'max_employee_share',
        'employer_rate',
    ];

    protected function casts(): array
    {
        return [
            'low_salary_threshold' => 'decimal:4',
            'low_rate' => 'decimal:4',
            'high_rate' => 'decimal:4',
            'max_employee_share' => 'decimal:4',
            'employer_rate' => 'decimal:4',
        ];
    }
}
