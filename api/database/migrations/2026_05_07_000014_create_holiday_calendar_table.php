<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Philippine holiday calendar — used by the payroll engine to compute holiday pay.
 * Two PH classifications are honoured:
 *   - regular            → 100% pay even if not worked; +100% premium when worked
 *   - special_non_working→ +30% premium when worked; no pay if not worked (no-work-no-pay)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('holiday_calendar', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->date('holiday_date');
            $table->string('name');
            $table->enum('type', ['regular', 'special_non_working', 'special_working'])
                ->default('regular');
            $table->boolean('is_recurring')->default(false); // movable feast = false; fixed-date = true
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['holiday_date', 'name']);
            $table->index('holiday_date');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('holiday_calendar');
    }
};
