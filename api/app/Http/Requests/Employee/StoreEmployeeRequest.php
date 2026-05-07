<?php

declare(strict_types=1);

namespace App\Http\Requests\Employee;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // RBAC enforced via middleware on the route.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // Identity (creates/links a User record)
            'first_name'            => ['required_without:user_id', 'nullable', 'string', 'max:100'],
            'middle_name'           => ['nullable', 'string', 'max:100'],
            'last_name'             => ['required_without:user_id', 'nullable', 'string', 'max:100'],
            'email'                 => ['required_without:user_id', 'nullable', 'email', 'max:255', 'unique:users,email'],
            'phone'                 => ['nullable', 'string', 'max:50'],

            'user_id'               => ['nullable', 'uuid', 'exists:users,id'],
            'employee_number'       => ['nullable', 'string', 'max:50'],
            'department_id'         => ['nullable', 'uuid', 'exists:departments,id'],
            'position_id'           => ['nullable', 'uuid', 'exists:positions,id'],
            'reports_to_id'         => ['nullable', 'uuid', 'exists:employees,id'],

            // Personal
            'birth_date'            => ['nullable', 'date', 'before:today'],
            'gender'                => ['nullable', 'in:male,female,other,prefer_not_to_say'],
            'civil_status'          => ['nullable', 'in:single,married,widowed,separated,divorced'],
            'nationality'           => ['nullable', 'string', 'max:100'],
            'religion'              => ['nullable', 'string', 'max:100'],

            // Address
            'address_line_1'        => ['nullable', 'string', 'max:255'],
            'address_line_2'        => ['nullable', 'string', 'max:255'],
            'city'                  => ['nullable', 'string', 'max:100'],
            'province'              => ['nullable', 'string', 'max:100'],
            'postal_code'           => ['nullable', 'string', 'max:20'],
            'country'               => ['nullable', 'string', 'max:100'],

            // Government IDs
            'sss_number'            => ['nullable', 'string', 'max:100'],
            'philhealth_number'     => ['nullable', 'string', 'max:100'],
            'pagibig_number'        => ['nullable', 'string', 'max:100'],
            'tin'                   => ['nullable', 'string', 'max:100'],

            // Employment
            'employment_status'     => ['required', 'in:regular,probationary,contractual,part_time,project_based,resigned,terminated,on_leave'],
            'date_hired'            => ['nullable', 'date'],
            'regularization_date'   => ['nullable', 'date'],
            'separation_date'       => ['nullable', 'date'],
            'separation_reason'     => ['nullable', 'string', 'max:500'],

            // Compensation
            'basic_salary'          => ['nullable', 'numeric', 'min:0', 'max:9999999999.9999'],
            'pay_frequency'         => ['nullable', 'in:monthly,semi_monthly,weekly,daily'],

            // Emergency contact
            'emergency_contact'             => ['nullable', 'array'],
            'emergency_contact.name'        => ['nullable', 'string', 'max:255'],
            'emergency_contact.relationship'=> ['nullable', 'string', 'max:100'],
            'emergency_contact.phone'       => ['nullable', 'string', 'max:50'],
            'emergency_contact.address'     => ['nullable', 'string', 'max:500'],
        ];
    }
}
