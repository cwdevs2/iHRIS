<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->decimal('min_salary', 15, 4)->nullable()->after('rank_level');
            $table->decimal('max_salary', 15, 4)->nullable()->after('min_salary');
        });
    }

    public function down(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->dropColumn(['min_salary', 'max_salary']);
        });
    }
};
