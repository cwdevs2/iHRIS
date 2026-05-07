<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Payroll runs — a single execution of payroll computation against a period.
 *
 * Lifecycle: draft → finalized (locked) → paid → archived.
 * A `canceled` state is also allowed for drafts that should never have run.
 *
 * **Once finalized, the row is functionally immutable** (per HRIS_MASTER §B.1):
 * corrections happen as adjustments in the next period, not by mutating this run.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('payroll_period_id');
            $table->string('reference_number')->unique();              // e.g. PR-202605-001
            $table->enum('scope', ['company', 'department', 'custom'])->default('company');
            $table->json('scope_filters')->nullable();                 // {"department_ids": ["..."], "employee_ids": ["..."]}
            $table->enum('status', ['draft', 'finalized', 'paid', 'canceled'])->default('draft');

            // Roll-up totals — denormalised for fast list rendering
            $table->decimal('total_gross', 15, 4)->default(0);
            $table->decimal('total_deductions', 15, 4)->default(0);
            $table->decimal('total_net', 15, 4)->default(0);
            $table->decimal('total_employer_cost', 15, 4)->default(0); // gross + employer SSS/PHIC/HDMF/EC
            $table->integer('headcount')->default(0);

            $table->uuid('generated_by_id')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->uuid('finalized_by_id')->nullable();
            $table->timestamp('finalized_at')->nullable();

            $table->json('computation_snapshot')->nullable();          // statutory tables used (year, hashes)
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('payroll_period_id')->references('id')->on('payroll_periods')->cascadeOnDelete();
            $table->foreign('generated_by_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('finalized_by_id')->references('id')->on('users')->nullOnDelete();

            $table->index('status');
            $table->index('generated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_runs');
    }
};
