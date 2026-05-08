<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Ess;

use App\Http\Controllers\Controller;
use App\Services\Ess\EssProfileService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EssProfileController extends Controller
{
    public function __construct(private EssProfileService $svc) {}

    /** GET /ess/profile — current employee record */
    public function show(Request $request): JsonResponse
    {
        $employee = $request->user()->employee?->load([
            'department:id,name',
            'position:id,title',
            'manager.user:id,first_name,last_name',
        ]);

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        return ApiResponse::success(['employee' => $employee]);
    }

    /** GET /ess/profile/update-requests — employee's own pending/resolved requests */
    public function updateRequests(Request $request): JsonResponse
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        $requests = $this->svc->getRequests($employee);

        return ApiResponse::success([
            'requests' => $requests->items(),
            'pagination' => [
                'total'        => $requests->total(),
                'per_page'     => $requests->perPage(),
                'current_page' => $requests->currentPage(),
                'last_page'    => $requests->lastPage(),
            ],
        ]);
    }

    /** POST /ess/profile/update-requests */
    public function requestUpdate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'             => ['nullable', 'string', 'max:30'],
            'address_line_1'    => ['nullable', 'string', 'max:255'],
            'address_line_2'    => ['nullable', 'string', 'max:255'],
            'city'              => ['nullable', 'string', 'max:100'],
            'province'          => ['nullable', 'string', 'max:100'],
            'postal_code'       => ['nullable', 'string', 'max:20'],
            'civil_status'      => ['nullable', 'in:single,married,widowed,separated,divorced'],
            'emergency_contact' => ['nullable', 'array'],
            'emergency_contact.name'         => ['nullable', 'string', 'max:100'],
            'emergency_contact.relationship' => ['nullable', 'string', 'max:60'],
            'emergency_contact.phone'        => ['nullable', 'string', 'max:30'],
            'emergency_contact.address'      => ['nullable', 'string', 'max:255'],
        ]);

        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        // Strip nulls — only send changed fields
        $changes = array_filter($data, fn ($v) => $v !== null);

        if (empty($changes)) {
            return ApiResponse::fail(['message' => 'No changes provided.']);
        }

        try {
            $updateRequest = $this->svc->requestUpdate($employee, $changes);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(['request' => $updateRequest], 201);
    }
}
