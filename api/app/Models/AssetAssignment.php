<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetAssignment extends Model
{
    use HasUuid;

    protected $fillable = [
        'asset_id',
        'employee_id',
        'assigned_by',
        'assigned_on',
        'returned_on',
        'returned_to',
        'return_condition',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'assigned_on' => 'date',
            'returned_on' => 'date',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
