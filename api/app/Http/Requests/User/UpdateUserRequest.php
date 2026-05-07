<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'  => ['sometimes', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name'   => ['sometimes', 'string', 'max:100'],
            'email'       => ['sometimes', 'email', 'max:255'],
            'phone'       => ['nullable', 'string', 'max:30'],
            'password'    => ['sometimes', 'nullable', 'string', 'min:8'],
            'status'      => ['sometimes', 'in:active,inactive,suspended'],
            'role_ids'    => ['sometimes', 'nullable', 'array'],
            'role_ids.*'  => ['uuid', 'exists:roles,id'],
        ];
    }
}
