<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Integrations;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\IntegrationLog;
use App\Support\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Inbound webhook receiver for biometric attendance devices.
 *
 * VENDOR ADAPTERS (NOT YET IMPLEMENTED):
 *   - ZKTeco (push protocol via /iclock endpoint)
 *   - Suprema BioStar (REST push)
 *   - HikVision ISAPI
 *
 * The default handler accepts a vendor-neutral payload shape:
 *   {
 *     "device_id": "front-door-01",
 *     "events": [
 *       { "employee_number": "EMP-0001", "scan_at": "2026-05-08T08:02:11+08:00", "type": "in" },
 *       { "employee_number": "EMP-0001", "scan_at": "2026-05-08T17:30:42+08:00", "type": "out" }
 *     ]
 *   }
 *
 * Real vendor adapters should normalize their device-native payloads into this
 * shape before delegating to {@see ingest()}.
 *
 * Authentication: requires a valid API key via X-Api-Key header. The key must
 * carry the "attendance:write" scope.
 */
class BiometricWebhookController extends Controller
{
    /** POST /integrations/biometric/events */
    public function ingest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_id' => ['required', 'string', 'max:128'],
            'events' => ['required', 'array', 'min:1', 'max:200'],
            'events.*.employee_number' => ['required', 'string'],
            'events.*.scan_at' => ['required', 'date'],
            'events.*.type' => ['required', 'string', 'in:in,out'],
        ]);

        $accepted = 0;
        $skipped = 0;
        $errors = [];

        foreach ($data['events'] as $event) {
            $employee = Employee::query()
                ->where('employee_number', $event['employee_number'])
                ->first();

            if ($employee === null) {
                $skipped++;
                $errors[] = "Unknown employee_number: {$event['employee_number']}";
                continue;
            }

            $scanAt = Carbon::parse($event['scan_at']);
            $workDate = $scanAt->copy()->setTimezone(config('app.timezone', 'Asia/Manila'))->toDateString();

            // Idempotency: find an existing log for this employee + date, then
            // upsert clock_in_at or clock_out_at depending on event type.
            $log = AttendanceLog::firstOrNew([
                'employee_id' => $employee->id,
                'work_date' => $workDate,
            ]);

            if ($event['type'] === 'in' && $log->clock_in_at === null) {
                $log->clock_in_at = $scanAt;
                $log->source = 'biometric';
                $log->save();
                $accepted++;
            } elseif ($event['type'] === 'out' && $log->clock_out_at === null) {
                $log->clock_out_at = $scanAt;
                $log->source = 'biometric';
                $log->save();
                $accepted++;
            } else {
                $skipped++;
            }
        }

        // Bookkeeping log — supplements the per-request log written by middleware.
        IntegrationLog::create([
            'integration' => 'biometric',
            'direction' => 'inbound',
            'endpoint' => 'integrations/biometric/events',
            'status_code' => 200,
            'request_payload' => ['device_id' => $data['device_id'], 'event_count' => count($data['events'])],
            'response_payload' => compact('accepted', 'skipped'),
            'api_key_id' => $request->attributes->get('api_key')?->id,
            'source_ip' => $request->ip(),
        ]);

        return ApiResponse::success([
            'accepted' => $accepted,
            'skipped' => $skipped,
            'errors' => $errors,
        ]);
    }
}
