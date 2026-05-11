import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Users, Save, Plus, Trash2, Pencil, Copy,
  Search, ChevronDown, ChevronUp, Lock, CheckCircle2, MinusCircle,
  Briefcase, BarChart2, Settings, Users2, Wrench, Clock, DollarSign,
  UserCheck, Plug, ScrollText, Boxes, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  hierarchy_level: number;
  is_system: boolean;
  permissions: string[];
  users_count: number;
  created_at: string;
}

// ─── Permission metadata ──────────────────────────────────────────────────────
// Keys are "module.feature.action" — matching PermissionSeeder::CATALOG.

const PERMISSION_META: Record<string, { label: string; description: string }> = {
  // Core / Admin
  'core.audit_logs.view':   { label: 'View Audit Logs',        description: 'Browse the system-wide activity audit trail' },
  'core.roles.view':        { label: 'View Roles',             description: 'See role definitions and their permissions' },
  'core.roles.create':      { label: 'Create Roles',           description: 'Add new roles and clone existing ones' },
  'core.roles.edit':        { label: 'Edit Roles',             description: 'Modify role permissions and rename roles' },
  'core.roles.delete':      { label: 'Delete Roles',           description: 'Remove custom roles from the system' },
  // User Accounts
  'users.accounts.view':    { label: 'View User Accounts',     description: 'Browse user accounts and assigned roles' },
  'users.accounts.create':  { label: 'Create Users',           description: 'Register new user accounts' },
  'users.accounts.edit':    { label: 'Edit Users',             description: 'Modify accounts and reassign roles' },
  'users.accounts.delete':  { label: 'Deactivate Users',       description: 'Deactivate or remove user accounts' },
  // HR — Employees
  'hr.employees.view':           { label: 'View Employees',         description: 'Browse and search employee records' },
  'hr.employees.view_sensitive': { label: 'View Sensitive Data',    description: 'Access salary figures and government IDs' },
  'hr.employees.create':         { label: 'Create Employees',       description: 'Onboard new employee records' },
  'hr.employees.edit':           { label: 'Edit Employees',         description: 'Update employee information' },
  'hr.employees.delete':         { label: 'Archive Employees',      description: 'Soft-delete employee records' },
  'hr.employees.export':         { label: 'Export Employees',       description: 'Download employee data exports' },
  // HR — Departments & Positions
  'hr.departments.view':    { label: 'View Departments',       description: 'Browse the department tree' },
  'hr.departments.create':  { label: 'Create Departments',     description: 'Add new departments' },
  'hr.departments.edit':    { label: 'Edit Departments',       description: 'Rename and reconfigure departments' },
  'hr.departments.delete':  { label: 'Archive Departments',    description: 'Remove departments from the hierarchy' },
  'hr.positions.view':      { label: 'View Positions',         description: 'Browse position definitions' },
  'hr.positions.create':    { label: 'Create Positions',       description: 'Add new job positions' },
  'hr.positions.edit':      { label: 'Edit Positions',         description: 'Update position details' },
  'hr.positions.delete':    { label: 'Archive Positions',      description: 'Remove obsolete positions' },
  // HR — Onboarding & Tickets
  'hr.onboarding.view':     { label: 'View Onboarding',        description: 'See onboarding checklists and assignments' },
  'hr.onboarding.manage':   { label: 'Manage Onboarding',      description: 'Create, assign, and complete onboarding tasks' },
  'hr.tickets.view':        { label: 'View HR Tickets',        description: 'Browse submitted HR helpdesk tickets' },
  'hr.tickets.create':      { label: 'File HR Tickets',        description: 'Submit new HR support requests' },
  'hr.tickets.manage':      { label: 'Manage HR Tickets',      description: 'Respond to and close HR tickets' },
  // Attendance
  'attendance.logs.view':      { label: 'View Attendance',        description: 'View employee attendance logs' },
  'attendance.logs.edit':      { label: 'Manage Attendance',      description: 'Approve correction requests and edit logs' },
  'attendance.schedules.view': { label: 'View Schedules',         description: 'See shift schedules' },
  'attendance.schedules.edit': { label: 'Manage Schedules',       description: 'Create and modify shift schedules' },
  // Leaves
  'leaves.requests.view':    { label: 'View Leave Requests',    description: 'Browse all leave requests' },
  'leaves.requests.create':  { label: 'File Leave Requests',    description: 'Submit leave applications' },
  'leaves.requests.approve': { label: 'Approve Leave',          description: 'Approve or reject leave requests' },
  // Payroll — Periods & Runs
  'payroll.periods.view':    { label: 'View Periods',           description: 'Browse payroll periods' },
  'payroll.periods.manage':  { label: 'Manage Periods',         description: 'Create and update payroll periods' },
  'payroll.runs.view':       { label: 'View Payroll Runs',      description: 'See generated payroll runs' },
  'payroll.runs.create':     { label: 'Generate Payroll',       description: 'Trigger payroll run generation' },
  'payroll.runs.edit':       { label: 'Edit Payroll Runs',      description: 'Modify draft payroll runs' },
  'payroll.runs.finalize':   { label: 'Finalize Payroll',       description: 'Lock and finalize payroll runs' },
  'payroll.runs.cancel':     { label: 'Cancel Payroll Runs',    description: 'Cancel draft payroll runs' },
  'payroll.runs.mark_paid':  { label: 'Mark Runs Paid',         description: 'Mark finalized runs as disbursed' },
  // Payroll — Payslips & Loans
  'payroll.payslips.view_own': { label: 'View Own Payslip',     description: 'Access personal payslip history' },
  'payroll.payslips.view_all': { label: 'View All Payslips',    description: 'Access payslips for all employees' },
  'payroll.payslips.export':   { label: 'Export Payslips',      description: 'Download payslip PDFs' },
  'payroll.loans.view':        { label: 'View Loans',           description: 'Browse employee loan records' },
  'payroll.loans.manage':      { label: 'Manage Loans',         description: 'Create and update loan schedules' },
  'payroll.reports.view':      { label: 'Compliance Reports',   description: 'Generate SSS, PhilHealth, Pag-IBIG, BIR reports' },
  'payroll.tables.manage':     { label: 'Manage Tax Tables',    description: 'Update statutory contribution tables' },
  'payroll.final_pay.manage':          { label: 'Final Pay',           description: 'Compute separation / final pay' },
  'payroll.thirteenth_month.manage':   { label: '13th-Month Pay',      description: 'Generate 13th-month payroll runs' },
  // ESS
  'ess.self.access':           { label: 'ESS Portal Access',    description: 'Use the employee self-service portal' },
  // Recruitment
  'recruitment.jobs.view':     { label: 'View Job Openings',    description: 'Browse requisitions and postings' },
  'recruitment.jobs.create':   { label: 'Create Job Openings',  description: 'Create requisitions and postings' },
  'recruitment.jobs.approve':  { label: 'Approve Requisitions', description: 'Approve or reject job requisitions' },
  'recruitment.applicants.view':   { label: 'View Applicants',  description: 'Browse the applicant pipeline' },
  'recruitment.applicants.manage': { label: 'Manage Applicants',description: 'Advance stages and manage applicants' },
  'recruitment.offers.manage':     { label: 'Manage Offer Letters', description: 'Generate and send offer letters' },
  // Performance
  'performance.cycles.manage': { label: 'Manage Review Cycles', description: 'Create and run performance review cycles' },
  'performance.goals.manage':  { label: 'Manage Goals',         description: 'Create and track performance goals' },
  'performance.reviews.view':  { label: 'View Reviews',         description: 'Read performance review submissions' },
  'performance.reviews.manage':{ label: 'Manage Reviews',       description: 'Submit and finalize performance reviews' },
  // Reports & Analytics
  'reports.analytics.view':    { label: 'View Reports',         description: 'Access the analytics & reports dashboard' },
  'reports.analytics.export':  { label: 'Export Reports',       description: 'Download reports as Excel / CSV / PDF' },
  // Assets
  'assets.inventory.view':     { label: 'View Assets',          description: 'Browse the asset inventory' },
  'assets.inventory.manage':   { label: 'Manage Assets',        description: 'Create, edit, and retire assets' },
  'assets.assignments.manage': { label: 'Assign Assets',        description: 'Assign and return assets to employees' },
  'assets.maintenance.manage': { label: 'Asset Maintenance',    description: 'Log and schedule asset maintenance' },
  // Compliance
  'compliance.policies.view':       { label: 'View Policies',         description: 'Browse company policies and versions' },
  'compliance.policies.manage':     { label: 'Manage Policies',       description: 'Publish and version company policies' },
  'compliance.policies.acknowledge':{ label: 'Acknowledge Policies',  description: 'Mark policies as read (employee)' },
  'compliance.filings.view':        { label: 'View Filings',          description: 'See regulatory filing reminders' },
  'compliance.filings.manage':      { label: 'Manage Filings',        description: 'Manage regulatory filing schedules' },
  // Integrations
  'integrations.keys.view':      { label: 'View API Keys',       description: 'See configured API keys' },
  'integrations.keys.manage':    { label: 'Manage API Keys',     description: 'Create and revoke API keys' },
  'integrations.webhooks.view':  { label: 'View Webhooks',       description: 'Browse webhook subscriptions and logs' },
  'integrations.webhooks.manage':{ label: 'Manage Webhooks',     description: 'Create and update webhook subscriptions' },
  'integrations.logs.view':      { label: 'Integration Logs',    description: 'View integration request logs' },
};

// ─── Permission dependencies (enabling X auto-enables deps) ──────────────────

const PERMISSION_DEPS: Record<string, string[]> = {
  'core.roles.create':      ['core.roles.view'],
  'core.roles.edit':        ['core.roles.view'],
  'core.roles.delete':      ['core.roles.view'],
  'users.accounts.create':  ['users.accounts.view'],
  'users.accounts.edit':    ['users.accounts.view'],
  'users.accounts.delete':  ['users.accounts.view'],
  'hr.employees.view_sensitive': ['hr.employees.view'],
  'hr.employees.create':    ['hr.employees.view'],
  'hr.employees.edit':      ['hr.employees.view'],
  'hr.employees.delete':    ['hr.employees.view'],
  'hr.employees.export':    ['hr.employees.view'],
  'hr.departments.create':  ['hr.departments.view'],
  'hr.departments.edit':    ['hr.departments.view'],
  'hr.departments.delete':  ['hr.departments.view'],
  'hr.positions.create':    ['hr.positions.view'],
  'hr.positions.edit':      ['hr.positions.view'],
  'hr.positions.delete':    ['hr.positions.view'],
  'hr.onboarding.manage':   ['hr.onboarding.view'],
  'hr.tickets.manage':      ['hr.tickets.view'],
  'attendance.logs.edit':   ['attendance.logs.view'],
  'attendance.schedules.edit': ['attendance.schedules.view'],
  'leaves.requests.approve': ['leaves.requests.view'],
  'payroll.periods.manage': ['payroll.periods.view'],
  'payroll.runs.create':    ['payroll.runs.view'],
  'payroll.runs.edit':      ['payroll.runs.view', 'payroll.runs.create'],
  'payroll.runs.finalize':  ['payroll.runs.view', 'payroll.runs.create'],
  'payroll.runs.cancel':    ['payroll.runs.view'],
  'payroll.runs.mark_paid': ['payroll.runs.view', 'payroll.runs.finalize'],
  'payroll.payslips.view_all':  ['payroll.payslips.view_own'],
  'payroll.payslips.export':    ['payroll.payslips.view_own'],
  'payroll.loans.manage':   ['payroll.loans.view'],
  'payroll.final_pay.manage':         ['payroll.runs.view'],
  'payroll.thirteenth_month.manage':  ['payroll.runs.view'],
  'recruitment.jobs.create':  ['recruitment.jobs.view'],
  'recruitment.jobs.approve': ['recruitment.jobs.view'],
  'recruitment.applicants.manage': ['recruitment.applicants.view'],
  'recruitment.offers.manage':     ['recruitment.applicants.view'],
  'performance.goals.manage':   ['performance.reviews.view'],
  'performance.cycles.manage':  ['performance.reviews.view'],
  'performance.reviews.manage': ['performance.reviews.view'],
  'reports.analytics.export':   ['reports.analytics.view'],
  'assets.inventory.manage':    ['assets.inventory.view'],
  'assets.assignments.manage':  ['assets.inventory.view'],
  'assets.maintenance.manage':  ['assets.inventory.view'],
  'compliance.policies.manage': ['compliance.policies.view'],
  'compliance.filings.manage':  ['compliance.filings.view'],
  'integrations.keys.manage':   ['integrations.keys.view'],
  'integrations.webhooks.manage': ['integrations.webhooks.view'],
};

function buildReverseDeps(): Record<string, string[]> {
  const rev: Record<string, string[]> = {};
  for (const [perm, deps] of Object.entries(PERMISSION_DEPS)) {
    for (const dep of deps) {
      if (!rev[dep]) rev[dep] = [];
      rev[dep].push(perm);
    }
  }
  return rev;
}
const REVERSE_DEPS = buildReverseDeps();

// ─── Module map ───────────────────────────────────────────────────────────────

const MODULE_MAP: { group: string; label: string; permissions: string[] }[] = [
  { group: 'Admin', label: 'Roles & Permissions',
    permissions: ['core.roles.view', 'core.roles.create', 'core.roles.edit', 'core.roles.delete'] },
  { group: 'Admin', label: 'Audit Logs',
    permissions: ['core.audit_logs.view'] },
  { group: 'Admin', label: 'User Accounts',
    permissions: ['users.accounts.view', 'users.accounts.create', 'users.accounts.edit', 'users.accounts.delete'] },
  { group: 'HR', label: 'Employees',
    permissions: ['hr.employees.view', 'hr.employees.view_sensitive', 'hr.employees.create', 'hr.employees.edit', 'hr.employees.delete', 'hr.employees.export'] },
  { group: 'HR', label: 'Organization',
    permissions: ['hr.departments.view', 'hr.departments.create', 'hr.departments.edit', 'hr.departments.delete', 'hr.positions.view', 'hr.positions.create', 'hr.positions.edit', 'hr.positions.delete'] },
  { group: 'HR', label: 'Onboarding',
    permissions: ['hr.onboarding.view', 'hr.onboarding.manage'] },
  { group: 'HR', label: 'HR Helpdesk',
    permissions: ['hr.tickets.view', 'hr.tickets.create', 'hr.tickets.manage'] },
  { group: 'Attendance', label: 'Attendance Logs',
    permissions: ['attendance.logs.view', 'attendance.logs.edit'] },
  { group: 'Attendance', label: 'Schedules',
    permissions: ['attendance.schedules.view', 'attendance.schedules.edit'] },
  { group: 'Attendance', label: 'Leave Requests',
    permissions: ['leaves.requests.view', 'leaves.requests.create', 'leaves.requests.approve'] },
  { group: 'Payroll', label: 'Periods & Runs',
    permissions: ['payroll.periods.view', 'payroll.periods.manage', 'payroll.runs.view', 'payroll.runs.create', 'payroll.runs.edit', 'payroll.runs.finalize', 'payroll.runs.cancel', 'payroll.runs.mark_paid'] },
  { group: 'Payroll', label: 'Payslips & Loans',
    permissions: ['payroll.payslips.view_own', 'payroll.payslips.view_all', 'payroll.payslips.export', 'payroll.loans.view', 'payroll.loans.manage'] },
  { group: 'Payroll', label: 'Statutory & Reports',
    permissions: ['payroll.reports.view', 'payroll.tables.manage', 'payroll.final_pay.manage', 'payroll.thirteenth_month.manage'] },
  { group: 'ESS', label: 'Self-Service Portal',
    permissions: ['ess.self.access'] },
  { group: 'Recruitment', label: 'Jobs & Applicants',
    permissions: ['recruitment.jobs.view', 'recruitment.jobs.create', 'recruitment.jobs.approve', 'recruitment.applicants.view', 'recruitment.applicants.manage', 'recruitment.offers.manage'] },
  { group: 'Performance', label: 'Reviews & Goals',
    permissions: ['performance.cycles.manage', 'performance.goals.manage', 'performance.reviews.view', 'performance.reviews.manage'] },
  { group: 'Utilities', label: 'Reports & Analytics',
    permissions: ['reports.analytics.view', 'reports.analytics.export'] },
  { group: 'Utilities', label: 'Asset Management',
    permissions: ['assets.inventory.view', 'assets.inventory.manage', 'assets.assignments.manage', 'assets.maintenance.manage'] },
  { group: 'Utilities', label: 'Compliance',
    permissions: ['compliance.policies.view', 'compliance.policies.manage', 'compliance.policies.acknowledge', 'compliance.filings.view', 'compliance.filings.manage'] },
  { group: 'Utilities', label: 'Integrations',
    permissions: ['integrations.keys.view', 'integrations.keys.manage', 'integrations.webhooks.view', 'integrations.webhooks.manage', 'integrations.logs.view'] },
];

const ALL_PERMISSIONS = MODULE_MAP.flatMap((m) => m.permissions);

const GROUPED_MODULES = MODULE_MAP.reduce<Record<string, typeof MODULE_MAP>>((acc, mod) => {
  if (!acc[mod.group]) acc[mod.group] = [];
  acc[mod.group].push(mod);
  return acc;
}, {});

const GROUP_META: Record<string, { icon: React.ReactNode; color: string }> = {
  Admin:       { icon: <Settings className="w-4 h-4" />,    color: '#ef4444' },
  HR:          { icon: <Users2 className="w-4 h-4" />,      color: '#3b82f6' },
  Attendance:  { icon: <Clock className="w-4 h-4" />,       color: '#8b5cf6' },
  Payroll:     { icon: <DollarSign className="w-4 h-4" />,  color: '#10b981' },
  ESS:         { icon: <UserCheck className="w-4 h-4" />,   color: '#f59e0b' },
  Recruitment: { icon: <Briefcase className="w-4 h-4" />,   color: '#06b6d4' },
  Performance: { icon: <TrendingUp className="w-4 h-4" />,  color: '#a855f7' },
  Utilities:   { icon: <Wrench className="w-4 h-4" />,      color: '#64748b' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function enableWithDeps(perm: string, current: Set<string>): Set<string> {
  const next = new Set(current);
  const queue = [perm];
  while (queue.length) {
    const p = queue.shift()!;
    if (!next.has(p)) {
      next.add(p);
      (PERMISSION_DEPS[p] ?? []).forEach((d) => queue.push(d));
    }
  }
  return next;
}

function disableWithCascade(perm: string, current: Set<string>): Set<string> {
  const next = new Set(current);
  const queue = [perm];
  while (queue.length) {
    const p = queue.shift()!;
    if (next.has(p)) {
      next.delete(p);
      (REVERSE_DEPS[p] ?? []).forEach((d) => queue.push(d));
    }
  }
  return next;
}

// ─── PermToggle ───────────────────────────────────────────────────────────────

function PermToggle({
  on, partial = false, disabled, size = 'md', onToggle, label,
}: {
  on: boolean; partial?: boolean; disabled: boolean;
  size?: 'sm' | 'md'; onToggle: () => void; label: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'h-4 w-7' : 'h-5 w-9',
        on ? 'bg-brand-600' : partial ? 'bg-amber-400' : 'bg-surface-200',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow transition-transform duration-200',
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
          on
            ? size === 'sm' ? 'translate-x-3' : 'translate-x-4'
            : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ─── ModuleToggleRow ──────────────────────────────────────────────────────────

function ModuleToggleRow({
  mod, localPerms, onToggleModule, onTogglePermission, disabled, search, forceExpand,
}: {
  mod: typeof MODULE_MAP[0];
  localPerms: Set<string>;
  onToggleModule: () => void;
  onTogglePermission: (perm: string) => void;
  disabled: boolean;
  search: string;
  forceExpand: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const enabledCount = mod.permissions.filter((p) => localPerms.has(p)).length;
  const isOn      = enabledCount === mod.permissions.length;
  const isPartial = enabledCount > 0 && !isOn;

  const filteredPerms = search
    ? mod.permissions.filter((p) => {
        const meta = PERMISSION_META[p];
        const q = search.toLowerCase();
        return (
          p.toLowerCase().includes(q) ||
          meta?.label.toLowerCase().includes(q) ||
          meta?.description.toLowerCase().includes(q)
        );
      })
    : mod.permissions;

  const showExpanded = expanded || forceExpand || (!!search && filteredPerms.length > 0);

  if (search && filteredPerms.length === 0) return null;

  return (
    <div className="rounded-xl border border-surface-200 bg-surface-50">
      {/* Module header */}
      <div
        className="flex cursor-pointer select-none items-center justify-between px-4 py-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex flex-1 items-center gap-2.5 truncate">
          <span className="truncate text-sm font-semibold text-surface-800">{mod.label}</span>
          {isPartial && (
            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
              Partial
            </span>
          )}
          <span className="shrink-0 font-mono text-[10px] text-surface-400">
            {enabledCount}/{mod.permissions.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {showExpanded
            ? <ChevronUp className="h-4 w-4 text-surface-400" />
            : <ChevronDown className="h-4 w-4 text-surface-400" />}
          <PermToggle on={isOn} partial={isPartial} disabled={disabled} onToggle={onToggleModule} label={`Toggle ${mod.label}`} />
        </div>
      </div>

      {/* Expanded: individual permissions */}
      <AnimatePresence initial={false}>
        {showExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 border-t border-surface-200 px-4 pb-3 pt-2">
              {filteredPerms.map((perm) => {
                const meta = PERMISSION_META[perm];
                const hasDeps = (PERMISSION_DEPS[perm] ?? []).length > 0;
                return (
                  <div key={perm} className="flex items-center justify-between gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-surface-700">
                          {meta?.label ?? perm}
                        </span>
                        {hasDeps && (
                          <span className="rounded bg-surface-100 px-1 font-mono text-[9px] text-surface-400">
                            deps
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 block text-[10px] text-surface-400">
                        {meta?.description ?? perm}
                      </span>
                    </div>
                    <PermToggle
                      on={localPerms.has(perm)}
                      disabled={disabled}
                      size="sm"
                      onToggle={() => onTogglePermission(perm)}
                      label={`Toggle ${perm}`}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── GroupSection ─────────────────────────────────────────────────────────────

function GroupSection({
  group, modules, localPerms, onToggleGroup, onToggleModule, onTogglePermission, disabled, search, forceExpand,
}: {
  group: string; modules: typeof MODULE_MAP; localPerms: Set<string>;
  onToggleGroup: () => void; onToggleModule: (mod: typeof MODULE_MAP[0]) => void;
  onTogglePermission: (perm: string) => void; disabled: boolean; search: string; forceExpand: boolean;
}) {
  const allPerms     = modules.flatMap((m) => m.permissions);
  const enabledCount = allPerms.filter((p) => localPerms.has(p)).length;
  const isGroupOn    = enabledCount === allPerms.length;
  const meta         = GROUP_META[group];

  const hasAnyMatch = !search || modules.some((mod) =>
    mod.label.toLowerCase().includes(search.toLowerCase()) ||
    mod.permissions.some((p) => {
      const m = PERMISSION_META[p];
      const q = search.toLowerCase();
      return (
        p.toLowerCase().includes(q) ||
        m?.label.toLowerCase().includes(q) ||
        m?.description.toLowerCase().includes(q)
      );
    }),
  );
  if (!hasAnyMatch) return null;

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span style={{ color: meta?.color ?? '#6366f1' }}>{meta?.icon}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-surface-500">{group}</span>
          <span className="font-mono text-[10px] text-surface-400">{enabledCount}/{allPerms.length}</span>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onToggleGroup}
            className={cn(
              'rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors',
              isGroupOn
                ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                : 'bg-surface-100 text-surface-500 hover:bg-surface-200',
            )}
          >
            {isGroupOn ? 'Disable All' : 'Enable All'}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {modules.map((mod) => (
          <ModuleToggleRow
            key={mod.label}
            mod={mod}
            localPerms={localPerms}
            onToggleModule={() => onToggleModule(mod)}
            onTogglePermission={onTogglePermission}
            disabled={disabled}
            search={search}
            forceExpand={forceExpand}
          />
        ))}
      </div>
    </div>
  );
}

// ─── PermissionStats ──────────────────────────────────────────────────────────

function PermissionStats({ localPerms }: { localPerms: Set<string> }) {
  const total   = ALL_PERMISSIONS.length;
  const enabled = ALL_PERMISSIONS.filter((p) => localPerms.has(p)).length;
  const pct     = total === 0 ? 0 : Math.round((enabled / total) * 100);

  return (
    <div className="mb-4 rounded-xl border border-surface-200 bg-surface-50 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-surface-600">Permission Coverage</span>
        <span className="font-mono text-xs font-bold text-brand-600">{enabled}/{total} — {pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-200">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── RoleCard ─────────────────────────────────────────────────────────────────

const SYSTEM_ROLE_VARIANT: Record<string, 'danger' | 'info' | 'warning' | 'success' | 'default'> = {
  super_admin: 'danger',
  hr_admin:    'info',
  manager:     'warning',
  employee:    'success',
};

function RoleCard({
  role, isSelected, canManage, deleting, onSelect, onClone, onRename, onDelete,
}: {
  role: Role; isSelected: boolean; canManage: boolean; deleting: boolean;
  onSelect: () => void;
  onClone: (e: React.MouseEvent) => void;
  onRename: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const pct = ALL_PERMISSIONS.length === 0
    ? 0
    : Math.round((role.permissions.length / ALL_PERMISSIONS.length) * 100);

  return (
    <Card
      className={cn(
        'cursor-pointer p-4 transition-all hover:border-brand-300',
        isSelected && 'border-brand-500 ring-2 ring-brand-500/25',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={SYSTEM_ROLE_VARIANT[role.name] ?? 'default'}>
              {role.display_name}
            </Badge>
            {role.is_system && (
              <span className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-[9px] text-surface-400">
                system
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0 text-surface-400" />
            <span className="text-xs text-surface-500">
              {role.users_count} user{role.users_count !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Mini progress bar */}
          <div className="mt-2.5">
            <div className="mb-1 flex justify-between">
              <span className="font-mono text-[9px] text-surface-400">{role.permissions.length} perms</span>
              <span className="font-mono text-[9px] text-surface-400">{pct}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-surface-200">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: role.name === 'super_admin' ? '#ef4444' : '#2563eb',
                }}
              />
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex shrink-0 flex-col gap-1.5">
            <button
              type="button"
              title="Clone role"
              onClick={onClone}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-100 text-surface-500 transition-colors hover:bg-surface-200"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {!role.is_system && (
              <button
                type="button"
                title="Rename role"
                onClick={onRename}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-100 text-surface-500 transition-colors hover:bg-surface-200"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {!role.is_system && (
              <button
                type="button"
                title="Delete role"
                onClick={onDelete}
                disabled={deleting}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RoleManagementPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyRole    = useAuthStore((s) => s.hasAnyRole);

  const [roles, setRoles]               = useState<Role[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [localPerms, setLocalPerms]     = useState<Set<string>>(new Set());
  const [saving, setSaving]             = useState(false);
  const [dirty, setDirty]               = useState(false);

  const [search, setSearch]             = useState('');
  const [allExpanded, setAllExpanded]   = useState(false);

  // Create modal
  const [createOpen, setCreateOpen]     = useState(false);
  const [newRoleName, setNewRoleName]   = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [creating, setCreating]         = useState(false);

  // Clone modal
  const [cloneOpen, setCloneOpen]       = useState(false);
  const [cloneSource, setCloneSource]   = useState<Role | null>(null);
  const [cloneName, setCloneName]       = useState('');
  const [cloneDisplayName, setCloneDisplayName] = useState('');
  const [cloning, setCloning]           = useState(false);

  // Rename modal
  const [renameOpen, setRenameOpen]     = useState(false);
  const [renameTarget, setRenameTarget] = useState<Role | null>(null);
  const [renameValue, setRenameValue]   = useState('');
  const [renameDisplay, setRenameDisplay] = useState('');
  const [renaming, setRenaming]         = useState(false);

  const [deleting, setDeleting]         = useState(false);

  const canManage     = hasPermission('core.roles.edit');
  const canCreate     = hasPermission('core.roles.create');
  const canDelete     = hasPermission('core.roles.delete');
  const isSuperAdmin  = selectedRole?.name === 'super_admin';
  const isReadOnly    = !canManage || isSuperAdmin;

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchRoles = () => {
    setLoading(true);
    api.get('/roles')
      .then((res) => {
        const list: Role[] = res.data.data.roles;
        setRoles(list);
        if (list.length > 0 && !selectedRole) {
          setSelectedRole(list[0]);
          setLocalPerms(new Set(list[0].permissions));
        }
      })
      .catch(() => toast.error('Failed to load roles'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRoles(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectRole = (role: Role) => {
    if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
    setSelectedRole(role);
    setLocalPerms(new Set(role.permissions));
    setDirty(false);
    setSearch('');
  };

  // ── Permission toggles ────────────────────────────────────────────────────────

  const togglePermission = (perm: string) => {
    if (isReadOnly) return;
    setLocalPerms((prev) =>
      prev.has(perm) ? disableWithCascade(perm, prev) : enableWithDeps(perm, prev),
    );
    setDirty(true);
  };

  const toggleModule = (mod: typeof MODULE_MAP[0]) => {
    if (isReadOnly) return;
    const allOn = mod.permissions.every((p) => localPerms.has(p));
    setLocalPerms((prev) => {
      let next = new Set(prev);
      if (allOn) mod.permissions.forEach((p) => { next = disableWithCascade(p, next); });
      else        mod.permissions.forEach((p) => { next = enableWithDeps(p, next); });
      return next;
    });
    setDirty(true);
  };

  const toggleGroup = (groupModules: typeof MODULE_MAP) => {
    if (isReadOnly) return;
    const allPerms = groupModules.flatMap((m) => m.permissions);
    const allOn = allPerms.every((p) => localPerms.has(p));
    setLocalPerms((prev) => {
      let next = new Set(prev);
      if (allOn) allPerms.forEach((p) => { next = disableWithCascade(p, next); });
      else        allPerms.forEach((p) => { next = enableWithDeps(p, next); });
      return next;
    });
    setDirty(true);
  };

  const selectAll  = () => { if (!isReadOnly) { setLocalPerms(new Set(ALL_PERMISSIONS)); setDirty(true); } };
  const selectNone = () => { if (!isReadOnly) { setLocalPerms(new Set()); setDirty(true); } };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const res = await api.put(`/roles/${selectedRole.id}`, {
        permissions: Array.from(localPerms),
      });
      const updated: Role = res.data.data.role;
      toast.success(`Permissions updated for "${updated.display_name}"`);
      setDirty(false);
      setRoles((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      setSelectedRole(updated);
      setLocalPerms(new Set(updated.permissions));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  // ── Create ────────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newRoleName.trim()) { toast.error('Internal name is required'); return; }
    setCreating(true);
    try {
      const res = await api.post('/roles', {
        name: newRoleName.trim(),
        display_name: newDisplayName.trim() || newRoleName.trim(),
      });
      const created: Role = res.data.data.role;
      toast.success(`Role "${created.display_name}" created`);
      setRoles((prev) => [...prev, created].sort((a, b) => a.hierarchy_level - b.hierarchy_level));
      setCreateOpen(false);
      setNewRoleName('');
      setNewDisplayName('');
      selectRole(created);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { data?: Record<string, string[]>; message?: string } } };
      const errs = e.response?.data?.data;
      toast.error(errs ? Object.values(errs)[0][0] : e.response?.data?.message ?? 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  // ── Rename ────────────────────────────────────────────────────────────────────

  const openRename = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameTarget(role);
    setRenameValue(role.name);
    setRenameDisplay(role.display_name);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    try {
      const res = await api.patch(`/roles/${renameTarget.id}/rename`, {
        name: renameValue.trim(),
        display_name: renameDisplay.trim() || renameValue.trim(),
      });
      const updated: Role = res.data.data.role;
      toast.success(`Role renamed to "${updated.display_name}"`);
      setRoles((prev) => prev.map((r) => r.id === renameTarget.id ? updated : r));
      if (selectedRole?.id === renameTarget.id) {
        setSelectedRole(updated);
      }
      setRenameOpen(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { data?: Record<string, string[]>; message?: string } } };
      const errs = e.response?.data?.data;
      toast.error(errs ? Object.values(errs)[0][0] : e.response?.data?.message ?? 'Failed to rename role');
    } finally {
      setRenaming(false);
    }
  };

  // ── Clone ──────────────────────────────────────────────────────────────────────

  const openClone = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    setCloneSource(role);
    setCloneName(`${role.name}_copy`);
    setCloneDisplayName(`${role.display_name} (Copy)`);
    setCloneOpen(true);
  };

  const handleClone = async () => {
    if (!cloneSource || !cloneName.trim()) return;
    setCloning(true);
    try {
      const res = await api.post(`/roles/${cloneSource.id}/clone`, {
        name: cloneName.trim(),
        display_name: cloneDisplayName.trim() || cloneName.trim(),
      });
      const cloned: Role = res.data.data.role;
      toast.success(res.data.data.message ?? `Role "${cloned.display_name}" cloned`);
      setRoles((prev) => [...prev, cloned].sort((a, b) => a.hierarchy_level - b.hierarchy_level));
      setCloneOpen(false);
      selectRole(cloned);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { data?: Record<string, string[]>; message?: string } } };
      const errs = e.response?.data?.data;
      toast.error(errs ? Object.values(errs)[0][0] : e.response?.data?.message ?? 'Failed to clone role');
    } finally {
      setCloning(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = async (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete role "${role.display_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/roles/${role.id}`);
      toast.success(`Role "${role.display_name}" deleted`);
      const remaining = roles.filter((r) => r.id !== role.id);
      setRoles(remaining);
      if (selectedRole?.id === role.id) {
        const next = remaining[0] ?? null;
        setSelectedRole(next);
        setLocalPerms(new Set(next?.permissions ?? []));
        setDirty(false);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to delete role');
    } finally {
      setDeleting(false);
    }
  };

  // ── Filtered groups ───────────────────────────────────────────────────────────

  const filteredGroupEntries = useMemo(() => {
    if (!search) return Object.entries(GROUPED_MODULES);
    return Object.entries(GROUPED_MODULES).filter(([, modules]) =>
      modules.some((mod) =>
        mod.label.toLowerCase().includes(search.toLowerCase()) ||
        mod.permissions.some((p) => {
          const m = PERMISSION_META[p];
          const q = search.toLowerCase();
          return (
            p.toLowerCase().includes(q) ||
            m?.label.toLowerCase().includes(q) ||
            m?.description.toLowerCase().includes(q)
          );
        }),
      ),
    );
  }, [search]);

  // ── Access guard ──────────────────────────────────────────────────────────────

  if (!hasPermission('core.roles.view') && !hasAnyRole('super_admin', 'hr_admin')) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-surface-400">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-brand-600" />
          <div>
            <h1 className="text-xl font-bold text-surface-900">Role Management</h1>
            <p className="mt-0.5 text-xs text-surface-500">Configure role-based access permissions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <Button
              variant="secondary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => { setNewRoleName(''); setNewDisplayName(''); setCreateOpen(true); }}
            >
              New Role
            </Button>
          )}
          {canManage && dirty && !isSuperAdmin && (
            <Button
              variant="primary"
              leftIcon={<Save className="h-4 w-4" />}
              loading={saving}
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">

          {/* ── Role List ── */}
          <div className="space-y-2 lg:col-span-1">
            <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-surface-400">
              Roles ({roles.length})
            </p>
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                isSelected={selectedRole?.id === role.id}
                canManage={canCreate || canManage || canDelete}
                deleting={deleting}
                onSelect={() => selectRole(role)}
                onClone={(e) => openClone(role, e)}
                onRename={(e) => openRename(role, e)}
                onDelete={(e) => handleDelete(role, e)}
              />
            ))}
          </div>

          {/* ── Permission Editor ── */}
          <div className="lg:col-span-3">
            {selectedRole ? (
              <Card className="p-6">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-surface-900">{selectedRole.display_name}</h2>
                      {isSuperAdmin && (
                        <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200">
                          <Lock className="h-3 w-3" /> Unrestricted
                        </span>
                      )}
                      {selectedRole.is_system && !isSuperAdmin && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 ring-1 ring-blue-200">
                          Built-in
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-surface-500">
                      {isSuperAdmin
                        ? 'Super Admin has unrestricted access. Permissions cannot be modified.'
                        : 'Toggle individual permissions or use group controls. Enabling a permission auto-enables its dependencies.'}
                    </p>
                  </div>
                  {dirty && (
                    <span className="ml-4 shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                      Unsaved changes
                    </span>
                  )}
                </div>

                {!isSuperAdmin && <PermissionStats localPerms={localPerms} />}

                {/* Toolbar */}
                {!isSuperAdmin && (
                  <div className="mb-5 flex flex-wrap items-center gap-2">
                    <div className="relative min-w-48 flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                      <input
                        type="text"
                        className="h-10 w-full rounded-lg border border-surface-200 bg-surface-0 pl-9 pr-8 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                        placeholder="Search permissions…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 hover:text-surface-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setAllExpanded((v) => !v)}
                      title={allExpanded ? 'Collapse all' : 'Expand all'}
                      className="flex h-10 items-center gap-1.5 rounded-lg border border-surface-200 bg-surface-50 px-3 text-xs font-semibold text-surface-600 transition-colors hover:bg-surface-100"
                    >
                      {allExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={selectAll}
                        className="flex h-10 items-center gap-1.5 rounded-lg bg-green-50 px-3 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> All
                      </button>
                    )}

                    {canManage && (
                      <button
                        type="button"
                        onClick={selectNone}
                        className="flex h-10 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                      >
                        <MinusCircle className="h-3.5 w-3.5" /> None
                      </button>
                    )}
                  </div>
                )}

                {/* Permission groups */}
                {isSuperAdmin ? (
                  <div className="space-y-3">
                    {Object.entries(GROUPED_MODULES).map(([group, modules]) => {
                      const gm = GROUP_META[group];
                      return (
                        <div
                          key={group}
                          className="flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-50 px-4 py-3"
                        >
                          <span style={{ color: gm?.color ?? '#6366f1' }}>{gm?.icon}</span>
                          <span className="text-sm font-semibold text-surface-700">{group}</span>
                          <span className="ml-auto text-xs text-surface-400">
                            {modules.flatMap((m) => m.permissions).length} permissions
                          </span>
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-200">
                            Full Access
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : filteredGroupEntries.length === 0 ? (
                  <p className="py-8 text-center text-sm text-surface-400">
                    No permissions match "{search}"
                  </p>
                ) : (
                  filteredGroupEntries.map(([group, modules]) => (
                    <GroupSection
                      key={group}
                      group={group}
                      modules={modules}
                      localPerms={localPerms}
                      onToggleGroup={() => toggleGroup(modules)}
                      onToggleModule={toggleModule}
                      onTogglePermission={togglePermission}
                      disabled={isReadOnly}
                      search={search}
                      forceExpand={allExpanded}
                    />
                  ))
                )}
              </Card>
            ) : (
              <Card className="p-12">
                <p className="text-center text-sm text-surface-400">Select a role to manage its permissions.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Create Role Modal ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Role" maxWidth="sm">
        <div className="px-6 pb-6 pt-4 space-y-4">
          <Input
            label="Display Name"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            placeholder="e.g. Warehouse Staff"
          />
          <Input
            label="Internal Name"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="e.g. warehouse_staff (slug)"
            required
          />
          <p className="text-xs text-surface-400">
            The new role starts with no permissions. Configure access after creating.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={creating}
              disabled={creating || !newRoleName.trim()}
            >
              Create Role
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Clone Role Modal ── */}
      <Dialog open={cloneOpen} onClose={() => setCloneOpen(false)} title="Clone Role" maxWidth="sm">
        <div className="px-6 pb-6 pt-4 space-y-4">
          <div className="rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm">
            <span className="text-surface-500">Cloning from: </span>
            <span className="font-semibold text-surface-800">{cloneSource?.display_name}</span>
            <span className="ml-2 font-mono text-xs text-surface-400">
              ({cloneSource?.permissions.length} permissions)
            </span>
          </div>
          <Input
            label="New Display Name"
            value={cloneDisplayName}
            onChange={(e) => setCloneDisplayName(e.target.value)}
            placeholder="e.g. Senior Sales Clerk"
          />
          <Input
            label="New Internal Name"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleClone(); }}
            placeholder="e.g. senior_sales_clerk"
            required
          />
          <p className="text-xs text-surface-400">
            All permissions from "{cloneSource?.display_name}" will be copied to the new role.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCloneOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleClone}
              loading={cloning}
              disabled={cloning || !cloneName.trim()}
            >
              Clone Role
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Rename Role Modal ── */}
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename Role" maxWidth="sm">
        <div className="px-6 pb-6 pt-4 space-y-4">
          <Input
            label="Display Name"
            value={renameDisplay}
            onChange={(e) => setRenameDisplay(e.target.value)}
            placeholder="Human-readable name"
          />
          <Input
            label="Internal Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
            placeholder="slug_style_name"
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleRename}
              loading={renaming}
              disabled={renaming || !renameValue.trim()}
            >
              Rename
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
