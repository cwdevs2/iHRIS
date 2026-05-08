<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetCategory extends Model
{
    use HasUuid;

    protected $fillable = ['name', 'icon', 'description'];

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class, 'category_id');
    }
}
