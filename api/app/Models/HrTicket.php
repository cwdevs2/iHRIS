<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class HrTicket extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $table = 'hr_tickets';

    protected $fillable = [
        'ticket_number',
        'submitter_id',
        'assignee_id',
        'employee_id',
        'category',
        'subject',
        'description',
        'priority',
        'status',
        'resolved_at',
        'closed_at',
        'resolution_note',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
            'closed_at'   => 'datetime',
        ];
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitter_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(HrTicketNote::class, 'ticket_id')->orderBy('created_at');
    }
}
