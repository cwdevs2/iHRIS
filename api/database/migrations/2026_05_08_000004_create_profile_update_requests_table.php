<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_update_requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->json('requested_changes'); // {field: {old, new}}
            $table->string('status')->default('pending'); // pending|approved|rejected
            $table->uuid('reviewed_by')->nullable();
            $table->text('reviewer_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_update_requests');
    }
};
