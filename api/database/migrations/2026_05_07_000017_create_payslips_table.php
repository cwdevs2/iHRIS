<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Payslips — one row per (payroll_run × employee). The summary totals here are
 * always derivable from payslip_items, but kept denormalised for performance.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('payslips', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('payroll_run_id');
            $table->uuid('employee_id');

            // Compensation snapshot at run time — preserved even if the employee record changes later
            $table->decimal('basic_salary', 15, 4)->default(0);          // employee.basic_salary captured at run time
            $table->decimal('daily_rate', 15, 4)->default(0);
            $table->decimal('hourly_rate', 15, 4)->default(0);
            $table->enum('pay_frequency', ['monthly', 'semi_monthly', 'weekly', 'daily'])
                ->default('semi_monthly');

            // Hours / day breakdowns used by the engine — informational on the payslip
            $table->decimal('regular_hours', 8, 2)->default(0);
            $table->decimal('overtime_hours', 8, 2)->default(0);
            $table->decimal('night_diff_hours', 8, 2)->default(0);
            $table->decimal('regular_holiday_hours', 8, 2)->default(0);
            $table->decimal('special_holiday_hours', 8, 2)->default(0);
            $table->decimal('rest_day_hours', 8, 2)->default(0);
            $table->decimal('absent_days', 8, 2)->default(0);
            $table->decimal('late_minutes', 10, 2)->default(0);
            $table->decimal('undertime_minutes', 10, 2)->default(0);

            // Roll-up totals
            $table->decimal('gross_earnings', 15, 4)->default(0);        // sum of all earning items
            $table->decimal('total_deductions', 15, 4)->default(0);      // sum of all deduction items
            $table->decimal('taxable_income', 15, 4)->default(0);        // gross_earnings − non-taxable items
            $table->decimal('net_pay', 15, 4)->default(0);

            // Statutory contributions — broken out for compliance reports
            $table->decimal('sss_employee', 15, 4)->default(0);
            $table->decimal('sss_employer', 15, 4)->default(0);
            $table->decimal('sss_ec_employer', 15, 4)->default(0);
            $table->decimal('philhealth_employee', 15, 4)->default(0);
            $table->decimal('philhealth_employer', 15, 4)->default(0);
            $table->decimal('pagibig_employee', 15, 4)->default(0);
            $table->decimal('pagibig_employer', 15, 4)->default(0);
            $table->decimal('withholding_tax', 15, 4)->default(0);

            $table->enum('status', ['draft', 'finalized', 'paid'])->default('draft');
            $table->timestamp('generated_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('payroll_run_id')->references('id')->on('payroll_runs')->cascadeOnDelete();
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();

            $table->unique(['payroll_run_id', 'employee_id']);
            $table->index('employee_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payslips');
    }
};
