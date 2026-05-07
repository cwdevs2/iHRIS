<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Onboarding checklist templates
        Schema::create('onboarding_checklists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        // Items / tasks within a template
        Schema::create('onboarding_tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('checklist_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_required')->default(true);
            $table->string('assigned_role')->nullable()->comment('Role name that is responsible for this task');
            $table->unsignedSmallInteger('due_days')->nullable()->comment('Days after hire date when task is due');
            $table->timestamps();

            $table->foreign('checklist_id')->references('id')->on('onboarding_checklists')->cascadeOnDelete();
            $table->index(['checklist_id', 'sort_order']);
        });

        // Employee onboarding assignments
        Schema::create('onboarding_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->uuid('checklist_id');
            $table->uuid('assigned_by')->nullable();
            $table->date('start_date')->nullable();
            $table->enum('status', ['not_started', 'in_progress', 'completed', 'cancelled'])->default('not_started');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('checklist_id')->references('id')->on('onboarding_checklists');
            $table->foreign('assigned_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['employee_id', 'status']);
        });

        // Per-task completion status for an assignment
        Schema::create('onboarding_task_completions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('assignment_id');
            $table->uuid('task_id');
            $table->uuid('completed_by')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('assignment_id')->references('id')->on('onboarding_assignments')->cascadeOnDelete();
            $table->foreign('task_id')->references('id')->on('onboarding_tasks')->cascadeOnDelete();
            $table->foreign('completed_by')->references('id')->on('users')->nullOnDelete();
            $table->unique(['assignment_id', 'task_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('onboarding_task_completions');
        Schema::dropIfExists('onboarding_assignments');
        Schema::dropIfExists('onboarding_tasks');
        Schema::dropIfExists('onboarding_checklists');
    }
};
