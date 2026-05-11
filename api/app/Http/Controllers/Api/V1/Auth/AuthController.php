<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $throttleKey = Str::lower($request->input('email')).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return ApiResponse::fail([
                'message' => "Too many login attempts. Try again in {$seconds} seconds.",
            ], 429);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            RateLimiter::hit($throttleKey, 60);
            $this->audit->log('auth.login_failed', metadata: ['email' => $request->email]);

            return ApiResponse::fail([
                'message' => 'These credentials do not match our records.',
            ], 401);
        }

        if ($user->status !== 'active') {
            return ApiResponse::fail([
                'message' => 'Your account is not active. Please contact your HR administrator.',
            ], 403);
        }

        if ($user->isLocked()) {
            return ApiResponse::fail([
                'message' => 'Your account is temporarily locked. Please try again later.',
            ], 423);
        }

        RateLimiter::clear($throttleKey);

        // MFA gate: issue a short-lived "challenge" token instead of the full token.
        if ($user->mfa_enabled) {
            $challenge = $user->createToken('mfa-challenge', ['mfa:verify'], now()->addMinutes(5));

            return ApiResponse::success([
                'mfa_required' => true,
                'challenge_token' => $challenge->plainTextToken,
            ]);
        }

        return $this->issueToken($user, $request);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $user?->currentAccessToken()?->delete();

        $this->audit->log('auth.logout', actor: $user);

        return ApiResponse::success(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['roles.permissions', 'groups.departments']);

        return ApiResponse::success([
            'user' => new UserResource($user),
        ]);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::sendResetLink($request->only('email'));

        $this->audit->log('auth.password_reset_requested', metadata: [
            'email' => $request->email,
            'status' => $status,
        ]);

        // Always return success to avoid email enumeration.
        return ApiResponse::success([
            'message' => 'If an account with that email exists, a reset link has been sent.',
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                $this->audit->log('auth.password_reset_completed', actor: $user);
            },
        );

        return $status === Password::PASSWORD_RESET
            ? ApiResponse::success(['message' => 'Password has been reset.'])
            : ApiResponse::fail(['message' => __($status)], 422);
    }

    private function issueToken(User $user, Request $request): JsonResponse
    {
        $deviceName = $request->input('device_name', $request->userAgent() ?? 'unknown-device');
        $token = $user->createToken($deviceName);

        $user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'failed_login_attempts' => 0,
        ])->save();

        $this->audit->log('auth.login_succeeded', actor: $user);

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'user' => new UserResource($user->load(['roles.permissions', 'groups.departments'])),
        ]);
    }
}
