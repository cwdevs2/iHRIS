<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class RegulatoryFiling extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'agency',
        'form_code',
        'title',
        'period_covered_start',
        'period_covered_end',
        'due_on',
        'status',
        'filed_on',
        'reference_number',
        'filed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'period_covered_start' => 'date',
            'period_covered_end' => 'date',
            'due_on' => 'date',
            'filed_on' => 'date',
        ];
    }

    public function filer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'filed_by');
    }
}
