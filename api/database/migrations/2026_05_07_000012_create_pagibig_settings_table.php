<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pag-IBIG (HDMF) contribution rules.
 * Two-tier rate: 1% if ≤ low_salary_threshold, else 2%. Capped at max_employee_share/month.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('pagibig_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('effective_year')->unique();
            $table->decimal('low_salary_threshold', 15, 4)->default(1500);
            $table->decimal('low_rate', 5, 4)->default(0.01);   // 1% for ≤ threshold
            $table->decimal('high_rate', 5, 4)->default(0.02);  // 2% for > threshold
            $table->decimal('max_employee_share', 15, 4)->default(100);
            $table->decimal('employer_rate', 5, 4)->default(0.02);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagibig_settings');
    }
};
