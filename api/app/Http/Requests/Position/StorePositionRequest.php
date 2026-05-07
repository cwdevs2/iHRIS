<?php

declare(strict_types=1);

namespace App\Http\Requests\Position;

use Illuminate\Foundation\Http\FormRequest;

class StorePositionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
            'code'          => ['nullable', 'string', 'max:50', 'unique:positions,code'],
            'title'         => ['required', 'string', 'max:255'],
            'description'   => ['nullable', 'string', 'max:1000'],
            'rank_level'    => ['nullable', 'integer', 'min:1', 'max:999'],
            'min_salary'    => ['nullable', 'numeric', 'min:0'],
            'max_salary'    => ['nullable', 'numeric', 'min:0'],
            'is_active'     => ['nullable', 'boolean'],
        ];
    }
}
