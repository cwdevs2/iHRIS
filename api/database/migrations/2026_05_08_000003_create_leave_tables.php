<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_types', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('code', 30)->unique(); // vl|sl|emergency|maternity|paternity|solo_parent|sil|custom
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('default_credits')->default(0); // 0 = unlimited / non-accruing
            $table->boolean('requires_attachment')->default(false);
            $table->boolean('is_paid')->default(true);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_system')->default(false); // system types cannot be deleted
            $table->timestamps();
        });

        Schema::create('leave_balances', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->uuid('leave_type_id');
            $table->unsignedSmallInteger('year');
            $table->decimal('credits', 7, 2)->default(0);
            $table->decimal('used', 7, 2)->default(0);
            $table->decimal('pending', 7, 2)->default(0); // leaves in pending approval
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('leave_type_id')->references('id')->on('leave_types')->cascadeOnDelete();
            $table->unique(['employee_id', 'leave_type_id', 'year']);
        });

        Schema::create('leave_requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->uuid('leave_type_id');
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('total_days', 5, 1); // supports half days
            $table->string('reason');
            $table->string('attachment_path')->nullable();
            $table->string('status')->default('pending'); // pending|approved|rejected|cancelled
            $table->unsignedTinyInteger('current_approver_level')->default(1);
            $table->json('approvals')->nullable(); // [{level, approver_id, status, note, decided_at}]
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('leave_type_id')->references('id')->on('leave_types');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('leave_balances');
        Schema::dropIfExists('leave_types');
    }
};
