<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // ── Job Requisitions ────────────────────────────────────────────────
        Schema::create('job_requisitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('department_id')->nullable();
            $table->uuid('position_id')->nullable();
            $table->uuid('requested_by')->comment('employees.id');
            $table->uuid('approved_by')->nullable()->comment('users.id');
            $table->unsignedTinyInteger('headcount')->default(1);
            $table->text('justification')->nullable();
            $table->enum('employment_type', ['regular', 'probationary', 'contractual', 'part_time', 'project_based'])->default('regular');
            $table->decimal('salary_min', 15, 4)->nullable();
            $table->decimal('salary_max', 15, 4)->nullable();
            $table->enum('status', ['draft', 'pending_approval', 'approved', 'rejected', 'cancelled', 'fulfilled'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('department_id')->references('id')->on('departments')->nullOnDelete();
            $table->foreign('position_id')->references('id')->on('positions')->nullOnDelete();
            $table->foreign('requested_by')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
        });

        // ── Job Postings ────────────────────────────────────────────────────
        Schema::create('job_postings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('job_requisition_id')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('requirements')->nullable();
            $table->text('responsibilities')->nullable();
            $table->string('location')->nullable();
            $table->enum('employment_type', ['regular', 'probationary', 'contractual', 'part_time', 'project_based'])->default('regular');
            $table->decimal('salary_min', 15, 4)->nullable();
            $table->decimal('salary_max', 15, 4)->nullable();
            $table->boolean('show_salary')->default(false);
            $table->enum('status', ['draft', 'published', 'closed', 'archived'])->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('closes_at')->nullable();
            $table->uuid('created_by')->comment('users.id');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('job_requisition_id')->references('id')->on('job_requisitions')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
        });

        // ── Applicants / Candidates ─────────────────────────────────────────
        Schema::create('applicants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('job_posting_id');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('resume_path')->nullable();
            $table->text('cover_letter')->nullable();
            $table->string('source')->nullable()->comment('direct, referral, linkedin, jobstreet, kalibrr, walk_in');
            $table->string('referrer_name')->nullable();
            $table->enum('stage', [
                'applied',
                'screening',
                'interview',
                'evaluation',
                'offer',
                'hired',
                'rejected',
            ])->default('applied');
            $table->enum('status', ['active', 'hired', 'rejected', 'withdrawn'])->default('active');
            $table->text('rejection_reason')->nullable();
            $table->json('metadata')->nullable()->comment('Extra fields from application form');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('job_posting_id')->references('id')->on('job_postings')->cascadeOnDelete();
            $table->index(['job_posting_id', 'stage']);
            $table->index('email');
        });

        // ── Interview Schedules ─────────────────────────────────────────────
        Schema::create('interview_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('applicant_id');
            $table->uuid('scheduled_by')->comment('users.id');
            $table->json('interviewers')->nullable()->comment('Array of user UUIDs');
            $table->timestamp('scheduled_at');
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->enum('type', ['phone_screen', 'online', 'onsite', 'panel', 'technical', 'final'])->default('online');
            $table->string('location')->nullable();
            $table->string('meeting_link')->nullable();
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'])->default('scheduled');
            $table->text('notes')->nullable();
            $table->text('feedback')->nullable();
            $table->timestamps();

            $table->foreign('applicant_id')->references('id')->on('applicants')->cascadeOnDelete();
            $table->foreign('scheduled_by')->references('id')->on('users')->cascadeOnDelete();
        });

        // ── Candidate Evaluations (Scorecards) ──────────────────────────────
        Schema::create('candidate_evaluations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('applicant_id');
            $table->uuid('evaluated_by')->comment('users.id');
            $table->string('stage')->comment('Which stage this evaluation covers');
            $table->unsignedTinyInteger('overall_score')->nullable()->comment('1-10');
            $table->enum('recommendation', ['strong_hire', 'hire', 'hold', 'reject', 'strong_reject'])->nullable();
            $table->text('strengths')->nullable();
            $table->text('concerns')->nullable();
            $table->json('criteria_scores')->nullable()->comment('[{name, weight, score, notes}]');
            $table->timestamps();

            $table->foreign('applicant_id')->references('id')->on('applicants')->cascadeOnDelete();
            $table->foreign('evaluated_by')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['applicant_id', 'evaluated_by', 'stage']);
        });

        // ── Offer Letters ───────────────────────────────────────────────────
        Schema::create('offer_letters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('applicant_id');
            $table->uuid('job_posting_id')->nullable();
            $table->uuid('position_id')->nullable();
            $table->uuid('department_id')->nullable();
            $table->uuid('generated_by')->comment('users.id');
            $table->decimal('offered_salary', 15, 4);
            $table->date('proposed_start_date');
            $table->timestamp('expires_at')->nullable();
            $table->enum('status', ['draft', 'sent', 'accepted', 'declined', 'expired', 'withdrawn'])->default('draft');
            $table->text('terms')->nullable();
            $table->text('decline_reason')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('applicant_id')->references('id')->on('applicants')->cascadeOnDelete();
            $table->foreign('job_posting_id')->references('id')->on('job_postings')->nullOnDelete();
            $table->foreign('position_id')->references('id')->on('positions')->nullOnDelete();
            $table->foreign('department_id')->references('id')->on('departments')->nullOnDelete();
            $table->foreign('generated_by')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offer_letters');
        Schema::dropIfExists('candidate_evaluations');
        Schema::dropIfExists('interview_schedules');
        Schema::dropIfExists('applicants');
        Schema::dropIfExists('job_postings');
        Schema::dropIfExists('job_requisitions');
    }
};
