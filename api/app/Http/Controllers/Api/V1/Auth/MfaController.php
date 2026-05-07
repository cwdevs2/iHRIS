<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class MfaController extends Controller
{
    public function __construct(
        private Google2FA $google2fa,
        private AuditLogger $audit,
    ) {}

    /**
     * Begin MFA enrollment: generate a new TOTP secret and return the provisioning URI.
     * Requires a fully authenticated token (not a challenge token).
     */
    public function setup(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->mfa_enabled) {
            return ApiResponse::fail(['message' => 'MFA is already enabled on this account.'], 409);
        }

        $secret = $this->google2fa->generateSecretKey();

        // Store temporarily (not enabled until confirmed).
        $user->forceFill(['mfa_secret' => $secret])->save();

        $provisioningUri = $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret,
        );

        return ApiResponse::success([
            'secret' => $secret,
            'provisioning_uri' => $provisioningUri,
        ]);
    }

    /**
     * Confirm MFA enrollment: verify the first TOTP code and mark MFA as enabled.
     * Generates recovery codes and returns them once (plaintext).
     */
    public function confirm(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'size:6', 'regex:/^\d{6}$/']]);

        /** @var User $user */
        $user = $request->user();

        if ($user->mfa_enabled) {
            return ApiResponse::fail(['message' => 'MFA is already enabled.'], 409);
        }

        if (! $user->mfa_secret) {
            return ApiResponse::fail(['message' => 'MFA setup has not been initiated.'], 422);
        }

        $valid = $this->google2fa->verifyKey($user->mfa_secret, $request->input('code'));

        if (! $valid) {
            return ApiResponse::fail(['code' => ['Invalid authentication code.']], 422);
        }

        $recoveryCodes = $this->generateRecoveryCodes();

        $user->forceFill([
            'mfa_enabled' => true,
            'mfa_recovery_codes' => $recoveryCodes,
        ])->save();

        $this->audit->log('auth.mfa_enabled', actor: $user);

        return ApiResponse::success([
            'message' => 'MFA has been enabled.',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Verify a TOTP code against a challenge token issued during login.
     * On success, revokes the challenge token and issues a full session token.
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:16']]);

        /** @var User $user */
        $user = $request->user();

        // Ensure this route is only accessible with an mfa:verify scoped token.
        if (! $request->user()->tokenCan('mfa:verify')) {
            return ApiResponse::fail(['message' => 'Invalid token scope.'], 403);
        }

        $code = (string) $request->input('code');

        // Support recovery codes (alphanumeric, 10-char segments).
        if (strlen($code) > 8) {
            return $this->verifyRecoveryCode($user, $code, $request);
        }

        if (! $user->mfa_secret) {
            return ApiResponse::fail(['message' => 'MFA is not configured.'], 422);
        }

        $valid = $this->google2fa->verifyKey($user->mfa_secret, $code);

        if (! $valid) {
            $this->audit->log('auth.mfa_failed', actor: $user);

            return ApiResponse::fail(['code' => ['Invalid or expired authentication code.']], 422);
        }

        return $this->completeMfaLogin($user, $request);
    }

    /**
     * Disable MFA (requires current TOTP code to confirm identity).
     */
    public function disable(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'size:6', 'regex:/^\d{6}$/']]);

        /** @var User $user */
        $user = $request->user();

        if (! $user->mfa_enabled) {
            return ApiResponse::fail(['message' => 'MFA is not enabled.'], 409);
        }

        $valid = $this->google2fa->verifyKey($user->mfa_secret, $request->input('code'));

        if (! $valid) {
            return ApiResponse::fail(['code' => ['Invalid authentication code.']], 422);
        }

        $user->forceFill([
            'mfa_enabled' => false,
            'mfa_secret' => null,
            'mfa_recovery_codes' => null,
        ])->save();

        $this->audit->log('auth.mfa_disabled', actor: $user);

        return ApiResponse::success(['message' => 'MFA has been disabled.']);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function verifyRecoveryCode(User $user, string $code, Request $request): JsonResponse
    {
        $codes = $user->mfa_recovery_codes ?? [];
        $codeNormalized = strtolower(str_replace('-', '', $code));

        $index = null;
        foreach ($codes as $i => $stored) {
            if (hash_equals(strtolower(str_replace('-', '', $stored)), $codeNormalized)) {
                $index = $i;
                break;
            }
        }

        if ($index === null) {
            return ApiResponse::fail(['code' => ['Invalid recovery code.']], 422);
        }

        // Consume the recovery code (single-use).
        array_splice($codes, $index, 1);
        $user->forceFill(['mfa_recovery_codes' => $codes])->save();

        $this->audit->log('auth.mfa_recovery_used', actor: $user, metadata: [
            'remaining_codes' => count($codes),
        ]);

        return $this->completeMfaLogin($user, $request);
    }

    private function completeMfaLogin(User $user, Request $request): JsonResponse
    {
        // Revoke the challenge token.
        $user->currentAccessToken()->delete();

        // Issue a full session token.
        $deviceName = $request->input('device_name', $request->userAgent() ?? 'unknown-device');
        $token = $user->createToken($deviceName);

        $user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'failed_login_attempts' => 0,
        ])->save();

        $this->audit->log('auth.mfa_verified', actor: $user);

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'user' => new UserResource($user->load('roles.permissions')),
        ]);
    }

    /** @return string[] */
    private function generateRecoveryCodes(): array
    {
        return array_map(
            fn () => strtoupper(Str::random(5)).'-'.strtoupper(Str::random(5)),
            range(1, 8),
        );
    }
}
