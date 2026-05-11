<?php

declare(strict_types=1);

namespace App\Http\Requests\UserGroup;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Permission enforced at route level.
    }

    public function rules(): array
    {
        $groupId = $this->route('id');

        return [
            'name'             => ['sometimes', 'string', 'max:150', Rule::unique('user_groups', 'name')->ignore($groupId)],
            'description'      => ['nullable', 'string', 'max:500'],
            'type'             => ['sometimes', Rule::in(['department_head', 'hr_admin', 'custom'])],
            'is_active'        => ['boolean'],
            'department_ids'   => ['nullable', 'array'],
            'department_ids.*' => ['uuid', 'exists:departments,id'],
        ];
    }
}
