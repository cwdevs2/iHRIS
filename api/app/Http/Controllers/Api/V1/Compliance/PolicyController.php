<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Compliance;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompliancePolicyResource;
use App\Models\CompliancePolicy;
use App\Models\Employee;
use App\Services\Compliance\ComplianceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class PolicyController extends Controller
{
    public function __construct(private readonly ComplianceService $compliance) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'category' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:draft,published,archived'],
            'search' => ['nullable', 'string'],
        ]);

        $page = $this->compliance->listPolicies($request->only(['category', 'status', 'search']));

        return ApiResponse::success([
            'policies' => CompliancePolicyResource::collection($page->items()),
            'pagination' => [
                'current_page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $policy = CompliancePolicy::with('publisher')->withCount('acknowledgments')->findOrFail($id);
        return ApiResponse::success(['policy' => new CompliancePolicyResource($policy)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:64'],
            'version' => ['nullable', 'integer', 'min:1'],
            'body' => ['required', 'string'],
            'effective_on' => ['nullable', 'date'],
            'expires_on' => ['nullable', 'date', 'after_or_equal:effective_on'],
            'requires_acknowledgment' => ['nullable', 'boolean'],
        ]);

        $policy = $this->compliance->createPolicy($data);
        return ApiResponse::success(['policy' => new CompliancePolicyResource($policy)], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $policy = CompliancePolicy::findOrFail($id);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:64'],
            'body' => ['sometimes', 'string'],
            'effective_on' => ['nullable', 'date'],
            'expires_on' => ['nullable', 'date', 'after_or_equal:effective_on'],
            'requires_acknowledgment' => ['nullable', 'boolean'],
        ]);

        try {
            $policy = $this->compliance->updatePolicy($policy, $data);
        } catch (RuntimeException $e) {
            return ApiResponse::fail(['policy' => $e->getMessage()], 422);
        }

        return ApiResponse::success(['policy' => new CompliancePolicyResource($policy)]);
    }

    public function publish(string $id): JsonResponse
    {
        $policy = CompliancePolicy::findOrFail($id);
        $policy = $this->compliance->publishPolicy($policy);
        return ApiResponse::success(['policy' => new CompliancePolicyResource($policy)]);
    }

    public function acknowledge(Request $request, string $id): JsonResponse
    {
        $policy = CompliancePolicy::findOrFail($id);

        $employee = Employee::where('user_id', $request->user()->id)->first();
        if ($employee === null) {
            return ApiResponse::fail(['employee' => 'No employee record linked to your user account.'], 422);
        }

        try {
            $ack = $this->compliance->acknowledgePolicy($policy, $employee);
        } catch (RuntimeException $e) {
            return ApiResponse::fail(['policy' => $e->getMessage()], 422);
        }

        return ApiResponse::success(['acknowledgment' => $ack]);
    }

    /** GET /compliance/coverage — admin dashboard */
    public function coverage(): JsonResponse
    {
        return ApiResponse::success(['coverage' => $this->compliance->acknowledgmentCoverage()]);
    }
}
