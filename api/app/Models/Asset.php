<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Asset extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'asset_tag',
        'category_id',
        'name',
        'brand',
        'model',
        'serial_number',
        'purchased_at',
        'purchase_cost',
        'vendor',
        'warranty_expires_at',
        'status',
        'condition',
        'location',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'purchased_at' => 'date',
            'warranty_expires_at' => 'date',
            'purchase_cost' => 'decimal:4',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'category_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class)->orderByDesc('assigned_on');
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(AssetMaintenanceLog::class)->orderByDesc('performed_on');
    }

    public function activeAssignment(): ?AssetAssignment
    {
        return $this->assignments()->whereNull('returned_on')->first();
    }
}
