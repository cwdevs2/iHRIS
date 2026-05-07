<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Line items inside a payslip — earnings and deductions, fully itemised.
 *
 * `category` controls how the item participates in totals:
 *   - earning_basic / earning_overtime / earning_holiday / earning_night_diff
 *     / earning_allowance / earning_bonus / earning_thirteenth_month
 *     → contribute to gross_earnings; `is_taxable` controls inclusion in taxable_income
 *   - deduction_statutory  → SSS / PhilHealth / Pag-IBIG / withholding tax (system-generated)
 *   - deduction_loan       → loan amortisation (linked to loan_payments)
 *   - deduction_other      → company-defined deductions, advances, fines, etc.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('payslip_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('payslip_id');
            $table->enum('category', [
                'earning_basic',
                'earning_overtime',
                'earning_holiday',
                'earning_night_diff',
                'earning_allowance',
                'earning_bonus',
                'earning_thirteenth_month',
                'earning_other',
                'deduction_statutory',
                'deduction_loan',
                'deduction_other',
            ]);
            $table->string('code', 50);            // SSS_EE, PHIC_EE, HDMF_EE, BIR_TAX, OT_REG, ND, …
            $table->string('label');
            $table->decimal('quantity', 10, 4)->default(1);  // hours, days, units, etc.
            $table->decimal('rate', 15, 4)->default(0);
            $table->decimal('amount', 15, 4);                 // signed-positive; sign comes from category
            $table->boolean('is_taxable')->default(true);     // earnings only; deductions ignore this flag
            $table->json('meta')->nullable();                 // any extra context (formula breakdown, source IDs)
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('payslip_id')->references('id')->on('payslips')->cascadeOnDelete();
            $table->index(['payslip_id', 'category']);
            $table->index('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payslip_items');
    }
};
