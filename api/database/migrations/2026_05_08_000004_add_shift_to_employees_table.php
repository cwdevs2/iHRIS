<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->string('shift_type')->nullable()->default('day')->after('pay_frequency'); // day|evening|night|custom
            $table->time('shift_start')->nullable()->after('shift_type');   // e.g. 08:00:00
            $table->time('shift_end')->nullable()->after('shift_start');    // e.g. 17:00:00
            $table->json('work_days')->nullable()->after('shift_end');      // ["mon","tue","wed","thu","fri"]
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->dropColumn(['shift_type', 'shift_start', 'shift_end', 'work_days']);
        });
    }
};
