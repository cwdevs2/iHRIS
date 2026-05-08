<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Integrations;

use App\Http\Controllers\Controller;
use App\Http\Resources\WebhookSubscriptionResource;
use App\Models\WebhookSubscription;
use App\Services\Integrations\WebhookService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Outbound webhook subscription management. Inbound webhook *receivers*
 * (biometric devices, accounting systems) are stubbed in their own controllers.
 */
class WebhookController extends Controller
{
    /** Catalog of events external systems can subscribe to. */
    private const SUPPORTED_EVENTS = [
        'employee.created',
        'employee.updated',
        'employee.separated',
        'attendance.clock_in',
        'attendance.clock_out',
        'leave.requested',
        'leave.approved',
        'leave.rejected',
        'payroll.run.finalized',
        'payroll.payslip.generated',
    ];

    public function __construct(private readonly WebhookService $webhooks) {}

    public function index(): JsonResponse
    {
        $rows = WebhookSubscription::query()->orderByDesc('created_at')->get();
        return ApiResponse::success([
            'subscriptions' => WebhookSubscriptionResource::collection($rows),
            'supported_events' => self::SUPPORTED_EVENTS,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $subscription = WebhookSubscription::with(['deliveries' => fn ($q) => $q->latest()->limit(50)])
            ->findOrFail($id);

        return ApiResponse::success([
            'subscription' => new WebhookSubscriptionResource($subscription),
            'deliveries' => $subscription->deliveries,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:128'],
            'target_url' => ['required', 'url', 'max:2048'],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['required', 'string', 'in:' . implode(',', self::SUPPORTED_EVENTS)],
            'is_active' => ['nullable', 'boolean'],
            'max_retries' => ['nullable', 'integer', 'min:0', 'max:10'],
        ]);

        $subscription = $this->webhooks->createSubscription($data);

        return ApiResponse::success([
            'subscription' => new WebhookSubscriptionResource($subscription),
            // Return the signing secret ONCE so the caller can configure their receiver.
            'signing_secret' => $subscription->signing_secret,
        ], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $subscription = WebhookSubscription::findOrFail($id);
        $this->webhooks->deleteSubscription($subscription);
        return ApiResponse::success(['deleted' => true]);
    }
}
