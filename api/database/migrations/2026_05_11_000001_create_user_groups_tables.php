<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // ── User Groups ───────────────────────────────────────────────────────
        Schema::create('user_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 150)->unique();
            $table->string('slug', 120)->unique();
            $table->text('description')->nullable();
            $table->enum('type', ['department_head', 'hr_admin', 'custom'])->default('custom');
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->index('is_active');
            $table->index('type');
        });

        // ── Group ↔ Departments (scope) ───────────────────────────────────────
        Schema::create('user_group_departments', function (Blueprint $table) {
            $table->uuid('user_group_id');
            $table->uuid('department_id');

            $table->primary(['user_group_id', 'department_id']);
            $table->foreign('user_group_id')->references('id')->on('user_groups')->cascadeOnDelete();
            $table->foreign('department_id')->references('id')->on('departments')->cascadeOnDelete();
        });

        // ── Group Members ─────────────────────────────────────────────────────
        Schema::create('user_group_members', function (Blueprint $table) {
            $table->uuid('user_group_id');
            $table->uuid('user_id');
            $table->uuid('added_by')->nullable();
            $table->timestamps();

            $table->primary(['user_group_id', 'user_id']);
            $table->foreign('user_group_id')->references('id')->on('user_groups')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('added_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_group_members');
        Schema::dropIfExists('user_group_departments');
        Schema::dropIfExists('user_groups');
    }
};
