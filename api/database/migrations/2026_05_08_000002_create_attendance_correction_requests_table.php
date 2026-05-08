<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_correction_requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->uuid('attendance_log_id')->nullable(); // null = no log yet for that date
            $table->date('work_date');
            $table->time('requested_clock_in')->nullable();
            $table->time('requested_clock_out')->nullable();
            $table->string('reason');
            $table->string('status')->default('pending'); // pending|approved|rejected
            $table->uuid('reviewed_by')->nullable();
            $table->text('reviewer_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('attendance_log_id')->references('id')->on('attendance_logs')->nullOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_correction_requests');
    }
};
