import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserCircle,
  ChevronLeft,
  Pencil,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useMyProfile, useMyProfileUpdateRequests, useRequestProfileUpdate } from '@/hooks/useEss';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import type { ProfileUpdateStatus } from '@/types';

/* ──────────────────────────────────────────────────────────────────
   Schema — only the ALLOWED_FIELDS
   ────────────────────────────────────────────────────────────────── */
const schema = z.object({
  phone:              z.string().optional(),
  address_line_1:     z.string().optional(),
  address_line_2:     z.string().optional(),
  city:               z.string().optional(),
  province:           z.string().optional(),
  postal_code:        z.string().optional(),
  civil_status:       z.enum(['single', 'married', 'widowed', 'separated', 'divorced', '']).optional(),
  emergency_contact:  z.string().optional(),
}).refine(
  (d) => Object.values(d).some((v) => v !== '' && v !== undefined),
  { message: 'At least one field must be filled in', path: ['phone'] },
);

type FormValues = z.infer<typeof schema>;

/* ──────────────────────────────────────────────────────────────────
   Status helpers
   ────────────────────────────────────────────────────────────────── */
const STATUS_META: Record<ProfileUpdateStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger'; icon: typeof Clock }> = {
  pending:  { label: 'Pending Review', variant: 'warning', icon: Clock },
  approved: { label: 'Applied',        variant: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rejected',       variant: 'danger',  icon: XCircle },
};

/* ──────────────────────────────────────────────────────────────────
   Info row helper
   ────────────────────────────────────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-surface-400">{label}</p>
      <p className="text-sm font-medium text-surface-900">{value ?? '—'}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────── */
export function EssProfilePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: profileData, isLoading: profileLoading } = useMyProfile();
  const { data: requestsData, isLoading: requestsLoading } = useMyProfileUpdateRequests();
  const requestUpdate = useRequestProfileUpdate();

  const emp = profileData?.employee;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone:             emp?.phone ?? '',
      address_line_1:    emp?.address_line_1 ?? '',
      address_line_2:    emp?.address_line_2 ?? '',
      city:              emp?.city ?? '',
      province:          emp?.province ?? '',
      postal_code:       emp?.postal_code ?? '',
      civil_status:      (emp?.civil_status as FormValues['civil_status']) ?? '',
      emergency_contact: emp?.emergency_contact ?? '',
    },
  });

  function onSubmit(values: FormValues) {
    // Strip empty strings
    const changes = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== undefined),
    );
    requestUpdate.mutate(changes, {
      onSuccess: () => {
        setDialogOpen(false);
        reset();
      },
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6 max-w-2xl"
    >
      {/* Back */}
      <Link to="/ess" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-900 transition-colors duration-150 cursor-pointer w-fit">
        <ChevronLeft className="h-4 w-4" />
        ESS Portal
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">My Profile</h1>
          <p className="mt-0.5 text-sm text-surface-500">View your employment record. Request HR to update your personal details.</p>
        </div>
        <Button
          variant="outline"
          size="md"
          onClick={() => setDialogOpen(true)}
          leftIcon={<Pencil className="h-4 w-4" />}
        >
          Request Update
        </Button>
      </div>

      {profileLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
        </div>
      ) : emp ? (
        <>
          {/* Identity card */}
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 text-xl font-semibold">
                {emp.first_name?.[0]}{emp.last_name?.[0]}
              </span>
              <div>
                <p className="text-lg font-semibold text-surface-900">{emp.first_name} {emp.middle_name ? `${emp.middle_name} ` : ''}{emp.last_name}</p>
                <p className="text-sm text-surface-500">{emp.position?.name ?? '—'} · {emp.department?.name ?? '—'}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <Badge variant="default">{emp.employment_status}</Badge>
                  {emp.employment_type && <Badge variant="default">{emp.employment_type}</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal info */}
          <Card>
            <div className="border-b border-surface-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-surface-900">Personal Information</h2>
            </div>
            <CardContent className="grid grid-cols-2 gap-5 py-5 sm:grid-cols-3">
              <InfoRow label="Employee No." value={emp.employee_number} />
              <InfoRow label="Date of Birth" value={emp.date_of_birth ? dayjs(emp.date_of_birth).format('MMMM D, YYYY') : null} />
              <InfoRow label="Civil Status" value={emp.civil_status} />
              <InfoRow label="Phone" value={emp.phone} />
              <InfoRow label="Emergency Contact" value={emp.emergency_contact} />
              <InfoRow label="Date Hired" value={emp.date_hired ? dayjs(emp.date_hired).format('MMMM D, YYYY') : null} />
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <div className="border-b border-surface-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-surface-900">Address</h2>
            </div>
            <CardContent className="grid grid-cols-2 gap-5 py-5 sm:grid-cols-3">
              <InfoRow label="Address Line 1" value={emp.address_line_1} />
              <InfoRow label="Address Line 2" value={emp.address_line_2} />
              <InfoRow label="City" value={emp.city} />
              <InfoRow label="Province" value={emp.province} />
              <InfoRow label="Postal Code" value={emp.postal_code} />
            </CardContent>
          </Card>

          {/* Gov IDs (masked) */}
          <Card>
            <div className="border-b border-surface-100 px-6 py-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-surface-400" aria-hidden />
              <h2 className="text-sm font-semibold text-surface-900">Government IDs</h2>
            </div>
            <CardContent className="grid grid-cols-2 gap-5 py-5 sm:grid-cols-3">
              <InfoRow label="SSS" value={emp.sss_number ? `***-**-${emp.sss_number.slice(-4)}` : null} />
              <InfoRow label="PhilHealth" value={emp.philhealth_number ? `***-***-${emp.philhealth_number.slice(-6)}` : null} />
              <InfoRow label="Pag-IBIG" value={emp.pagibig_number ? `****-****-${emp.pagibig_number.slice(-4)}` : null} />
              <InfoRow label="TIN" value={emp.tin ? `***-***-***-${emp.tin.slice(-3)}` : null} />
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="grid place-items-center py-20">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8 text-surface-300" />
            <p className="text-sm text-surface-500">Could not load profile data.</p>
          </div>
        </div>
      )}

      {/* Pending / past update requests */}
      {!requestsLoading && (requestsData?.requests?.length ?? 0) > 0 && (
        <Card>
          <div className="border-b border-surface-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-surface-900">Update Request History</h2>
          </div>
          <div className="divide-y divide-surface-50">
            {requestsData!.requests.map((req) => {
              const meta = STATUS_META[req.status];
              const StatusIcon = meta.icon;
              return (
                <div key={req.id} className="flex items-start gap-4 px-6 py-4">
                  <Badge variant={meta.variant}>
                    <StatusIcon className="h-3 w-3" />
                    {meta.label}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-surface-400 mb-1.5">{dayjs(req.created_at).format('MMM D, YYYY h:mm A')}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {Object.keys(req.requested_changes?.new ?? {}).map((field) => (
                        <span key={field} className="text-xs text-surface-600">
                          <span className="font-medium text-surface-800">{field.replace(/_/g, ' ')}</span>:{' '}
                          <span className="line-through text-surface-400">{String(req.requested_changes?.old?.[field] ?? '—')}</span>
                          {' → '}
                          <span className="text-surface-900">{String(req.requested_changes?.new?.[field])}</span>
                        </span>
                      ))}
                    </div>
                    {req.reviewer_note && (
                      <p className="mt-1.5 text-xs text-surface-500 italic">HR note: {req.reviewer_note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Update request dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); reset(); }} title="Request Profile Update" maxWidth="md">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-6">
          <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-800">Only fill in the fields you want to change. HR will review and apply approved changes.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Phone</label>
              <Input {...register('phone')} placeholder={emp?.phone ?? 'e.g. 09171234567'} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Civil Status</label>
              <select
                {...register('civil_status')}
                className="h-10 w-full rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="">No change</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="widowed">Widowed</option>
                <option value="separated">Separated</option>
                <option value="divorced">Divorced</option>
              </select>
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Address Line 1</label>
              <Input {...register('address_line_1')} placeholder={emp?.address_line_1 ?? 'House No., Street'} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Address Line 2</label>
              <Input {...register('address_line_2')} placeholder={emp?.address_line_2 ?? 'Barangay, Subdivision'} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">City / Municipality</label>
              <Input {...register('city')} placeholder={emp?.city ?? ''} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Province</label>
              <Input {...register('province')} placeholder={emp?.province ?? ''} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Postal Code</label>
              <Input {...register('postal_code')} placeholder={emp?.postal_code ?? ''} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Emergency Contact</label>
              <Input {...register('emergency_contact')} placeholder={emp?.emergency_contact ?? 'Name · Number'} />
            </div>
          </div>

          {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setDialogOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={requestUpdate.isPending}>
              Submit Request
            </Button>
          </div>
        </form>
      </Dialog>
    </motion.div>
  );
}
