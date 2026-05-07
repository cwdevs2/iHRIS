<?php

declare(strict_types=1);

namespace App\Http\Requests\Employee;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // Identity — updates linked User record when provided
            'first_name'            => ['sometimes', 'nullable', 'string', 'max:100'],
            'middle_name'           => ['sometimes', 'nullable', 'string', 'max:100'],
            'last_name'             => ['sometimes', 'nullable', 'string', 'max:100'],
            'email'                 => ['sometimes', 'nullable', 'email', 'max:255', 'unique:users,email,' . ($this->route('id') ? "NULL,id,employee_id,{$this->route('id')}" : 'NULL')],
            'phone'                 => ['sometimes', 'nullable', 'string', 'max:50'],

            'user_id'               => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
            'employee_number'       => ['sometimes', 'nullable', 'string', 'max:50'],
            'department_id'         => ['sometimes', 'nullable', 'uuid', 'exists:departments,id'],
            'position_id'           => ['sometimes', 'nullable', 'uuid', 'exists:positions,id'],
            'reports_to_id'         => ['sometimes', 'nullable', 'uuid', 'exists:employees,id'],

            'birth_date'            => ['sometimes', 'nullable', 'date', 'before:today'],
            'gender'                => ['sometimes', 'nullable', 'in:male,female,other,prefer_not_to_say'],
            'civil_status'          => ['sometimes', 'nullable', 'in:single,married,widowed,separated,divorced'],
            'nationality'           => ['sometimes', 'nullable', 'string', 'max:100'],
            'religion'              => ['sometimes', 'nullable', 'string', 'max:100'],

            'address_line_1'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'address_line_2'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'city'                  => ['sometimes', 'nullable', 'string', 'max:100'],
            'province'              => ['sometimes', 'nullable', 'string', 'max:100'],
            'postal_code'           => ['sometimes', 'nullable', 'string', 'max:20'],
            'country'               => ['sometimes', 'nullable', 'string', 'max:100'],

            'sss_number'            => ['sometimes', 'nullable', 'string', 'max:100'],
            'philhealth_number'     => ['sometimes', 'nullable', 'string', 'max:100'],
            'pagibig_number'        => ['sometimes', 'nullable', 'string', 'max:100'],
            'tin'                   => ['sometimes', 'nullable', 'string', 'max:100'],

            'employment_status'     => ['sometimes', 'required', 'in:regular,probationary,contractual,part_time,project_based,resigned,terminated,on_leave'],
            'date_hired'            => ['sometimes', 'nullable', 'date'],
            'regularization_date'   => ['sometimes', 'nullable', 'date'],
            'separation_date'       => ['sometimes', 'nullable', 'date'],
            'separation_reason'     => ['sometimes', 'nullable', 'string', 'max:500'],

            'basic_salary'          => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.9999'],
            'pay_frequency'         => ['sometimes', 'nullable', 'in:monthly,semi_monthly,weekly,daily'],

            'emergency_contact'             => ['sometimes', 'nullable', 'array'],
            'emergency_contact.name'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'emergency_contact.relationship'=> ['sometimes', 'nullable', 'string', 'max:100'],
            'emergency_contact.phone'       => ['sometimes', 'nullable', 'string', 'max:50'],
            'emergency_contact.address'     => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }
}
