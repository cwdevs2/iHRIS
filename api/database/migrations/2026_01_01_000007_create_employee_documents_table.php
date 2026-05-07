<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('employee_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->uuid('uploaded_by')->nullable()->comment('User who uploaded');

            $table->string('category', 100); // e.g. 'contract', 'id', 'certificate', 'medical', 'other'
            $table->string('title');
            $table->string('description')->nullable();

            // Storage
            $table->string('file_path');          // relative to storage/app
            $table->string('file_name');           // original filename
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size'); // bytes

            // Validity
            $table->date('expires_at')->nullable();
            $table->boolean('is_private')->default(false); // restrict to sensitive-data permission

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();

            $table->index('employee_id');
            $table->index('category');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_documents');
    }
};
