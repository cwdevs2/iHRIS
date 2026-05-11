<?php

declare(strict_types=1);

namespace App\Http\Requests\UserGroup;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Permission enforced at route level.
    }

    public function rules(): array
    {
        return [
            'name'             => ['required', 'string', 'max:150', 'unique:user_groups,name'],
            'description'      => ['nullable', 'string', 'max:500'],
            'type'             => ['required', Rule::in(['department_head', 'hr_admin', 'custom'])],
            'is_active'        => ['boolean'],
            'department_ids'   => ['nullable', 'array'],
            'department_ids.*' => ['uuid', 'exists:departments,id'],
        ];
    }
}
