<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BIR withholding tax brackets — TRAIN Law 2023 graduated table.
 * Annualised compensation is matched against [annual_min, annual_max);
 * tax = base_tax + (annual_excess_over_min * marginal_rate).
 *
 * Computation flow used by the engine:
 *   1. Project payroll-period taxable income to an annual figure (× pay_periods_per_year).
 *   2. Look up the bracket where annual_min ≤ projected < annual_max.
 *   3. Tax = base_tax + (projected − annual_min) × marginal_rate.
 *   4. Divide annual tax by pay_periods_per_year to get the period withholding.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('bir_tax_brackets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('effective_year');
            $table->decimal('annual_min', 15, 4);            // floor (inclusive)
            $table->decimal('annual_max', 15, 4)->nullable();// ceiling (exclusive); NULL = top open bracket
            $table->decimal('base_tax', 15, 4)->default(0);  // pre-computed tax at annual_min
            $table->decimal('marginal_rate', 5, 4);          // e.g. 0.1500 for 15%
            $table->timestamps();

            $table->index(['effective_year', 'annual_min']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bir_tax_brackets');
    }
};
