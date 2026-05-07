<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payslip extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'payroll_run_id',
        'employee_id',
        'basic_salary',
        'daily_rate',
        'hourly_rate',
        'pay_frequency',
        'regular_hours',
        'overtime_hours',
        'night_diff_hours',
        'regular_holiday_hours',
        'special_holiday_hours',
        'rest_day_hours',
        'absent_days',
        'late_minutes',
        'undertime_minutes',
        'gross_earnings',
        'total_deductions',
        'taxable_income',
        'net_pay',
        'sss_employee',
        'sss_employer',
        'sss_ec_employer',
        'philhealth_employee',
        'philhealth_employer',
        'pagibig_employee',
        'pagibig_employer',
        'withholding_tax',
        'status',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'basic_salary' => 'decimal:4',
            'daily_rate' => 'decimal:4',
            'hourly_rate' => 'decimal:4',
            'regular_hours' => 'decimal:2',
            'overtime_hours' => 'decimal:2',
            'night_diff_hours' => 'decimal:2',
            'regular_holiday_hours' => 'decimal:2',
            'special_holiday_hours' => 'decimal:2',
            'rest_day_hours' => 'decimal:2',
            'absent_days' => 'decimal:2',
            'late_minutes' => 'decimal:2',
            'undertime_minutes' => 'decimal:2',
            'gross_earnings' => 'decimal:4',
            'total_deductions' => 'decimal:4',
            'taxable_income' => 'decimal:4',
            'net_pay' => 'decimal:4',
            'sss_employee' => 'decimal:4',
            'sss_employer' => 'decimal:4',
            'sss_ec_employer' => 'decimal:4',
            'philhealth_employee' => 'decimal:4',
            'philhealth_employer' => 'decimal:4',
            'pagibig_employee' => 'decimal:4',
            'pagibig_employer' => 'decimal:4',
            'withholding_tax' => 'decimal:4',
            'generated_at' => 'datetime',
        ];
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class, 'payroll_run_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayslipItem::class)->orderBy('sort_order');
    }

    public function loanPayments(): HasMany
    {
        return $this->hasMany(LoanPayment::class);
    }
}
