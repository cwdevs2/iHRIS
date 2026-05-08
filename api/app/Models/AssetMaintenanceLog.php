<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetMaintenanceLog extends Model
{
    use HasUuid;

    protected $fillable = [
        'asset_id',
        'logged_by',
        'type',
        'performed_on',
        'next_due_on',
        'cost',
        'vendor',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'performed_on' => 'date',
            'next_due_on' => 'date',
            'cost' => 'decimal:4',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function logger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'logged_by');
    }
}
