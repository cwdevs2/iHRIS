<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds defensive HTTP security headers to every API response.
 *
 * The frontend is served separately, so CSP for the SPA lives in the web tier.
 * These headers harden the JSON API surface against common attacks (clickjacking,
 * MIME sniffing, downgrade) per the OWASP Secure Headers Project.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('Permissions-Policy', 'geolocation=(self), camera=(), microphone=(), payment=()');

        // HSTS only when actually serving over HTTPS — avoids breaking local dev.
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
