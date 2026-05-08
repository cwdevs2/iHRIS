<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\IntegrationLog;
use App\Services\Integrations\ApiKeyService;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates inbound integration requests via the X-Api-Key header.
 *
 * - Resolves the key against the api_keys table (hash comparison).
 * - Enforces per-key rate limits.
 * - Optionally checks scopes when invoked as `apikey:scope`.
 * - Logs every request to integration_logs for audit & debugging.
 */
class AuthenticateApiKey
{
    public function __construct(
        private readonly ApiKeyService $keys,
        private readonly RateLimiter $limiter,
    ) {}

    public function handle(Request $request, Closure $next, ?string $requiredScope = null): Response
    {
        $token = $request->header('X-Api-Key') ?? $request->bearerToken();

        if (empty($token)) {
            return ApiResponse::error('API key missing. Send X-Api-Key header.', 401);
        }

        $key = $this->keys->resolve($token);

        if ($key === null) {
            return ApiResponse::error('Invalid or revoked API key.', 401);
        }

        if ($requiredScope !== null && ! in_array($requiredScope, $key->scopes ?? [], true)) {
            return ApiResponse::error("API key missing scope: {$requiredScope}", 403);
        }

        // Per-key rate limiting.
        $bucket = "apikey:{$key->id}";
        if ($this->limiter->tooManyAttempts($bucket, $key->rate_limit_per_minute)) {
            return ApiResponse::error('API key rate limit exceeded.', 429);
        }
        $this->limiter->hit($bucket, 60);

        // Make the resolved key available to controllers.
        $request->attributes->set('api_key', $key);

        $response = $next($request);

        // Persist a log entry for the inbound call. Payload is intentionally
        // captured pre- and post-handler to surface failures during debugging.
        IntegrationLog::create([
            'integration' => $request->route()?->getAction('integration') ?? 'api',
            'direction' => 'inbound',
            'endpoint' => $request->path(),
            'status_code' => $response->getStatusCode(),
            'request_payload' => $request->except(['password', 'token', 'X-Api-Key']),
            'api_key_id' => $key->id,
            'source_ip' => $request->ip(),
        ]);

        return $response;
    }
}
