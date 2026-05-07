<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable()->unique();
            $table->string('employee_number')->unique();
            $table->uuid('department_id')->nullable();
            $table->uuid('position_id')->nullable();
            $table->uuid('reports_to_id')->nullable();

            $table->date('birth_date')->nullable();
            $table->enum('gender', ['male', 'female', 'other', 'prefer_not_to_say'])->nullable();
            $table->enum('civil_status', ['single', 'married', 'widowed', 'separated', 'divorced'])->nullable();
            $table->string('nationality')->default('Filipino');
            $table->string('religion')->nullable();

            $table->string('address_line_1')->nullable();
            $table->string('address_line_2')->nullable();
            $table->string('city')->nullable();
            $table->string('province')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('country')->default('Philippines');

            // Government IDs (stored encrypted at rest at the model level)
            $table->text('sss_number')->nullable();
            $table->text('philhealth_number')->nullable();
            $table->text('pagibig_number')->nullable();
            $table->text('tin')->nullable();

            $table->enum('employment_status', [
                'regular',
                'probationary',
                'contractual',
                'part_time',
                'project_based',
                'resigned',
                'terminated',
                'on_leave',
            ])->default('probationary');

            $table->date('date_hired')->nullable();
            $table->date('regularization_date')->nullable();
            $table->date('separation_date')->nullable();
            $table->string('separation_reason')->nullable();

            $table->decimal('basic_salary', 15, 4)->default(0);
            $table->enum('pay_frequency', ['monthly', 'semi_monthly', 'weekly', 'daily'])->default('semi_monthly');

            $table->json('emergency_contact')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('department_id')->references('id')->on('departments')->nullOnDelete();
            $table->foreign('position_id')->references('id')->on('positions')->nullOnDelete();
            $table->foreign('reports_to_id')->references('id')->on('employees')->nullOnDelete();

            $table->index('employment_status');
            $table->index('date_hired');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
