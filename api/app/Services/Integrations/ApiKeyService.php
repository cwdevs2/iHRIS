<?php

declare(strict_types=1);

namespace App\Services\Integrations;

use App\Models\ApiKey;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ApiKeyService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Generate a fresh API key. The full token is returned ONCE — only the hash
     * is persisted. Caller must surface this token immediately to the user.
     *
     * @return array{api_key:ApiKey,plain_token:string}
     */
    public function create(array $data): array
    {
        $plain = 'ihr_live_' . Str::random(48);
        $hash = hash('sha256', $plain);

        $key = ApiKey::create([
            'name' => $data['name'],
            'key_prefix' => substr($plain, 0, 12),
            'key_hash' => $hash,
            'scopes' => $data['scopes'] ?? [],
            'rate_limit_per_minute' => $data['rate_limit_per_minute'] ?? 60,
            'created_by' => Auth::id(),
        ]);

        $this->audit->log('integrations.api_key.created', $key, after: ['name' => $key->name, 'scopes' => $key->scopes]);

        return ['api_key' => $key, 'plain_token' => $plain];
    }

    public function revoke(ApiKey $key): ApiKey
    {
        if ($key->revoked_at !== null) {
            return $key;
        }

        $key->update(['revoked_at' => now()]);
        $this->audit->log('integrations.api_key.revoked', $key, after: ['revoked_at' => $key->revoked_at]);
        return $key->fresh();
    }

    /**
     * Resolve and validate an inbound bearer token. Returns null on miss.
     */
    public function resolve(string $plain): ?ApiKey
    {
        $hash = hash('sha256', $plain);
        $key = ApiKey::where('key_hash', $hash)->whereNull('revoked_at')->first();

        if ($key !== null) {
            $key->forceFill([
                'last_used_at' => now(),
                'last_used_ip' => request()->ip(),
            ])->saveQuietly();
        }

        return $key;
    }
}
