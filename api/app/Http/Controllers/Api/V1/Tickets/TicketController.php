<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tickets;

use App\Http\Controllers\Controller;
use App\Models\HrTicket;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TicketController extends Controller
{
    private const VALID_TRANSITIONS = [
        'open'         => ['in_progress', 'pending_info', 'cancelled'],
        'in_progress'  => ['pending_info', 'resolved', 'cancelled'],
        'pending_info' => ['in_progress', 'resolved', 'cancelled'],
        'resolved'     => ['closed', 'open'],
        'closed'       => [],
        'cancelled'    => [],
    ];

    public function __construct(private AuditLogger $audit) {}

    /** GET /tickets */
    public function index(Request $request): JsonResponse
    {
        $perPage  = min((int) ($request->input('per_page', 15)), 100);
        $user     = $request->user();
        $isHr     = $user->hasPermissionTo('hr.tickets.manage');

        $tickets = HrTicket::query()
            ->with(['submitter:id,first_name,last_name', 'assignee:id,first_name,last_name'])
            ->withCount('notes')
            ->when(! $isHr, fn (Builder $q) => $q->where('submitter_id', $user->id))
            ->when($request->input('status'),   fn (Builder $q) => $q->where('status', $request->input('status')))
            ->when($request->input('priority'), fn (Builder $q) => $q->where('priority', $request->input('priority')))
            ->when($request->input('category'), fn (Builder $q) => $q->where('category', $request->input('category')))
            ->when($request->input('search'), function (Builder $q) use ($request) {
                $term = '%'.addcslashes($request->input('search'), '%_').'%';
                $q->where(fn (Builder $sub) => $sub
                    ->where('subject', 'like', $term)
                    ->orWhere('ticket_number', 'like', $term),
                );
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success([
            'tickets' => $tickets->items(),
            'pagination' => [
                'total'        => $tickets->total(),
                'per_page'     => $tickets->perPage(),
                'current_page' => $tickets->currentPage(),
                'last_page'    => $tickets->lastPage(),
            ],
        ]);
    }

    /** POST /tickets */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category'    => ['required', 'string', 'max:100'],
            'subject'     => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'priority'    => ['nullable', 'in:low,normal,high,urgent'],
            'employee_id' => ['nullable', 'uuid', 'exists:employees,id'],
        ]);

        $ticket = HrTicket::create([
            ...$data,
            'ticket_number' => 'TKT-' . strtoupper(Str::random(8)),
            'submitter_id'  => $request->user()->id,
            'priority'      => $data['priority'] ?? 'normal',
            'status'        => 'open',
        ]);

        $this->audit->log('ticket.created', target: $ticket, after: $ticket->toArray(), actor: $request->user());

        return ApiResponse::success(['ticket' => $ticket->load(['submitter:id,first_name,last_name'])], 201);
    }

    /** GET /tickets/{id} */
    public function show(Request $request, string $id): JsonResponse
    {
        $ticket = HrTicket::with([
            'submitter:id,first_name,last_name,avatar_path',
            'assignee:id,first_name,last_name',
            'employee:id,employee_number',
            'notes.author:id,first_name,last_name,avatar_path',
        ])->findOrFail($id);

        // Non-managers can only see their own tickets
        $user = $request->user();
        if (! $user->hasPermissionTo('hr.tickets.manage') && $ticket->submitter_id !== $user->id) {
            abort(403);
        }

        return ApiResponse::success(['ticket' => $ticket]);
    }

    /** PATCH /tickets/{id} — status transition, assign, resolution note */
    public function update(Request $request, string $id): JsonResponse
    {
        $ticket = HrTicket::findOrFail($id);
        $before = $ticket->toArray();

        $data = $request->validate([
            'status'          => ['nullable', 'in:open,in_progress,pending_info,resolved,closed,cancelled'],
            'assignee_id'     => ['nullable', 'uuid', 'exists:users,id'],
            'priority'        => ['nullable', 'in:low,normal,high,urgent'],
            'resolution_note' => ['nullable', 'string'],
        ]);

        if (isset($data['status'])) {
            $allowed = self::VALID_TRANSITIONS[$ticket->status] ?? [];
            if (! in_array($data['status'], $allowed, true)) {
                abort(422, "Cannot transition from '{$ticket->status}' to '{$data['status']}'.");
            }

            if ($data['status'] === 'resolved') {
                $data['resolved_at'] = now();
            }
            if ($data['status'] === 'closed') {
                $data['closed_at'] = now();
            }
        }

        $ticket->fill($data)->save();
        $this->audit->log('ticket.updated', target: $ticket, before: $before, after: $ticket->toArray(), actor: $request->user());

        return ApiResponse::success(['ticket' => $ticket->fresh(['submitter:id,first_name,last_name', 'assignee:id,first_name,last_name'])]);
    }

    /** POST /tickets/{id}/notes */
    public function addNote(Request $request, string $id): JsonResponse
    {
        $ticket = HrTicket::findOrFail($id);
        $user   = $request->user();

        $data = $request->validate([
            'body'        => ['required', 'string'],
            'is_internal' => ['nullable', 'boolean'],
        ]);

        $isHr = $user->hasPermissionTo('hr.tickets.manage');

        $note = $ticket->notes()->create([
            'author_id'   => $user->id,
            'body'        => $data['body'],
            'is_internal' => $isHr && ($data['is_internal'] ?? false),
        ]);

        return ApiResponse::success(['note' => $note->load('author:id,first_name,last_name,avatar_path')], 201);
    }
}
