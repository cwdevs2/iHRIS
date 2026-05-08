<?php

declare(strict_types=1);

namespace App\Services\Ess;

use App\Models\Employee;
use App\Models\ProfileUpdateRequest;
use App\Services\Audit\AuditLogger;

class EssProfileService
{
    // Fields an employee may request to change (HR reviews before applying).
    private const ALLOWED_FIELDS = [
        'phone',
        'address_line_1',
        'address_line_2',
        'city',
        'province',
        'postal_code',
        'civil_status',
        'emergency_contact',
    ];

    public function __construct(private AuditLogger $audit) {}

    /**
     * Submit a profile update request.
     * Only fields in ALLOWED_FIELDS are accepted; current values are captured for diff.
     */
    public function requestUpdate(Employee $employee, array $changes): ProfileUpdateRequest
    {
        $sanitized = array_intersect_key($changes, array_flip(self::ALLOWED_FIELDS));

        if (empty($sanitized)) {
            throw new \RuntimeException('No valid fields provided for update.');
        }

        $requestedChanges = [];
        foreach ($sanitized as $field => $newValue) {
            $requestedChanges[$field] = [
                'old' => $employee->$field,
                'new' => $newValue,
            ];
        }

        $request = ProfileUpdateRequest::create([
            'employee_id'        => $employee->id,
            'requested_changes'  => $requestedChanges,
            'status'             => 'pending',
        ]);

        $this->audit->log(
            'profile.update_requested',
            target: $request,
            after: ['fields' => array_keys($requestedChanges)],
            actor: $employee->user,
        );

        return $request;
    }

    /** Get the employee's own profile update requests. */
    public function getRequests(Employee $employee, int $perPage = 10): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return ProfileUpdateRequest::where('employee_id', $employee->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }
}
