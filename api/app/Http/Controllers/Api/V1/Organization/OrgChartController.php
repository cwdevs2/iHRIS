<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Organization;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class OrgChartController extends Controller
{
    /**
     * GET /api/v1/org-chart
     *
     * Returns a hierarchical tree of departments with their head, employee count,
     * and top-level direct reports (managers) for rendering the org chart.
     */
    public function index(): JsonResponse
    {
        // Load all active departments with their heads and children
        $departments = Department::query()
            ->with([
                'head:id,first_name,last_name,avatar_path',
                'children.head:id,first_name,last_name,avatar_path',
            ])
            ->withCount(['employees' => fn ($q) => $q->whereNotIn('employment_status', ['resigned', 'terminated'])])
            ->where('is_active', true)
            ->whereNull('parent_id') // only root departments
            ->orderBy('name')
            ->get();

        $tree = $departments->map(fn ($dept) => $this->mapDepartment($dept, 1));

        // Also load top-level managers (employees with no reports_to or who have direct reports)
        $topManagers = Employee::query()
            ->with(['user:id,first_name,last_name,avatar_path', 'position:id,title', 'department:id,name'])
            ->whereNull('reports_to_id')
            ->whereNotIn('employment_status', ['resigned', 'terminated'])
            ->whereNotNull('position_id')
            ->limit(20)
            ->get()
            ->map(fn ($emp) => [
                'id'              => $emp->id,
                'employee_number' => $emp->employee_number,
                'full_name'       => $emp->user?->full_name ?? $emp->employee_number,
                'avatar_url'      => $emp->user?->avatar_path ? asset('storage/' . $emp->user->avatar_path) : null,
                'position'        => $emp->position?->title,
                'department'      => $emp->department?->name,
            ]);

        return ApiResponse::success([
            'departments' => $tree,
            'top_managers' => $topManagers,
        ]);
    }

    private function mapDepartment(Department $dept, int $depth): array
    {
        $node = [
            'id'             => $dept->id,
            'code'           => $dept->code,
            'name'           => $dept->name,
            'employee_count' => $dept->employees_count ?? 0,
            'head'           => $dept->head ? [
                'id'         => $dept->head->id,
                'full_name'  => trim($dept->head->first_name . ' ' . $dept->head->last_name),
                'avatar_url' => $dept->head->avatar_path ? asset('storage/' . $dept->head->avatar_path) : null,
            ] : null,
            'children'       => [],
        ];

        if ($depth < 4 && $dept->relationLoaded('children')) {
            $node['children'] = $dept->children
                ->map(fn ($child) => $this->mapDepartment($child, $depth + 1))
                ->values()
                ->all();
        }

        return $node;
    }
}
