<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class EmployeeDocument extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $table = 'employee_documents';

    protected $fillable = [
        'employee_id',
        'uploaded_by',
        'category',
        'title',
        'description',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'expires_at',
        'is_private',
    ];

    protected function casts(): array
    {
        return [
            'expires_at'  => 'date',
            'is_private'  => 'boolean',
            'file_size'   => 'integer',
        ];
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    /** Temporary signed URL valid for 5 minutes */
    public function getDownloadUrlAttribute(): string
    {
        return Storage::temporaryUrl(
            $this->file_path,
            now()->addMinutes(5),
        );
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isExpiringSoon(int $days = 30): bool
    {
        return $this->expires_at !== null
            && ! $this->expires_at->isPast()
            && $this->expires_at->diffInDays(now()) <= $days;
    }
}
