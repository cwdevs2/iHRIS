<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // ── Compliance Policies (versioned) ──────────────────────────────────
        Schema::create('compliance_policies', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->string('category', 64)->default('general')->comment('e.g. code_of_conduct, data_privacy, labor');
            $table->unsignedSmallInteger('version')->default(1);
            $table->longText('body')->comment('Markdown or rich-text content');
            $table->date('effective_on')->nullable();
            $table->date('expires_on')->nullable();
            $table->boolean('requires_acknowledgment')->default(true);
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->uuid('published_by')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('published_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['category', 'status']);
            $table->index('effective_on');
        });

        // ── Policy Acknowledgments (one per employee per published policy) ──
        Schema::create('policy_acknowledgments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('policy_id');
            $table->uuid('employee_id');
            $table->timestamp('acknowledged_at');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->foreign('policy_id')->references('id')->on('compliance_policies')->cascadeOnDelete();
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->unique(['policy_id', 'employee_id'], 'uniq_policy_ack');
        });

        // ── Regulatory Filing Reminders ──────────────────────────────────────
        Schema::create('regulatory_filings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('agency', 32)->comment('SSS, PhilHealth, Pag-IBIG, BIR, DOLE, etc.');
            $table->string('form_code')->comment('e.g. R-3, RF-1, MCRF, 1601-C');
            $table->string('title');
            $table->date('period_covered_start')->nullable();
            $table->date('period_covered_end')->nullable();
            $table->date('due_on');
            $table->enum('status', ['pending', 'in_progress', 'filed', 'overdue', 'cancelled'])
                ->default('pending');
            $table->date('filed_on')->nullable();
            $table->string('reference_number')->nullable();
            $table->uuid('filed_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('filed_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['agency', 'status']);
            $table->index('due_on');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('regulatory_filings');
        Schema::dropIfExists('policy_acknowledgments');
        Schema::dropIfExists('compliance_policies');
    }
};
