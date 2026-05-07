<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            SuperAdminSeeder::class,
            // Phase 4 — Payroll statutory tables
            SssBracketSeeder::class,
            PhilhealthBracketSeeder::class,
            PagibigSettingSeeder::class,
            BirTaxBracketSeeder::class,
            HolidaySeeder::class,
        ]);
    }
}
