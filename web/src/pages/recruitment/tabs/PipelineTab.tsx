import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { useApplicants, useAdvanceApplicantStage } from '@/hooks/useRecruitment';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/auth';
import type { Applicant, ApplicantStage } from '@/types';
import { easeOutStrong } from '@/lib/motion';

const STAGES: ApplicantStage[] = ['applied', 'screening', 'interview', 'evaluation', 'offer', 'hired', 'rejected'];

const STAGE_COLORS: Record<ApplicantStage, string> = {
  applied: 'bg-surface-100 border-surface-200',
  screening: 'bg-blue-50 border-blue-200',
  interview: 'bg-purple-50 border-purple-200',
  evaluation: 'bg-amber-50 border-amber-200',
  offer: 'bg-green-50 border-green-200',
  hired: 'bg-emerald-50 border-emerald-200',
  rejected: 'bg-red-50 border-red-200',
};

const STAGE_HEADER: Record<ApplicantStage, string> = {
  applied: 'text-surface-700',
  screening: 'text-blue-700',
  interview: 'text-purple-700',
  evaluation: 'text-amber-700',
  offer: 'text-green-700',
  hired: 'text-emerald-700',
  rejected: 'text-red-700',
};

const NEXT_STAGE: Partial<Record<ApplicantStage, ApplicantStage>> = {
  applied: 'screening',
  screening: 'interview',
  interview: 'evaluation',
  evaluation: 'offer',
  offer: 'hired',
};

function ApplicantCard({ applicant }: { applicant: Applicant }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const advance = useAdvanceApplicantStage(applicant.id);
  const nextStage = NEXT_STAGE[applicant.stage];

  return (
    <div className="rounded-lg border border-surface-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/recruitment/applicants/${applicant.id}`}
          className="text-sm font-medium text-surface-900 hover:text-brand-700 leading-tight"
        >
          {applicant.full_name}
        </Link>
        {applicant.source && (
          <span className="shrink-0 rounded-full bg-surface-100 px-2 py-0.5 text-[11px] text-surface-500">
            {applicant.source}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-surface-500 truncate">
        {applicant.job_posting?.title ?? 'No posting'}
      </p>
      <p className="mt-1.5 text-xs text-surface-400">
        {dayjs(applicant.created_at).format('MMM D')}
      </p>
      {nextStage && hasPermission('recruitment.applicants.manage') && (
        <button
          type="button"
          disabled={advance.isPending}
          onClick={() => advance.mutate({ stage: nextStage })}
          className="mt-2 w-full rounded bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
        >
          → {nextStage.charAt(0).toUpperCase() + nextStage.slice(1)}
        </button>
      )}
    </div>
  );
}

export function PipelineTab() {
  const [postingId, setPostingId] = useState<string>('');
  const { data, isLoading } = useApplicants({ per_page: 200, job_posting_id: postingId || undefined });

  const applicants = data?.applicants ?? [];

  const byStage = STAGES.reduce<Record<ApplicantStage, Applicant[]>>(
    (acc, stage) => {
      acc[stage] = applicants.filter((a) => a.stage === stage);
      return acc;
    },
    {} as Record<ApplicantStage, Applicant[]>,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter by posting ID…"
          className="input-field h-9 w-[240px] text-sm"
          value={postingId}
          onChange={(e) => setPostingId(e.target.value)}
        />
        <span className="text-sm text-surface-500">
          {data?.pagination ? `${data.pagination.total} applicants` : '—'}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const cards = byStage[stage] ?? [];
          return (
            <div
              key={stage}
              className={`flex-shrink-0 w-52 rounded-xl border p-3 ${STAGE_COLORS[stage]}`}
            >
              <div className={`mb-3 flex items-center justify-between`}>
                <span className={`text-xs font-semibold uppercase tracking-wider ${STAGE_HEADER[stage]}`}>
                  {stage}
                </span>
                <span className={`rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-semibold ${STAGE_HEADER[stage]}`}>
                  {cards.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {isLoading
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-20 animate-pulse rounded-lg bg-white/50" />
                    ))
                  : cards.map((applicant) => (
                      <motion.div
                        key={applicant.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, ease: easeOutStrong }}
                      >
                        <ApplicantCard applicant={applicant} />
                      </motion.div>
                    ))}
                {!isLoading && cards.length === 0 && (
                  <p className="py-4 text-center text-xs text-surface-400">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
