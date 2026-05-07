<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * JSend-compliant API responses.
 *
 * @see https://github.com/omniti-labs/jsend
 */
final class ApiResponse
{
    public static function success(mixed $data = null, int $status = 200, array $headers = []): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $data,
        ], $status, $headers);
    }

    public static function fail(mixed $data, int $status = 422, array $headers = []): JsonResponse
    {
        return response()->json([
            'status' => 'fail',
            'data' => $data,
        ], $status, $headers);
    }

    public static function error(string $message, int $status = 500, ?int $code = null, mixed $data = null): JsonResponse
    {
        $payload = [
            'status' => 'error',
            'message' => $message,
        ];

        if ($code !== null) {
            $payload['code'] = $code;
        }

        if ($data !== null) {
            $payload['data'] = $data;
        }

        return response()->json($payload, $status);
    }
}
