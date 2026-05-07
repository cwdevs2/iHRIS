<?php

declare(strict_types=1);

namespace App\Http\Requests\Position;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePositionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'department_id' => ['sometimes', 'nullable', 'uuid', 'exists:departments,id'],
            'code'          => ['sometimes', 'nullable', 'string', 'max:50', "unique:positions,code,{$id}"],
            'title'         => ['sometimes', 'required', 'string', 'max:255'],
            'description'   => ['sometimes', 'nullable', 'string', 'max:1000'],
            'rank_level'    => ['sometimes', 'nullable', 'integer', 'min:1', 'max:999'],
            'min_salary'    => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'max_salary'    => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'is_active'     => ['sometimes', 'boolean'],
        ];
    }
}
