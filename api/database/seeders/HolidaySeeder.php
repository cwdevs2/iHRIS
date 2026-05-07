<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Holiday;
use Illuminate\Database\Seeder;

/**
 * Philippine national holidays — sample seed for 2026 (current calendar year).
 * Movable feasts (Eid'l Fitr, Chinese New Year, Holy Week) are typically declared
 * by Presidential Proclamation each year; HR Admin can add the official dates
 * via the holiday calendar UI without a code deploy.
 */
class HolidaySeeder extends Seeder
{
    /** @var list<array{date: string, name: string, type: string, recurring: bool}> */
    private const HOLIDAYS_2026 = [
        // Regular holidays (RA 9492 + annual proclamations)
        ['date' => '2026-01-01', 'name' => 'New Year\'s Day',         'type' => 'regular', 'recurring' => true],
        ['date' => '2026-04-09', 'name' => 'Araw ng Kagitingan',      'type' => 'regular', 'recurring' => true],
        ['date' => '2026-05-01', 'name' => 'Labor Day',               'type' => 'regular', 'recurring' => true],
        ['date' => '2026-06-12', 'name' => 'Independence Day',        'type' => 'regular', 'recurring' => true],
        ['date' => '2026-08-31', 'name' => 'National Heroes Day',     'type' => 'regular', 'recurring' => false],
        ['date' => '2026-11-30', 'name' => 'Bonifacio Day',           'type' => 'regular', 'recurring' => true],
        ['date' => '2026-12-25', 'name' => 'Christmas Day',           'type' => 'regular', 'recurring' => true],
        ['date' => '2026-12-30', 'name' => 'Rizal Day',               'type' => 'regular', 'recurring' => true],

        // Special non-working days
        ['date' => '2026-08-21', 'name' => 'Ninoy Aquino Day',        'type' => 'special_non_working', 'recurring' => true],
        ['date' => '2026-11-01', 'name' => 'All Saints\' Day',        'type' => 'special_non_working', 'recurring' => true],
        ['date' => '2026-12-08', 'name' => 'Feast of the Immaculate Conception', 'type' => 'special_non_working', 'recurring' => true],
        ['date' => '2026-12-31', 'name' => 'Last Day of the Year',    'type' => 'special_non_working', 'recurring' => true],
    ];

    public function run(): void
    {
        foreach (self::HOLIDAYS_2026 as $row) {
            Holiday::updateOrCreate(
                ['holiday_date' => $row['date'], 'name' => $row['name']],
                [
                    'type' => $row['type'],
                    'is_recurring' => $row['recurring'],
                ],
            );
        }
    }
}
