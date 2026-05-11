<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_groups', function (Blueprint $table): void {
            $table->uuid('director_id')->nullable()->after('created_by');
            $table->foreign('director_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('user_groups', function (Blueprint $table): void {
            $table->dropForeign(['director_id']);
            $table->dropColumn('director_id');
        });
    }
};
