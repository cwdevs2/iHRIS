<?php

declare(strict_types=1);

namespace App\Services\Integrations;

use App\Models\WebhookDelivery;
use App\Models\WebhookSubscription;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WebhookService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function createSubscription(array $data): WebhookSubscription
    {
        $subscription = WebhookSubscription::create([
            'name' => $data['name'],
            'target_url' => $data['target_url'],
            'signing_secret' => 'whsec_' . Str::random(40),
            'events' => $data['events'],
            'is_active' => $data['is_active'] ?? true,
            'max_retries' => $data['max_retries'] ?? 3,
            'created_by' => Auth::id(),
        ]);

        $this->audit->log('integrations.webhook.created', $subscription, after: ['name' => $subscription->name, 'events' => $subscription->events]);
        return $subscription;
    }

    public function deleteSubscription(WebhookSubscription $subscription): void
    {
        $this->audit->log('integrations.webhook.deleted', $subscription, before: ['name' => $subscription->name]);
        $subscription->delete();
    }

    /**
     * Dispatch an event payload to all matching subscriptions.
     *
     * Synchronous for now; in production this should be moved to a queued job
     * (`dispatch(new WebhookDispatchJob($subscription, ...))`) so slow receivers
     * don't block the request that emitted the event.
     */
    public function dispatch(string $event, array $payload): void
    {
        $subscriptions = WebhookSubscription::where('is_active', true)
            ->whereJsonContains('events', $event)
            ->get();

        foreach ($subscriptions as $subscription) {
            $this->sendOne($subscription, $event, $payload);
        }
    }

    private function sendOne(WebhookSubscription $subscription, string $event, array $payload): WebhookDelivery
    {
        $body = json_encode([
            'event' => $event,
            'sent_at' => now()->toIso8601String(),
            'data' => $payload,
        ], JSON_THROW_ON_ERROR);

        $signature = hash_hmac('sha256', $body, $subscription->signing_secret);

        $delivery = WebhookDelivery::create([
            'subscription_id' => $subscription->id,
            'event_name' => $event,
            'payload' => $payload,
            'attempts' => 1,
        ]);

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-iHRIS-Event' => $event,
                    'X-iHRIS-Signature' => $signature,
                    'X-iHRIS-Delivery-Id' => $delivery->id,
                ])
                ->withBody($body, 'application/json')
                ->post($subscription->target_url);

            $delivery->update([
                'response_status' => $response->status(),
                'response_body' => Str::limit($response->body(), 2048),
                'delivered_at' => $response->successful() ? now() : null,
                'failed_at' => $response->successful() ? null : now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('webhook dispatch failed', [
                'subscription_id' => $subscription->id,
                'event' => $event,
                'error' => $e->getMessage(),
            ]);

            $delivery->update([
                'response_body' => Str::limit($e->getMessage(), 2048),
                'failed_at' => now(),
            ]);
        }

        return $delivery->fresh();
    }
}
