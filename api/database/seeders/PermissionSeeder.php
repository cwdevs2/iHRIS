<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Catalog of base permissions seeded into the system. Each row is
     * [module, feature, action, display_name].
     *
     * Future modules append to this list; running the seeder is idempotent.
     */
    private const CATALOG = [
        // Core / Admin
        ['core', 'audit_logs', 'view', 'View audit logs'],
        ['core', 'roles', 'view', 'View roles'],
        ['core', 'roles', 'create', 'Create roles'],
        ['core', 'roles', 'edit', 'Edit roles & permissions'],
        ['core', 'roles', 'delete', 'Delete roles'],

        // User Accounts
        ['users', 'accounts', 'view', 'View user accounts'],
        ['users', 'accounts', 'create', 'Create user accounts'],
        ['users', 'accounts', 'edit', 'Edit user accounts'],
        ['users', 'accounts', 'delete', 'Deactivate user accounts'],

        // HR / Employees
        ['hr', 'employees', 'view', 'View employee records'],
        ['hr', 'employees', 'view_sensitive', 'View sensitive employee data (salary, gov IDs)'],
        ['hr', 'employees', 'create', 'Create employee records'],
        ['hr', 'employees', 'edit', 'Edit employee records'],
        ['hr', 'employees', 'delete', 'Archive employee records'],
        ['hr', 'employees', 'export', 'Export employee data'],
        ['hr', 'departments', 'view', 'View departments'],
        ['hr', 'departments', 'create', 'Create departments'],
        ['hr', 'departments', 'edit', 'Edit departments'],
        ['hr', 'departments', 'delete', 'Archive departments'],
        ['hr', 'positions', 'view', 'View positions'],
        ['hr', 'positions', 'create', 'Create positions'],
        ['hr', 'positions', 'edit', 'Edit positions'],
        ['hr', 'positions', 'delete', 'Archive positions'],

        // HR / Onboarding
        ['hr', 'onboarding', 'view', 'View onboarding checklists & assignments'],
        ['hr', 'onboarding', 'manage', 'Manage onboarding (create, assign, complete tasks)'],

        // HR / Tickets
        ['hr', 'tickets', 'view', 'View HR tickets'],
        ['hr', 'tickets', 'create', 'File HR tickets'],
        ['hr', 'tickets', 'manage', 'Manage and respond to HR tickets'],

        // Attendance
        ['attendance', 'logs', 'view', 'View attendance logs'],
        ['attendance', 'logs', 'edit', 'Approve attendance corrections'],
        ['attendance', 'schedules', 'view', 'View schedules'],
        ['attendance', 'schedules', 'edit', 'Manage schedules'],

        // Leaves
        ['leaves', 'requests', 'view', 'View leave requests'],
        ['leaves', 'requests', 'create', 'File leave requests'],
        ['leaves', 'requests', 'approve', 'Approve leave requests'],

        // Payroll
        ['payroll', 'runs', 'view', 'View payroll runs'],
        ['payroll', 'runs', 'create', 'Generate payroll'],
        ['payroll', 'runs', 'finalize', 'Finalize payroll'],
        ['payroll', 'payslips', 'view_own', 'View own payslip'],
        ['payroll', 'payslips', 'view_all', 'View all payslips'],

        // ESS
        ['ess', 'self', 'view', 'Access self-service portal'],
    ];

    public function run(): void
    {
        foreach (self::CATALOG as [$module, $feature, $action, $displayName]) {
            Permission::updateOrCreate(
                compact('module', 'feature', 'action'),
                ['display_name' => $displayName],
            );
        }
    }
}
