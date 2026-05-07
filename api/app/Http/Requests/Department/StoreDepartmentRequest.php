<?php

declare(strict_types=1);

namespace App\Http\Requests\Department;

use Illuminate\Foundation\Http\FormRequest;

class StoreDepartmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'code'        => ['required', 'string', 'max:50', 'unique:departments,code'],
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'parent_id'   => ['nullable', 'uuid', 'exists:departments,id'],
            'head_user_id'=> ['nullable', 'uuid', 'exists:users,id'],
            'is_active'   => ['nullable', 'boolean'],
        ];
    }
}
