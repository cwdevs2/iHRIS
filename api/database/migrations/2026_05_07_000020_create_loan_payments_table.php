<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Loan amortisation payments — created when a payroll run deducts a loan instalment.
 * One row per payslip per loan. `balance_after` lets the engine recompute the loan's
 * `outstanding_balance` deterministically without a SUM over all payments each time.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('loan_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('loan_id');
            $table->uuid('payslip_id')->nullable(); // nullable only for manual adjustments
            $table->decimal('amount', 15, 4);
            $table->decimal('principal_portion', 15, 4)->default(0);
            $table->decimal('interest_portion', 15, 4)->default(0);
            $table->decimal('balance_after', 15, 4);
            $table->date('payment_date');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('loan_id')->references('id')->on('loans')->cascadeOnDelete();
            $table->foreign('payslip_id')->references('id')->on('payslips')->nullOnDelete();

            $table->index(['loan_id', 'payment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_payments');
    }
};
