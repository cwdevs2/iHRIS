<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use HasUuid;

    protected $table = 'holiday_calendar';

    protected $fillable = [
        'holiday_date',
        'name',
        'type',
        'is_recurring',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'holiday_date' => 'date',
            'is_recurring' => 'boolean',
        ];
    }

    public function isRegular(): bool
    {
        return $this->type === 'regular';
    }

    public function isSpecialNonWorking(): bool
    {
        return $this->type === 'special_non_working';
    }
}
