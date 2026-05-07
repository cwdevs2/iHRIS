<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    /**
     * Usage: Route::middleware('permission:hr.employees.create')
     * Permission key format: module.feature.action
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return ApiResponse::error('Unauthenticated.', 401);
        }

        [$module, $feature, $action] = array_pad(explode('.', $permission), 3, null);

        if (! $module || ! $feature || ! $action) {
            return ApiResponse::error("Invalid permission key: {$permission}", 500);
        }

        if (! $user->hasPermission($module, $feature, $action)) {
            return ApiResponse::error('You do not have permission to perform this action.', 403);
        }

        return $next($request);
    }
}
