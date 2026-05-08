<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // ── Performance Review Cycles ────────────────────────────────────────
        Schema::create('performance_review_cycles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->enum('type', ['quarterly', 'semi_annual', 'annual', 'probationary', 'custom'])->default('annual');
            $table->date('period_start');
            $table->date('period_end');
            $table->date('self_assessment_due')->nullable();
            $table->date('peer_review_due')->nullable();
            $table->date('manager_review_due')->nullable();
            $table->enum('status', ['draft', 'active', 'completed', 'archived'])->default('draft');
            $table->boolean('enable_self_assessment')->default(true);
            $table->boolean('enable_peer_review')->default(false);
            $table->unsignedTinyInteger('peer_nomination_limit')->default(3);
            $table->text('instructions')->nullable();
            $table->uuid('created_by')->comment('users.id');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
        });

        // ── Performance Review Criteria ──────────────────────────────────────
        Schema::create('performance_review_criteria', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('cycle_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('weight', 5, 2)->default(100.00)->comment('Percentage weight; all criteria in a cycle should sum to 100');
            $table->unsignedTinyInteger('max_score')->default(5)->comment('Rating scale max (e.g. 5 for 1-5)');
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('cycle_id')->references('id')->on('performance_review_cycles')->cascadeOnDelete();
        });

        // ── Performance Goals ────────────────────────────────────────────────
        Schema::create('performance_goals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->uuid('cycle_id')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('target_value')->nullable();
            $table->string('actual_value')->nullable();
            $table->enum('unit', ['percentage', 'number', 'currency', 'boolean', 'text'])->default('text');
            $table->decimal('weight', 5, 2)->default(0)->comment('Contribution weight for this goal');
            $table->enum('status', ['draft', 'active', 'achieved', 'partially_achieved', 'missed', 'cancelled'])->default('draft');
            $table->date('due_date')->nullable();
            $table->uuid('created_by')->comment('users.id');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('cycle_id')->references('id')->on('performance_review_cycles')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
        });

        // ── Performance Reviews ──────────────────────────────────────────────
        Schema::create('performance_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('cycle_id');
            $table->uuid('employee_id')->comment('The person being reviewed (reviewee)');
            $table->uuid('reviewer_id')->comment('The person writing the review (users.id)');
            $table->enum('review_type', ['self', 'manager', 'peer'])->default('manager');
            $table->enum('status', ['pending', 'in_progress', 'submitted', 'acknowledged'])->default('pending');
            $table->decimal('overall_score', 5, 2)->nullable()->comment('Computed weighted average');
            $table->text('strengths')->nullable();
            $table->text('areas_for_improvement')->nullable();
            $table->text('development_plan')->nullable();
            $table->text('employee_comments')->nullable()->comment('Reviewee acknowledgment comments');
            $table->boolean('is_anonymous')->default(false)->comment('For peer reviews');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('cycle_id')->references('id')->on('performance_review_cycles')->cascadeOnDelete();
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('reviewer_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['cycle_id', 'employee_id', 'reviewer_id', 'review_type'], 'uniq_review');
        });

        // ── Performance Review Scores (per criterion per review) ─────────────
        Schema::create('performance_review_scores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('review_id');
            $table->uuid('criteria_id');
            $table->decimal('score', 5, 2);
            $table->text('comments')->nullable();
            $table->timestamps();

            $table->foreign('review_id')->references('id')->on('performance_reviews')->cascadeOnDelete();
            $table->foreign('criteria_id')->references('id')->on('performance_review_criteria')->cascadeOnDelete();
            $table->unique(['review_id', 'criteria_id']);
        });

        // ── Peer Review Nominations ──────────────────────────────────────────
        Schema::create('peer_review_nominations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('cycle_id');
            $table->uuid('employee_id')->comment('The reviewee (employees.id)');
            $table->uuid('nominated_reviewer_id')->comment('The nominated peer (employees.id)');
            $table->enum('status', ['pending', 'accepted', 'declined'])->default('pending');
            $table->timestamps();

            $table->foreign('cycle_id')->references('id')->on('performance_review_cycles')->cascadeOnDelete();
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('nominated_reviewer_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->unique(['cycle_id', 'employee_id', 'nominated_reviewer_id'], 'uniq_nomination');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('peer_review_nominations');
        Schema::dropIfExists('performance_review_scores');
        Schema::dropIfExists('performance_reviews');
        Schema::dropIfExists('performance_goals');
        Schema::dropIfExists('performance_review_criteria');
        Schema::dropIfExists('performance_review_cycles');
    }
};
