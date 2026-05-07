<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{
    public function __construct(private ?Request $request = null)
    {
        $this->request = $this->request ?? request();
    }

    public function log(
        string $action,
        ?Model $target = null,
        ?array $before = null,
        ?array $after = null,
        ?array $metadata = null,
        ?User $actor = null,
    ): AuditLog {
        $actor = $actor ?? Auth::user();

        return AuditLog::create([
            'actor_id' => $actor?->id,
            'actor_email' => $actor?->email,
            'action' => $action,
            'target_type' => $target ? $target::class : null,
            'target_id' => $target?->getKey(),
            'before' => $before,
            'after' => $after,
            'ip_address' => $this->request?->ip(),
            'user_agent' => $this->request?->userAgent(),
            'metadata' => $metadata,
        ]);
    }
}
