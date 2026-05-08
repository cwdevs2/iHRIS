<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->date('work_date');
            $table->timestamp('clock_in_at')->nullable();
            $table->timestamp('clock_out_at')->nullable();
            $table->string('clock_in_ip', 45)->nullable();
            $table->string('clock_out_ip', 45)->nullable();
            $table->decimal('clock_in_lat', 10, 7)->nullable();
            $table->decimal('clock_in_lng', 10, 7)->nullable();
            $table->decimal('clock_out_lat', 10, 7)->nullable();
            $table->decimal('clock_out_lng', 10, 7)->nullable();
            $table->string('location_type')->default('on_site'); // on_site|remote|field
            $table->decimal('regular_hours', 6, 2)->default(0);
            $table->decimal('overtime_hours', 6, 2)->default(0);
            $table->decimal('late_minutes', 6, 2)->default(0);
            $table->decimal('undertime_minutes', 6, 2)->default(0);
            $table->string('status')->default('present'); // present|late|undertime|absent|on_leave|holiday
            $table->boolean('is_corrected')->default(false);
            $table->string('source')->default('web'); // web|qr|biometric|manual
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->unique(['employee_id', 'work_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
    }
};
