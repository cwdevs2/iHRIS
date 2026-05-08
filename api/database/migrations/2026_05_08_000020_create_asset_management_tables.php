<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // ── Asset Categories ─────────────────────────────────────────────────
        Schema::create('asset_categories', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->string('icon', 64)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // ── Assets ───────────────────────────────────────────────────────────
        Schema::create('assets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('asset_tag')->unique()->comment('Internal QR/barcode tag, e.g. AST-0001');
            $table->uuid('category_id')->nullable();
            $table->string('name');
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('serial_number')->nullable();
            $table->date('purchased_at')->nullable();
            $table->decimal('purchase_cost', 15, 4)->nullable();
            $table->string('vendor')->nullable();
            $table->date('warranty_expires_at')->nullable();
            $table->enum('status', ['available', 'assigned', 'under_maintenance', 'lost', 'retired'])
                ->default('available');
            $table->enum('condition', ['new', 'good', 'fair', 'poor', 'damaged'])->default('good');
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('category_id')->references('id')->on('asset_categories')->nullOnDelete();
            $table->index(['status']);
            $table->index(['category_id']);
        });

        // ── Asset Assignments (history of who held what) ─────────────────────
        Schema::create('asset_assignments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('asset_id');
            $table->uuid('employee_id');
            $table->uuid('assigned_by');
            $table->date('assigned_on');
            $table->date('returned_on')->nullable();
            $table->uuid('returned_to')->nullable();
            $table->enum('return_condition', ['new', 'good', 'fair', 'poor', 'damaged'])->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('asset_id')->references('id')->on('assets')->cascadeOnDelete();
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('assigned_by')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('returned_to')->references('id')->on('users')->nullOnDelete();
            $table->index(['asset_id', 'returned_on'], 'idx_asset_active_assignment');
        });

        // ── Asset Maintenance Logs ───────────────────────────────────────────
        Schema::create('asset_maintenance_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('asset_id');
            $table->uuid('logged_by');
            $table->enum('type', ['inspection', 'repair', 'upgrade', 'cleaning', 'other'])
                ->default('inspection');
            $table->date('performed_on');
            $table->date('next_due_on')->nullable();
            $table->decimal('cost', 15, 4)->default(0);
            $table->string('vendor')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('asset_id')->references('id')->on('assets')->cascadeOnDelete();
            $table->foreign('logged_by')->references('id')->on('users')->cascadeOnDelete();
            $table->index('next_due_on');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_maintenance_logs');
        Schema::dropIfExists('asset_assignments');
        Schema::dropIfExists('assets');
        Schema::dropIfExists('asset_categories');
    }
};
