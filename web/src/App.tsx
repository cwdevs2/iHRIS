import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { useBootstrapAuth } from '@/hooks/useAuth';
import { RequireAuth, RedirectIfAuthed, RequirePermission } from '@/routes/Guards';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { MfaVerifyPage } from '@/pages/auth/MfaVerifyPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { EmployeesPage } from '@/pages/employees/EmployeesPage';
import { EmployeeDetailPage } from '@/pages/employees/EmployeeDetailPage';
import { OrganizationPage } from '@/pages/organization/OrganizationPage';
import { OrgChartPage } from '@/pages/org-chart/OrgChartPage';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { TicketsPage } from '@/pages/tickets/TicketsPage';
import { TicketDetailPage } from '@/pages/tickets/TicketDetailPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { AuditLogsPage } from '@/pages/audit-logs/AuditLogsPage';
import { AttendancePage } from '@/pages/attendance/AttendancePage';
import { AdminAttendanceManagementPage } from '@/pages/attendance/AdminAttendanceManagementPage';
import { AdminLeaveManagementPage } from '@/pages/leaves/AdminLeaveManagementPage';
import { SchedulePage } from '@/pages/schedule/SchedulePage';
import { LeavesPage } from '@/pages/leaves/LeavesPage';
import { PayrollPage } from '@/pages/payroll/PayrollPage';
import { PayrollRunDetailPage } from '@/pages/payroll/PayrollRunDetailPage';
import { PayslipDetailPage } from '@/pages/payroll/PayslipDetailPage';
import { MyPayslipsPage } from '@/pages/payroll/MyPayslipsPage';
import { ForbiddenPage } from '@/pages/common/ForbiddenPage';
import { EssDashboardPage } from '@/pages/ess/EssDashboardPage';
import { RecruitmentPage } from '@/pages/recruitment/RecruitmentPage';
import { ApplicantDetailPage } from '@/pages/recruitment/ApplicantDetailPage';
import { PerformancePage } from '@/pages/performance/PerformancePage';
import { EssClockPage } from '@/pages/ess/EssClockPage';
import { EssLeavePage } from '@/pages/ess/EssLeavePage';
import { EssCorrectionPage } from '@/pages/ess/EssCorrectionPage';
import { EssProfilePage } from '@/pages/ess/EssProfilePage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { AssetsPage } from '@/pages/assets/AssetsPage';
import { CompliancePage } from '@/pages/compliance/CompliancePage';
import { IntegrationsPage } from '@/pages/integrations/IntegrationsPage';
import { RoleManagementPage } from '@/pages/users/RoleManagementPage';

function BootGate({ children }: { children: React.ReactNode }) {
  const { isReady } = useBootstrapAuth();

  if (!isReady) {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          <p className="text-sm text-surface-500">Restoring your session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRouter() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route
        element={
          <RedirectIfAuthed>
            <AuthLayout />
          </RedirectIfAuthed>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/mfa" element={<MfaVerifyPage />} />
      </Route>

      {/* Authenticated app */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route
          path="employees"
          element={
            <RequirePermission permission="hr.employees.view">
              <EmployeesPage />
            </RequirePermission>
          }
        />

        <Route
          path="employees/:id"
          element={
            <RequirePermission permission="hr.employees.view">
              <EmployeeDetailPage />
            </RequirePermission>
          }
        />

        <Route
          path="organization"
          element={
            <RequirePermission permission="hr.departments.view">
              <OrganizationPage />
            </RequirePermission>
          }
        />

        <Route
          path="tickets"
          element={
            <RequirePermission permission="hr.tickets.view">
              <TicketsPage />
            </RequirePermission>
          }
        />

        <Route
          path="tickets/:id"
          element={
            <RequirePermission permission="hr.tickets.view">
              <TicketDetailPage />
            </RequirePermission>
          }
        />

        <Route
          path="onboarding"
          element={
            <RequirePermission permission="hr.onboarding.view">
              <OnboardingPage />
            </RequirePermission>
          }
        />

        <Route
          path="org-chart"
          element={
            <RequirePermission permission="hr.departments.view">
              <OrgChartPage />
            </RequirePermission>
          }
        />

        <Route
          path="users"
          element={
            <RequirePermission permission="users.accounts.view">
              <UsersPage />
            </RequirePermission>
          }
        />

        <Route
          path="attendance"
          element={
            <RequirePermission permission="attendance.logs.view">
              <AttendancePage />
            </RequirePermission>
          }
        />

        <Route
          path="attendance/manage"
          element={
            <RequirePermission permission="attendance.logs.manage">
              <AdminAttendanceManagementPage />
            </RequirePermission>
          }
        />

        <Route
          path="schedule"
          element={
            <RequirePermission permission="attendance.logs.view">
              <SchedulePage />
            </RequirePermission>
          }
        />

        <Route
          path="leaves"
          element={
            <RequirePermission permission="leaves.requests.view">
              <LeavesPage />
            </RequirePermission>
          }
        />

        <Route
          path="leaves/manage"
          element={
            <RequirePermission permission="leaves.requests.manage">
              <AdminLeaveManagementPage />
            </RequirePermission>
          }
        />

        <Route
          path="payroll"
          element={
            <RequirePermission permission="payroll.runs.view">
              <PayrollPage />
            </RequirePermission>
          }
        />

        <Route
          path="payroll/runs/:id"
          element={
            <RequirePermission permission="payroll.runs.view">
              <PayrollRunDetailPage />
            </RequirePermission>
          }
        />

        <Route
          path="payroll/payslips/:id"
          element={
            <RequirePermission permission="payroll.payslips.view_own">
              <PayslipDetailPage />
            </RequirePermission>
          }
        />

        <Route
          path="my-payslips"
          element={
            <RequirePermission permission="payroll.payslips.view_own">
              <MyPayslipsPage />
            </RequirePermission>
          }
        />

        <Route
          path="recruitment"
          element={
            <RequirePermission permission="recruitment.jobs.view">
              <RecruitmentPage />
            </RequirePermission>
          }
        />

        <Route
          path="recruitment/applicants/:id"
          element={
            <RequirePermission permission="recruitment.applicants.view">
              <ApplicantDetailPage />
            </RequirePermission>
          }
        />

        <Route
          path="performance"
          element={
            <RequirePermission permission="performance.reviews.view">
              <PerformancePage />
            </RequirePermission>
          }
        />

        <Route
          path="audit-logs"
          element={
            <RequirePermission permission="core.audit_logs.view">
              <AuditLogsPage />
            </RequirePermission>
          }
        />

        <Route
          path="reports"
          element={
            <RequirePermission permission="reports.analytics.view">
              <ReportsPage />
            </RequirePermission>
          }
        />

        <Route
          path="assets"
          element={
            <RequirePermission permission="assets.inventory.view">
              <AssetsPage />
            </RequirePermission>
          }
        />

        <Route
          path="compliance"
          element={
            <RequirePermission permission="compliance.policies.view">
              <CompliancePage />
            </RequirePermission>
          }
        />

        <Route
          path="integrations"
          element={
            <RequirePermission permission="integrations.keys.view">
              <IntegrationsPage />
            </RequirePermission>
          }
        />

        <Route
          path="roles"
          element={
            <RequirePermission permission="core.roles.view">
              <RoleManagementPage />
            </RequirePermission>
          }
        />

        {/* ESS — Employee Self-Service (open to all auth users until RBAC module) */}
        <Route path="ess" element={<EssDashboardPage />} />
        <Route path="ess/clock" element={<EssClockPage />} />
        <Route path="ess/leave" element={<EssLeavePage />} />
        <Route path="ess/correction" element={<EssCorrectionPage />} />
        <Route path="ess/profile" element={<EssProfilePage />} />

        <Route path="forbidden" element={<ForbiddenPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <BootGate>
          <AppRouter />
        </BootGate>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: 'font-sans text-sm',
            success: 'border-cta-500/25 bg-cta-500/5 text-surface-900',
            error: 'border-red-400/25 bg-red-50 text-surface-900',
            warning: 'border-amber-400/25 bg-amber-50 text-surface-900',
          },
        }}
        richColors
      />
    </QueryClientProvider>
  );
}
