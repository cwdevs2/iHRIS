import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  GitFork,
  ClipboardList,
  Ticket,
  Clock,
  CalendarRange,
  CalendarDays,
  Banknote,
  Receipt,
  ShieldCheck,
  FileText,
  Bell,
  Search,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import { useLogout } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Required permission key (module.feature.action). Optional when always shown. */
  permission?: string;
  /** If the user has this permission, hide the item (used to suppress ESS shortcuts for admins). */
  hideIfPermission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Employees', icon: Users, permission: 'hr.employees.view' },
  { to: '/organization', label: 'Organization', icon: Building2, permission: 'hr.departments.view' },
  { to: '/org-chart', label: 'Org Chart', icon: GitFork, permission: 'hr.departments.view' },
  { to: '/onboarding', label: 'Onboarding', icon: ClipboardList, permission: 'hr.onboarding.view' },
  { to: '/tickets', label: 'HR Helpdesk', icon: Ticket, permission: 'hr.tickets.view' },
  { to: '/attendance', label: 'Attendance', icon: Clock, permission: 'attendance.logs.view' },
  { to: '/schedule', label: 'Schedule', icon: CalendarRange, permission: 'attendance.logs.view' },
  { to: '/leaves', label: 'Leaves', icon: CalendarDays, permission: 'leaves.requests.view' },
  { to: '/payroll', label: 'Payroll', icon: Banknote, permission: 'payroll.runs.view' },
  { to: '/my-payslips', label: 'My Payslips', icon: Receipt, permission: 'payroll.payslips.view_own', hideIfPermission: 'payroll.payslips.view_all' },
  { to: '/users', label: 'User Accounts', icon: ShieldCheck, permission: 'users.accounts.view' },
  { to: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck, permission: 'core.audit_logs.view' },
  { to: '/reports', label: 'Reports', icon: FileText, permission: 'hr.employees.export' },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const logout = useLogout();
  const location = useLocation();

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.hideIfPermission && hasPermission(item.hideIfPermission)) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen w-full bg-surface-50">
      <aside
        className={cn(
          'sticky top-0 flex h-screen flex-col border-r border-surface-200 bg-surface-0',
          'transition-[width] duration-300 ease-out-strong',
          collapsed ? 'w-[72px]' : 'w-[260px]',
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Logo showText={!collapsed} />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="flex flex-col gap-0.5">
            {visibleNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                      'transition-[background-color,color] duration-200 ease-out-strong',
                      'cursor-pointer',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <motion.span
                          layoutId="active-pill"
                          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-brand-600"
                          transition={{ duration: 0.3, ease: easeOutStrong }}
                        />
                      ) : null}
                      <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
                      {!collapsed ? (
                        <span className="truncate">{item.label}</span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-surface-200 p-3">
          <button
            onClick={() => setCollapsed((s) => !s)}
            className={cn(
              'pressable flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-surface-500 hover:bg-surface-100 hover:text-surface-900 cursor-pointer',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-surface-200 bg-surface-0/80 px-6 backdrop-blur-md">
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="search"
              placeholder="Search employees, requests, payslips…"
              className="h-10 w-full rounded-lg border border-surface-200 bg-surface-50 pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-600/15 transition-[background-color,box-shadow] duration-200 ease-out-strong"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="pressable relative grid h-10 w-10 place-items-center rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-900 cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cta-500" />
            </button>

            <div className="ml-2 flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-3 py-1.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {user?.first_name.charAt(0)}{user?.last_name.charAt(0)}
              </div>
              <div className="hidden flex-col leading-tight md:flex">
                <span className="text-xs font-semibold text-surface-900">{user?.full_name}</span>
                <span className="text-[10px] uppercase tracking-wide text-surface-400">
                  {user?.roles[0]?.display_name ?? 'User'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                onClick={() => logout.mutate()}
                loading={logout.isPending}
                className="h-8 w-8"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: easeOutStrong }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
