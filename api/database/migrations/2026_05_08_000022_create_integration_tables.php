<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // ── API Keys (for external integrations) ─────────────────────────────
        Schema::create('api_keys', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name')->comment('Human label for the key');
            $table->string('key_prefix', 12)->comment('First 8 chars for display, e.g. "ihr_live_"');
            $table->string('key_hash')->comment('SHA-256 of the full key — original is never stored');
            $table->json('scopes')->nullable()->comment('Allowed actions, e.g. ["attendance:write","payroll:read"]');
            $table->unsignedInteger('rate_limit_per_minute')->default(60);
            $table->timestamp('last_used_at')->nullable();
            $table->string('last_used_ip', 45)->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->uuid('created_by');
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
            $table->unique('key_hash');
        });

        // ── Webhook Subscriptions (outbound) ─────────────────────────────────
        Schema::create('webhook_subscriptions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('target_url', 2048);
            $table->string('signing_secret')->comment('Used to sign payload with HMAC-SHA256');
            $table->json('events')->comment('Which events trigger this webhook, e.g. ["payroll.run.finalized"]');
            $table->boolean('is_active')->default(true);
            $table->unsignedTinyInteger('max_retries')->default(3);
            $table->uuid('created_by');
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
        });

        // ── Webhook Deliveries (audit trail of outbound calls) ───────────────
        Schema::create('webhook_deliveries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('subscription_id');
            $table->string('event_name');
            $table->json('payload');
            $table->unsignedSmallInteger('response_status')->nullable();
            $table->text('response_body')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamps();

            $table->foreign('subscription_id')->references('id')->on('webhook_subscriptions')->cascadeOnDelete();
            $table->index(['subscription_id', 'event_name']);
        });

        // ── Inbound Integration Logs (for biometric, accounting, etc.) ───────
        Schema::create('integration_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('integration', 64)->comment('biometric, accounting, sso, sms, etc.');
            $table->string('direction', 16)->comment('inbound or outbound');
            $table->string('endpoint')->nullable();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->text('error_message')->nullable();
            $table->uuid('api_key_id')->nullable();
            $table->string('source_ip', 45)->nullable();
            $table->timestamps();

            $table->foreign('api_key_id')->references('id')->on('api_keys')->nullOnDelete();
            $table->index(['integration', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_logs');
        Schema::dropIfExists('webhook_deliveries');
        Schema::dropIfExists('webhook_subscriptions');
        Schema::dropIfExists('api_keys');
    }
};
