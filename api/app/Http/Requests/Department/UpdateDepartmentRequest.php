<?php

declare(strict_types=1);

namespace App\Http\Requests\Department;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDepartmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'code'        => ['sometimes', 'required', 'string', 'max:50', "unique:departments,code,{$id}"],
            'name'        => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'parent_id'   => ['sometimes', 'nullable', 'uuid', 'exists:departments,id'],
            'head_user_id'=> ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
            'is_active'   => ['sometimes', 'boolean'],
        ];
    }
}
