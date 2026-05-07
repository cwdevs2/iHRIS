<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Employee */
class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->whenLoaded('user');
        $manager = $this->whenLoaded('manager');

        return [
            'id'                    => $this->id,
            'employee_number'       => $this->employee_number,

            // Flattened user fields for convenience
            'user_id'               => $this->user_id,
            'first_name'            => $user?->first_name,
            'middle_name'           => $user?->middle_name,
            'last_name'             => $user?->last_name,
            'full_name'             => $user?->full_name,
            'email'                 => $user?->email,
            'phone'                 => $user?->phone,
            'avatar_url'            => $user?->avatar_path
                ? url($user->avatar_path)
                : null,
            'account_status'        => $user?->status,

            // Employment
            'employment_status'     => $this->employment_status,
            'date_hired'            => $this->date_hired?->toDateString(),
            'regularization_date'   => $this->regularization_date?->toDateString(),
            'separation_date'       => $this->separation_date?->toDateString(),

            // Department / Position
            'department_id'         => $this->department_id,
            'department'            => $this->whenLoaded('department', fn () => [
                'id'   => $this->department->id,
                'name' => $this->department->name,
                'code' => $this->department->code,
            ]),
            'position_id'           => $this->position_id,
            'position'              => $this->whenLoaded('position', fn () => [
                'id'    => $this->position->id,
                'title' => $this->position->title,
                'code'  => $this->position->code,
            ]),

            // Manager (minimal)
            'reports_to_id'         => $this->reports_to_id,
            'manager'               => $manager instanceof \App\Models\Employee
                ? [
                    'id'        => $manager->id,
                    'full_name' => $manager->user?->full_name,
                ]
                : null,

            // Personal
            'birth_date'            => $this->birth_date?->toDateString(),
            'gender'                => $this->gender,
            'civil_status'          => $this->civil_status,
            'nationality'           => $this->nationality,
            'religion'              => $this->religion,

            // Address
            'address_line_1'        => $this->address_line_1,
            'address_line_2'        => $this->address_line_2,
            'city'                  => $this->city,
            'province'              => $this->province,
            'postal_code'           => $this->postal_code,
            'country'               => $this->country,

            // Government IDs — only shown when explicitly requested (admin/hr roles).
            'sss_number'            => $this->when(
                $request->user()?->hasPermission('hr', 'employees', 'view_sensitive'),
                $this->sss_number,
            ),
            'philhealth_number'     => $this->when(
                $request->user()?->hasPermission('hr', 'employees', 'view_sensitive'),
                $this->philhealth_number,
            ),
            'pagibig_number'        => $this->when(
                $request->user()?->hasPermission('hr', 'employees', 'view_sensitive'),
                $this->pagibig_number,
            ),
            'tin'                   => $this->when(
                $request->user()?->hasPermission('hr', 'employees', 'view_sensitive'),
                $this->tin,
            ),

            // Compensation — only shown to authorized roles.
            'basic_salary'          => $this->when(
                $request->user()?->hasPermission('hr', 'employees', 'view_sensitive'),
                $this->basic_salary,
            ),
            'pay_frequency'         => $this->pay_frequency,

            'emergency_contact'     => $this->emergency_contact,

            'created_at'            => $this->created_at->toIso8601String(),
            'updated_at'            => $this->updated_at->toIso8601String(),
        ];
    }
}
