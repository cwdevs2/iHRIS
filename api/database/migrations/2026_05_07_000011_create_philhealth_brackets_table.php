<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PhilHealth premium schedule. From 2024 onward this is computed as a fixed
 * percentage of monthly basic salary, with a floor and ceiling. Stored as a
 * year-keyed table so historical periods compute against their own rate.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('philhealth_brackets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('effective_year')->unique();
            $table->decimal('rate', 5, 4);        // e.g. 0.0500 for 5%
            $table->decimal('salary_floor', 15, 4);
            $table->decimal('salary_ceiling', 15, 4);
            $table->decimal('employee_share_pct', 5, 4);  // typically 0.5 of total rate
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('philhealth_brackets');
    }
};
