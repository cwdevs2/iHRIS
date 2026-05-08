<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\LeaveType;
use Illuminate\Database\Seeder;

class LeaveTypeSeeder extends Seeder
{
    /** System-defined PH leave types. */
    private const TYPES = [
        ['code' => 'vl',          'name' => 'Vacation Leave',            'default_credits' => 15, 'requires_attachment' => false, 'is_paid' => true,  'is_system' => true],
        ['code' => 'sl',          'name' => 'Sick Leave',                 'default_credits' => 15, 'requires_attachment' => true,  'is_paid' => true,  'is_system' => true],
        ['code' => 'emergency',   'name' => 'Emergency Leave',            'default_credits' => 5,  'requires_attachment' => false, 'is_paid' => true,  'is_system' => true],
        ['code' => 'maternity',   'name' => 'Maternity Leave',            'default_credits' => 105,'requires_attachment' => true,  'is_paid' => true,  'is_system' => true],
        ['code' => 'paternity',   'name' => 'Paternity Leave',            'default_credits' => 7,  'requires_attachment' => true,  'is_paid' => true,  'is_system' => true],
        ['code' => 'solo_parent', 'name' => 'Solo Parent Leave',          'default_credits' => 7,  'requires_attachment' => true,  'is_paid' => true,  'is_system' => true],
        ['code' => 'sil',         'name' => 'Service Incentive Leave',    'default_credits' => 5,  'requires_attachment' => false, 'is_paid' => true,  'is_system' => true],
        ['code' => 'unpaid',      'name' => 'Unpaid Leave',               'default_credits' => 0,  'requires_attachment' => false, 'is_paid' => false, 'is_system' => true],
    ];

    public function run(): void
    {
        foreach (self::TYPES as $type) {
            LeaveType::firstOrCreate(
                ['code' => $type['code']],
                array_merge($type, ['is_active' => true]),
            );
        }
    }
}
