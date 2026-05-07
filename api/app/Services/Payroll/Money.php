<?php

declare(strict_types=1);

namespace App\Services\Payroll;

/**
 * Money helper. Centralises rounding behaviour so every payroll computation
 * uses the same convention.
 *
 * Rule of thumb (per HRIS_MASTER §6 Code Quality):
 *   - All intermediate computations stay as float.
 *   - All persisted amounts are rounded to 2 decimals (peso/centavo).
 *   - Database storage is DECIMAL(15,4), so we never lose precision in transit.
 */
final class Money
{
    /** Round to centavos using banker's rounding ("round half to even") for fairness. */
    public static function round(float $value): float
    {
        return round($value, 2, PHP_ROUND_HALF_EVEN);
    }

    /** Cast to float defensively (Eloquent decimal casts return strings). */
    public static function toFloat(mixed $value): float
    {
        return $value === null ? 0.0 : (float) $value;
    }
}
