<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Employee loans — SSS salary loan, Pag-IBIG calamity/multi-purpose, company cash advance, etc.
 *
 * Amortisation is auto-applied on payroll generation when status = active and the
 * loan still has `outstanding_balance > 0`. Payments are recorded in loan_payments.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('loans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->enum('type', ['sss', 'pagibig', 'company', 'salary_advance', 'other'])->default('company');
            $table->string('reference_number')->nullable();          // SSS/HDMF reference
            $table->decimal('principal', 15, 4);
            $table->decimal('interest_rate', 5, 4)->default(0);      // annual; 0 for non-interest-bearing
            $table->integer('terms_months')->default(1);
            $table->decimal('monthly_amortization', 15, 4);
            $table->decimal('outstanding_balance', 15, 4);
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['active', 'paid', 'cancelled', 'on_hold'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->index(['employee_id', 'status']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loans');
    }
};
