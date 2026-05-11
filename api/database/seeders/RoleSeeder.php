<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = Role::updateOrCreate(
            ['name' => 'super_admin'],
            [
                'display_name' => 'Super Administrator',
                'description' => 'Full system access. System-managed role.',
                'hierarchy_level' => 1,
                'is_system' => true,
            ],
        );

        $hrAdmin = Role::updateOrCreate(
            ['name' => 'hr_admin'],
            [
                'display_name' => 'HR Administrator',
                'description' => 'Manages employees, payroll, and compliance.',
                'hierarchy_level' => 10,
                'is_system' => true,
            ],
        );

        $manager = Role::updateOrCreate(
            ['name' => 'manager'],
            [
                'display_name' => 'Manager',
                'description' => 'Approves team requests and views team data.',
                'hierarchy_level' => 50,
                'is_system' => true,
            ],
        );

        $deptHead = Role::updateOrCreate(
            ['name' => 'department_head'],
            [
                'display_name' => 'Department Head',
                'description' => 'Manages employees within their delegated departments.',
                'hierarchy_level' => 30,
                'is_system' => true,
            ],
        );

        $employee = Role::updateOrCreate(
            ['name' => 'employee'],
            [
                'display_name' => 'Employee',
                'description' => 'Self-service portal access.',
                'hierarchy_level' => 100,
                'is_system' => true,
            ],
        );

        // Super admin gets every permission.
        $superAdmin->permissions()->sync(Permission::pluck('id'));

        // HR admin: full HR + employee management; not role/permission management.
        $hrAdmin->permissions()->sync(Permission::query()
            ->whereIn('module', ['hr', 'attendance', 'leaves', 'payroll', 'ess', 'recruitment', 'performance', 'reports', 'assets', 'compliance', 'integrations'])
            ->orWhere(fn ($q) => $q->where('module', 'core')->whereIn('feature', ['users', 'audit_logs']))
            ->pluck('id'));
        // Ensure hr_admin also gets user_groups permissions (included in 'hr' module above).

        // Manager: view team data, approve requests, ESS, view payroll (read-only), performance.
        $manager->permissions()->sync(Permission::query()
            ->where(fn ($q) => $q->whereIn('module', ['hr', 'attendance'])->where('action', 'view'))
            ->orWhere(fn ($q) => $q->where('module', 'leaves'))
            ->orWhere('module', 'ess')
            ->orWhere(fn ($q) => $q->where('module', 'payroll')->whereIn('action', ['view', 'view_own']))
            ->orWhere(fn ($q) => $q->where('module', 'recruitment')->whereIn('action', ['view']))
            ->orWhere(fn ($q) => $q->where('module', 'performance'))
            ->pluck('id'));

        // Department Head: manage their delegated departments' employees, approve leave/attendance.
        $deptHead->permissions()->sync(Permission::query()
            ->where(fn ($q) => $q->where('module', 'hr')
                ->whereIn('feature', ['employees', 'departments', 'positions'])
                ->whereIn('action', ['view', 'edit']))
            ->orWhere(fn ($q) => $q->where('module', 'hr')
                ->where('feature', 'user_groups')
                ->whereIn('action', ['view', 'manage_members']))
            ->orWhere(fn ($q) => $q->where('module', 'attendance'))
            ->orWhere(fn ($q) => $q->where('module', 'leaves'))
            ->orWhere('module', 'ess')
            ->orWhere(fn ($q) => $q->where('module', 'performance'))
            ->pluck('id'));

        // Employee: ESS only + own payslip + can acknowledge policies that target them.
        $employee->permissions()->sync(Permission::query()
            ->where('module', 'ess')
            ->orWhere(fn ($q) => $q->where('module', 'payroll')->where('action', 'view_own'))
            ->orWhere(fn ($q) => $q->where('module', 'leaves')->whereIn('action', ['view', 'create']))
            ->orWhere(fn ($q) => $q->where('module', 'compliance')->where('feature', 'policies')->where('action', 'acknowledge'))
            ->pluck('id'));
    }
}
