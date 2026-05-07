import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, User, Briefcase, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmploymentStatusBadge } from '@/components/hr/EmploymentStatusBadge';
import { DocumentsTab } from '@/components/hr/DocumentsTab';
import { useEmployee } from '@/hooks/useEmployees';
import { easeOutStrong } from '@/lib/motion';
import dayjs from 'dayjs';

const TABS = [
  { id: 'profile',   label: 'Profile',   icon: User },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'access',    label: 'System Access', icon: Shield },
] as const;
type TabId = typeof TABS[number]['id'];

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOutStrong } },
};

export function EmployeeDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('profile');

  const { data, isLoading } = useEmployee(id ?? '');
  const employee = data?.employee;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-100" />
        <div className="h-48 animate-pulse rounded-xl bg-surface-100" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-surface-500">Employee not found.</p>
        <Button variant="secondary" onClick={() => navigate('/employees')}>
          Back to employees
        </Button>
      </div>
    );
  }

  const initials = [employee.first_name?.[0], employee.last_name?.[0]].filter(Boolean).join('');

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Back */}
      <motion.div variants={itemVariants}>
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/employees')}>
          Employees
        </Button>
      </motion.div>

      {/* Hero card */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="flex items-start gap-5">
            {employee.avatar_url ? (
              <img src={employee.avatar_url} className="h-16 w-16 rounded-full object-cover ring-2 ring-brand-100" alt="" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-xl font-bold text-white ring-2 ring-brand-100">
                {initials || '?'}
              </div>
            )}
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-surface-900">
                  {employee.full_name ?? employee.employee_number}
                </h1>
                <EmploymentStatusBadge status={employee.employment_status} />
              </div>
              <p className="text-sm text-surface-500">
                {employee.position?.title ?? '—'} · {employee.department?.name ?? '—'}
              </p>
              <p className="text-xs text-surface-400">{employee.employee_number}</p>
            </div>
            <div className="text-right text-xs text-surface-400">
              <p>Hired {employee.date_hired ? dayjs(employee.date_hired).format('MMM D, YYYY') : '—'}</p>
              {employee.email && <p className="mt-1">{employee.email}</p>}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-1 border-b border-surface-200">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer
                  ${tab === t.id
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-surface-500 hover:text-surface-800'
                  }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab content */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          {tab === 'profile' && (
            <div className="grid grid-cols-2 gap-6">
              <Field label="Full name">{employee.full_name}</Field>
              <Field label="Email">{employee.email}</Field>
              <Field label="Phone">{employee.phone}</Field>
              <Field label="Gender">{employee.gender}</Field>
              <Field label="Civil status">{employee.civil_status}</Field>
              <Field label="Nationality">{employee.nationality}</Field>
              <Field label="Birth date">{employee.birth_date ? dayjs(employee.birth_date).format('MMMM D, YYYY') : null}</Field>
              <Field label="Religion">{employee.religion}</Field>
              <Field label="Address" className="col-span-2">
                {[employee.address_line_1, employee.address_line_2, employee.city, employee.province, employee.postal_code, employee.country]
                  .filter(Boolean).join(', ') || null}
              </Field>
            </div>
          )}

          {tab === 'employment' && (
            <div className="grid grid-cols-2 gap-6">
              <Field label="Status"><EmploymentStatusBadge status={employee.employment_status} /></Field>
              <Field label="Department">{employee.department?.name}</Field>
              <Field label="Position">{employee.position?.title}</Field>
              <Field label="Reports to">{employee.manager?.full_name}</Field>
              <Field label="Date hired">{employee.date_hired ? dayjs(employee.date_hired).format('MMMM D, YYYY') : null}</Field>
              <Field label="Regularization date">{employee.regularization_date ? dayjs(employee.regularization_date).format('MMMM D, YYYY') : null}</Field>
              {employee.pay_frequency && (
                <Field label="Pay frequency">{employee.pay_frequency.replace('_', '-')}</Field>
              )}
            </div>
          )}

          {tab === 'documents' && <DocumentsTab employeeId={employee.id} />}

          {tab === 'access' && (
            <div className="grid grid-cols-2 gap-6">
              <Field label="Account status">
                {employee.account_status ? (
                  <Badge variant={employee.account_status === 'active' ? 'success' : 'warning'} className="capitalize">
                    {employee.account_status}
                  </Badge>
                ) : (
                  <span className="text-surface-400 text-sm">No system account</span>
                )}
              </Field>
              <Field label="Email">{employee.email}</Field>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">{label}</p>
      <div className="text-sm text-surface-900">
        {children ?? <span className="text-surface-300">—</span>}
      </div>
    </div>
  );
}
