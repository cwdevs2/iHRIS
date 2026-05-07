<?php

declare(strict_types=1);

namespace Tests\Unit\Payroll;

use App\Services\Payroll\Money;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_round_uses_bankers_rounding(): void
    {
        // Standard rounding cases
        $this->assertSame(10.12, Money::round(10.123));
        $this->assertSame(10.13, Money::round(10.126));

        // Half-to-even tie-breaking
        $this->assertSame(10.12, Money::round(10.125));   // 10.125 → 10.12 (rounds to even)
        $this->assertSame(10.14, Money::round(10.135));   // 10.135 → 10.14 (rounds to even)
    }

    public function test_to_float_handles_null_and_strings(): void
    {
        $this->assertSame(0.0, Money::toFloat(null));
        $this->assertSame(123.45, Money::toFloat('123.45'));
        $this->assertSame(99.0, Money::toFloat(99));
    }
}
