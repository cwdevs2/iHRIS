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

        // HR / User Groups (department-scoped delegation)
        ['hr', 'user_groups', 'view', 'View user groups'],
        ['hr', 'user_groups', 'create', 'Create user groups'],
        ['hr', 'user_groups', 'edit', 'Edit user groups'],
        ['hr', 'user_groups', 'delete', 'Archive user groups'],
        ['hr', 'user_groups', 'manage_members', 'Add/remove members from user groups'],

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

        // Payroll — Periods
        ['payroll', 'periods', 'view', 'View payroll periods'],
        ['payroll', 'periods', 'manage', 'Create and manage payroll periods'],

        // Payroll — Runs (a single execution against a period)
        ['payroll', 'runs', 'view', 'View payroll runs'],
        ['payroll', 'runs', 'create', 'Generate payroll runs'],
        ['payroll', 'runs', 'edit', 'Edit draft payroll runs'],
        ['payroll', 'runs', 'finalize', 'Finalize / lock payroll runs'],
        ['payroll', 'runs', 'cancel', 'Cancel draft payroll runs'],
        ['payroll', 'runs', 'mark_paid', 'Mark finalized runs as paid'],

        // Payroll — Payslips
        ['payroll', 'payslips', 'view_own', 'View own payslip'],
        ['payroll', 'payslips', 'view_all', 'View all payslips'],
        ['payroll', 'payslips', 'export', 'Export & download payslip PDFs'],

        // Payroll — Loans
        ['payroll', 'loans', 'view', 'View employee loans'],
        ['payroll', 'loans', 'manage', 'Create / manage employee loans'],

        // Payroll — Compliance reports & statutory tables
        ['payroll', 'reports', 'view', 'Run government compliance reports'],
        ['payroll', 'tables', 'manage', 'Update statutory contribution tables'],

        // Payroll — Final pay & 13th month
        ['payroll', 'final_pay', 'manage', 'Compute and finalize separation pay'],
        ['payroll', 'thirteenth_month', 'manage', 'Generate 13th-month payroll runs'],

        // ESS
        ['ess', 'self', 'access', 'Access self-service portal'],

        // Recruitment
        ['recruitment', 'jobs', 'view', 'View job requisitions and postings'],
        ['recruitment', 'jobs', 'create', 'Create job requisitions and postings'],
        ['recruitment', 'jobs', 'approve', 'Approve or reject job requisitions'],
        ['recruitment', 'applicants', 'view', 'View applicant pipeline'],
        ['recruitment', 'applicants', 'manage', 'Manage applicants (advance stage, upload resume)'],
        ['recruitment', 'offers', 'manage', 'Generate and manage offer letters'],

        // Performance
        ['performance', 'cycles', 'manage', 'Create and manage review cycles'],
        ['performance', 'goals', 'manage', 'Create and manage performance goals'],
        ['performance', 'reviews', 'view', 'View performance reviews'],
        ['performance', 'reviews', 'manage', 'Submit and manage performance reviews'],

        // ── Phase 7 ──────────────────────────────────────────────────────────

        // Reports & Analytics
        ['reports', 'analytics', 'view', 'View reports & analytics dashboard'],
        ['reports', 'analytics', 'export', 'Export reports (Excel / CSV / PDF)'],

        // Asset Management
        ['assets', 'inventory', 'view', 'View asset inventory'],
        ['assets', 'inventory', 'manage', 'Create, edit, and retire assets'],
        ['assets', 'assignments', 'manage', 'Assign and return assets'],
        ['assets', 'maintenance', 'manage', 'Log and schedule asset maintenance'],

        // Compliance Management
        ['compliance', 'policies', 'view', 'View company policies'],
        ['compliance', 'policies', 'manage', 'Publish and version company policies'],
        ['compliance', 'policies', 'acknowledge', 'Acknowledge policies (employee)'],
        ['compliance', 'filings', 'view', 'View regulatory filing reminders'],
        ['compliance', 'filings', 'manage', 'Manage regulatory filing schedules'],

        // API Integration & Webhooks
        ['integrations', 'keys', 'view', 'View API keys'],
        ['integrations', 'keys', 'manage', 'Create and revoke API keys'],
        ['integrations', 'webhooks', 'view', 'View webhook subscriptions and deliveries'],
        ['integrations', 'webhooks', 'manage', 'Manage webhook subscriptions'],
        ['integrations', 'logs', 'view', 'View integration request logs'],
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
