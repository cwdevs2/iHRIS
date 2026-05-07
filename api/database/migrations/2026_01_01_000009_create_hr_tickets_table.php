<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('hr_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('ticket_number', 20)->unique();
            $table->uuid('submitter_id')->comment('User who filed the ticket');
            $table->uuid('assignee_id')->nullable()->comment('HR staff assigned to resolve');
            $table->uuid('employee_id')->nullable()->comment('Employee the ticket is about (if any)');

            $table->string('category', 100); // e.g. 'payroll', 'leave', 'benefits', 'grievance', 'other'
            $table->string('subject');
            $table->text('description');

            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->enum('status', ['open', 'in_progress', 'pending_info', 'resolved', 'closed', 'cancelled'])->default('open');

            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->text('resolution_note')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('submitter_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('assignee_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('employee_id')->references('id')->on('employees')->nullOnDelete();

            $table->index(['status', 'priority']);
            $table->index('submitter_id');
            $table->index('assignee_id');
        });

        Schema::create('hr_ticket_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('ticket_id');
            $table->uuid('author_id');
            $table->text('body');
            $table->boolean('is_internal')->default(false)->comment('Internal notes visible only to HR staff');
            $table->timestamps();

            $table->foreign('ticket_id')->references('id')->on('hr_tickets')->cascadeOnDelete();
            $table->foreign('author_id')->references('id')->on('users')->restrictOnDelete();
            $table->index('ticket_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_ticket_notes');
        Schema::dropIfExists('hr_tickets');
    }
};
