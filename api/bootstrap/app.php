<?php

declare(strict_types=1);

use App\Http\Middleware\AuthenticateApiKey;
use App\Http\Middleware\EnsurePermission;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\SecurityHeaders;
use App\Support\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'permission' => EnsurePermission::class,
            'role' => EnsureRole::class,
            'apikey' => AuthenticateApiKey::class,
        ]);

        // Apply security headers to every API response.
        $middleware->api(append: [SecurityHeaders::class]);

        // Per-IP throttle on auth endpoints to slow brute-force attempts.
        $middleware->throttleApi();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::fail($e->errors(), 422);
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error('Unauthenticated.', 401);
            }
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $status = $e->getStatusCode();
                $message = $e->getMessage() ?: 'Request failed.';

                return $status >= 500
                    ? ApiResponse::error($message, $status)
                    : ApiResponse::fail(['message' => $message], $status);
            }
        });
    })->create();
