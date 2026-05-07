<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * GET /api/v1/audit-logs
     *
     * Query params:
     *   actor_id    – filter by actor UUID
     *   action      – partial match on action string
     *   target_type – exact match (e.g. "App\Models\Employee")
     *   date_from   – ISO 8601 start date (inclusive)
     *   date_to     – ISO 8601 end date (inclusive)
     *   per_page    – default 25, max 100
     *   page        – default 1
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('actor:id,first_name,last_name,email')
            ->orderBy('created_at', 'desc');

        if ($actorId = $request->query('actor_id')) {
            $query->where('actor_id', $actorId);
        }

        if ($action = $request->query('action')) {
            $query->where('action', 'like', "%{$action}%");
        }

        if ($targetType = $request->query('target_type')) {
            $query->where('target_type', $targetType);
        }

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $perPage = min((int) ($request->query('per_page', 25)), 100);
        $paginator = $query->paginate($perPage);

        return ApiResponse::success([
            'audit_logs' => $paginator->map(fn (AuditLog $log) => [
                'id'          => $log->id,
                'actor_id'    => $log->actor_id,
                'actor_email' => $log->actor_email,
                'actor_name'  => $log->actor
                    ? trim("{$log->actor->first_name} {$log->actor->last_name}")
                    : null,
                'action'      => $log->action,
                'target_type' => $log->target_type,
                'target_id'   => $log->target_id,
                'before'      => $log->before,
                'after'       => $log->after,
                'ip_address'  => $log->ip_address,
                'user_agent'  => $log->user_agent,
                'metadata'    => $log->metadata,
                'created_at'  => $log->created_at?->toIso8601String(),
            ]),
            'pagination' => [
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }
}
