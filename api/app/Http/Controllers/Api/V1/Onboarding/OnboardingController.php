<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Onboarding;

use App\Http\Controllers\Controller;
use App\Models\OnboardingChecklist;
use App\Models\OnboardingAssignment;
use App\Models\OnboardingTaskCompletion;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OnboardingController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    // ── Checklists ────────────────────────────────────────────────────────────

    /** GET /onboarding/checklists */
    public function checklists(Request $request): JsonResponse
    {
        $checklists = OnboardingChecklist::query()
            ->with(['tasks' => fn ($q) => $q->orderBy('sort_order')])
            ->withCount('tasks')
            ->when($request->input('active_only'), fn ($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->get();

        return ApiResponse::success(['checklists' => $checklists]);
    }

    /** POST /onboarding/checklists */
    public function storeChecklist(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active'   => ['nullable', 'boolean'],
            'tasks'       => ['nullable', 'array'],
            'tasks.*.title'         => ['required', 'string', 'max:255'],
            'tasks.*.description'   => ['nullable', 'string'],
            'tasks.*.sort_order'    => ['nullable', 'integer', 'min:0'],
            'tasks.*.is_required'   => ['nullable', 'boolean'],
            'tasks.*.assigned_role' => ['nullable', 'string', 'max:100'],
            'tasks.*.due_days'      => ['nullable', 'integer', 'min:1'],
        ]);

        $checklist = OnboardingChecklist::create([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'is_active'   => $data['is_active'] ?? true,
            'created_by'  => $request->user()->id,
        ]);

        foreach ($data['tasks'] ?? [] as $i => $taskData) {
            $checklist->tasks()->create([
                'title'         => $taskData['title'],
                'description'   => $taskData['description'] ?? null,
                'sort_order'    => $taskData['sort_order'] ?? $i,
                'is_required'   => $taskData['is_required'] ?? true,
                'assigned_role' => $taskData['assigned_role'] ?? null,
                'due_days'      => $taskData['due_days'] ?? null,
            ]);
        }

        $this->audit->log('onboarding.checklist.created', target: $checklist, after: $checklist->toArray(), actor: $request->user());

        return ApiResponse::success(['checklist' => $checklist->load('tasks')], 201);
    }

    /** DELETE /onboarding/checklists/{id} */
    public function destroyChecklist(Request $request, string $id): JsonResponse
    {
        $checklist = OnboardingChecklist::findOrFail($id);
        $this->audit->log('onboarding.checklist.deleted', target: $checklist, before: $checklist->toArray(), actor: $request->user());
        $checklist->delete();

        return ApiResponse::success(['message' => 'Checklist deleted.']);
    }

    // ── Assignments ───────────────────────────────────────────────────────────

    /** GET /onboarding/assignments  (optionally ?employee_id=xxx) */
    public function assignments(Request $request): JsonResponse
    {
        $assignments = OnboardingAssignment::query()
            ->with([
                'employee.user:id,first_name,last_name',
                'checklist:id,name',
                'taskCompletions',
                'checklist.tasks',
            ])
            ->when($request->input('employee_id'), fn ($q) => $q->where('employee_id', $request->input('employee_id')))
            ->when($request->input('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->orderByDesc('created_at')
            ->paginate(20);

        return ApiResponse::success([
            'assignments' => $assignments->items(),
            'pagination'  => [
                'total'        => $assignments->total(),
                'per_page'     => $assignments->perPage(),
                'current_page' => $assignments->currentPage(),
                'last_page'    => $assignments->lastPage(),
            ],
        ]);
    }

    /** POST /onboarding/assignments */
    public function assign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id'  => ['required', 'uuid', 'exists:employees,id'],
            'checklist_id' => ['required', 'uuid', 'exists:onboarding_checklists,id'],
            'start_date'   => ['nullable', 'date'],
        ]);

        $assignment = OnboardingAssignment::create([
            'employee_id'  => $data['employee_id'],
            'checklist_id' => $data['checklist_id'],
            'assigned_by'  => $request->user()->id,
            'start_date'   => $data['start_date'] ?? now()->toDateString(),
            'status'       => 'not_started',
        ]);

        // Create completion rows for all tasks (as pending)
        $tasks = $assignment->checklist()->with('tasks')->first()?->tasks ?? collect();
        foreach ($tasks as $task) {
            $assignment->taskCompletions()->create([
                'task_id'      => $task->id,
                'completed_by' => null,
                'completed_at' => null,
            ]);
        }

        $this->audit->log('onboarding.assigned', target: $assignment, after: $assignment->toArray(), actor: $request->user());

        return ApiResponse::success(['assignment' => $assignment->load(['checklist.tasks', 'taskCompletions', 'employee.user'])], 201);
    }

    /** PATCH /onboarding/assignments/{id}/tasks/{taskId} - toggle task complete */
    public function completeTask(Request $request, string $assignmentId, string $taskId): JsonResponse
    {
        $assignment = OnboardingAssignment::with(['checklist.tasks', 'taskCompletions'])->findOrFail($assignmentId);
        $completion = $assignment->taskCompletions()->where('task_id', $taskId)->firstOrFail();

        $isCompleting = $completion->completed_at === null;

        $completion->update([
            'completed_at' => $isCompleting ? now() : null,
            'completed_by' => $isCompleting ? $request->user()->id : null,
            'notes'        => $request->input('notes'),
        ]);

        // Recalculate assignment status
        $totalRequired    = $assignment->checklist->tasks->where('is_required', true)->count();
        $completedRequired = $assignment->taskCompletions()
            ->whereIn('task_id', $assignment->checklist->tasks->where('is_required', true)->pluck('id'))
            ->whereNotNull('completed_at')
            ->count();

        $newStatus = match (true) {
            $completedRequired === 0 => 'not_started',
            $completedRequired >= $totalRequired => 'completed',
            default => 'in_progress',
        };

        $assignment->update([
            'status'       => $newStatus,
            'completed_at' => $newStatus === 'completed' ? now() : null,
        ]);

        return ApiResponse::success([
            'assignment' => $assignment->fresh(['checklist.tasks', 'taskCompletions']),
        ]);
    }
}
