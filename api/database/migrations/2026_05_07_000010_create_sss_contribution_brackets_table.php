<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SSS contribution brackets — looked up against the employee's monthly compensation.
 * Editable via DB admin so the table can be replaced when SSS publishes new schedules
 * without requiring a code deploy (per HRIS_MASTER §4.9 / §6 Compliance Rules).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('sss_contribution_brackets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('effective_year');
            $table->decimal('msc_min', 15, 4);   // Monthly Salary Credit floor for this row
            $table->decimal('msc_max', 15, 4);   // Monthly Salary Credit ceiling (NULL = top-open bracket)
            $table->decimal('employee_share', 15, 4);
            $table->decimal('employer_share', 15, 4);
            $table->decimal('ec_share', 15, 4)->default(0);    // Employees' Compensation (employer-only)
            $table->decimal('total_contribution', 15, 4);
            $table->timestamps();

            $table->index(['effective_year', 'msc_min']);
            $table->index('effective_year');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sss_contribution_brackets');
    }
};
