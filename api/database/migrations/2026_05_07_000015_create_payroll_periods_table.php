<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Payroll periods — recurring or ad-hoc time windows for which payroll is generated.
 * A period is *templated* (e.g. "May 1–15, 2026"); each generated execution is a payroll_run.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');                                      // "May 1-15, 2026 (1st cut)"
            $table->enum('frequency', ['monthly', 'semi_monthly', 'weekly', 'bi_weekly'])
                ->default('semi_monthly');
            $table->date('period_start');
            $table->date('period_end');
            $table->date('pay_date')->nullable();                        // expected payout date
            $table->decimal('working_days', 6, 2)->default(0);           // working-day count for proration
            $table->enum('status', ['open', 'processing', 'closed'])->default('open');
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['period_start', 'period_end', 'frequency']);
            $table->index('status');
            $table->index('period_start');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_periods');
    }
};
