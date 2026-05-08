import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { ArrowLeft, Download, Calendar, Star, FileText } from 'lucide-react';
import { useApplicant, useScheduleInterview, useSubmitEvaluation, useGenerateOffer, useAdvanceApplicantStage } from '@/hooks/useRecruitment';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { easeOutStrong } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth';
import type { ApplicantStage, InterviewType, ScheduleInterviewPayload, GenerateOfferPayload } from '@/types';

const STAGE_VARIANT: Record<ApplicantStage, 'default' | 'info' | 'warning' | 'success' | 'danger' | 'brand'> = {
  applied: 'default',
  screening: 'info',
  interview: 'brand',
  evaluation: 'warning',
  offer: 'success',
  hired: 'success',
  rejected: 'danger',
};

type ActiveTab = 'overview' | 'interviews' | 'evaluations' | 'offers';

export function ApplicantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data, isLoading } = useApplicant(id);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Modals
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);

  const scheduleInterview = useScheduleInterview();
  const submitEval = useSubmitEvaluation();
  const generateOffer = useGenerateOffer();
  const advanceStage = useAdvanceApplicantStage(id ?? '');

  // Interview form
  const [interviewForm, setInterviewForm] = useState<Partial<ScheduleInterviewPayload>>({
    applicant_id: id,
    type: 'phone_screen',
    duration_minutes: 60,
  });

  // Eval form
  const [evalForm, setEvalForm] = useState({ stage: '', overall_score: '', recommendation: '', strengths: '', concerns: '' });

  // Offer form
  const [offerForm, setOfferForm] = useState<Partial<GenerateOfferPayload>>({ applicant_id: id });

  const applicant = data?.applicant;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-100" />
        ))}
      </div>
    );
  }

  if (!applicant) return <p className="text-surface-500">Applicant not found.</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link to="/recruitment" className="mt-1 text-surface-400 hover:text-surface-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-surface-900">
              {applicant.full_name}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-surface-500">
              <span>{applicant.job_posting?.title ?? 'No posting'}</span>
              <span>·</span>
              <Badge variant={STAGE_VARIANT[applicant.stage]} className="capitalize">
                {applicant.stage}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {applicant.has_resume && (
            <a
              href={`/api/v1/recruitment/applicants/${applicant.id}/resume`}
              target="_blank"
              rel="noreferrer"
            >
              <Button size="sm" variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
                Resume
              </Button>
            </a>
          )}
          {hasPermission('recruitment.applicants.manage') && (
            <>
              <Button size="sm" variant="secondary" leftIcon={<Calendar className="h-4 w-4" />} onClick={() => setInterviewOpen(true)}>
                Schedule Interview
              </Button>
              <Button size="sm" variant="secondary" leftIcon={<Star className="h-4 w-4" />} onClick={() => setEvalOpen(true)}>
                Evaluate
              </Button>
              {applicant.stage === 'evaluation' && (
                <Button size="sm" leftIcon={<FileText className="h-4 w-4" />} onClick={() => setOfferOpen(true)}>
                  Generate Offer
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-200">
        <nav className="-mb-px flex gap-6">
          {(['overview', 'interviews', 'evaluations', 'offers'] as ActiveTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={`border-b-2 px-1 py-3 text-sm font-medium capitalize transition-colors duration-200 cursor-pointer ${
                activeTab === t
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-surface-500 hover:text-surface-900'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <div className="p-4">
              <p className="mb-3 text-sm font-semibold text-surface-800">Personal Information</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-surface-500">Email</dt>
                  <dd className="text-surface-900">{applicant.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-surface-500">Phone</dt>
                  <dd className="text-surface-900">{applicant.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-surface-500">Source</dt>
                  <dd className="text-surface-900 capitalize">{applicant.source ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-surface-500">Applied</dt>
                  <dd className="text-surface-900">{dayjs(applicant.created_at).format('MMM D, YYYY')}</dd>
                </div>
                {applicant.referrer_name && (
                  <div>
                    <dt className="text-xs text-surface-500">Referred By</dt>
                    <dd className="text-surface-900">{applicant.referrer_name}</dd>
                  </div>
                )}
              </dl>
            </div>
          </Card>

          {applicant.cover_letter && (
            <Card>
              <div className="p-4">
                <p className="mb-2 text-sm font-semibold text-surface-800">Cover Letter</p>
                <p className="whitespace-pre-wrap text-sm text-surface-700 leading-relaxed">
                  {applicant.cover_letter}
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'interviews' && (
        <Card>
          <div className="p-4">
            {(applicant.interviews?.length ?? 0) === 0 ? (
              <p className="text-center text-sm text-surface-400 py-6">No interviews scheduled yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100">
                    {['Date & Time', 'Type', 'Duration', 'Status', 'Location'].map((h) => (
                      <th key={h} className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applicant.interviews?.map((iv) => (
                    <tr key={iv.id} className="border-b border-surface-50">
                      <td className="py-2 text-surface-900">{dayjs(iv.scheduled_at).format('MMM D, YYYY h:mm A')}</td>
                      <td className="py-2 text-surface-600 capitalize">{iv.type.replace('_', ' ')}</td>
                      <td className="py-2 text-surface-600">{iv.duration_minutes} min</td>
                      <td className="py-2">
                        <Badge variant={iv.status === 'completed' ? 'success' : iv.status === 'cancelled' ? 'danger' : 'info'} className="capitalize">
                          {iv.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-surface-600">{iv.location ?? iv.meeting_link ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'evaluations' && (
        <Card>
          <div className="p-4">
            {(applicant.evaluations?.length ?? 0) === 0 ? (
              <p className="text-center text-sm text-surface-400 py-6">No evaluations yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {applicant.evaluations?.map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-surface-100 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-surface-900">Stage: {ev.stage}</span>
                      <span className="text-sm text-surface-500">Score: {ev.overall_score ?? '—'}</span>
                    </div>
                    {ev.recommendation && (
                      <p className="mt-1 text-xs capitalize text-surface-600">
                        Recommendation: {ev.recommendation.replace('_', ' ')}
                      </p>
                    )}
                    {ev.strengths && <p className="mt-2 text-sm text-surface-700"><strong>Strengths:</strong> {ev.strengths}</p>}
                    {ev.concerns && <p className="mt-1 text-sm text-surface-700"><strong>Concerns:</strong> {ev.concerns}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'offers' && (
        <Card>
          <div className="p-4">
            {(applicant.offer_letters?.length ?? 0) === 0 ? (
              <p className="text-center text-sm text-surface-400 py-6">No offer letters yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100">
                    {['Salary', 'Start Date', 'Status', 'Expires'].map((h) => (
                      <th key={h} className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applicant.offer_letters?.map((ol) => (
                    <tr key={ol.id} className="border-b border-surface-50">
                      <td className="py-2 text-surface-900">₱{parseFloat(ol.offered_salary).toLocaleString()}</td>
                      <td className="py-2 text-surface-600">{dayjs(ol.proposed_start_date).format('MMM D, YYYY')}</td>
                      <td className="py-2">
                        <Badge
                          variant={ol.status === 'accepted' ? 'success' : ol.status === 'declined' ? 'danger' : 'default'}
                          className="capitalize"
                        >
                          {ol.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-surface-500">{ol.expires_at ? dayjs(ol.expires_at).format('MMM D, YYYY') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* Schedule Interview Dialog */}
      <Dialog open={interviewOpen} onClose={() => setInterviewOpen(false)} title="Schedule Interview">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Type</label>
              <select
                className="input-field h-10 w-full"
                value={interviewForm.type}
                onChange={(e) => setInterviewForm((p) => ({ ...p, type: e.target.value as InterviewType }))}
              >
                {['phone_screen', 'online', 'onsite', 'panel', 'technical', 'final'].map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Duration (min)</label>
              <input
                type="number"
                className="input-field h-10 w-full"
                value={interviewForm.duration_minutes ?? 60}
                onChange={(e) => setInterviewForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Date & Time *</label>
            <input
              type="datetime-local"
              className="input-field h-10 w-full"
              value={interviewForm.scheduled_at ?? ''}
              onChange={(e) => setInterviewForm((p) => ({ ...p, scheduled_at: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">Location / Meeting Link</label>
            <input
              type="text"
              className="input-field h-10 w-full"
              value={interviewForm.location ?? ''}
              onChange={(e) => setInterviewForm((p) => ({ ...p, location: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setInterviewOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              loading={scheduleInterview.isPending}
              onClick={() => {
                if (!interviewForm.scheduled_at) return;
                scheduleInterview.mutate(
                  { ...interviewForm, applicant_id: id! } as ScheduleInterviewPayload,
                  { onSuccess: () => setInterviewOpen(false) },
                );
              }}
            >
              Schedule
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Evaluation Dialog */}
      <Dialog open={evalOpen} onClose={() => setEvalOpen(false)} title="Submit Evaluation">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Stage</label>
              <input
                type="text"
                className="input-field h-10 w-full"
                value={evalForm.stage}
                onChange={(e) => setEvalForm((p) => ({ ...p, stage: e.target.value }))}
              />
            </div>
            <div>
              <label className="field-label">Overall Score (1–10)</label>
              <input
                type="number"
                min={1}
                max={10}
                className="input-field h-10 w-full"
                value={evalForm.overall_score}
                onChange={(e) => setEvalForm((p) => ({ ...p, overall_score: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Recommendation</label>
            <select
              className="input-field h-10 w-full"
              value={evalForm.recommendation}
              onChange={(e) => setEvalForm((p) => ({ ...p, recommendation: e.target.value }))}
            >
              <option value="">Select…</option>
              <option value="strong_hire">Strong Hire</option>
              <option value="hire">Hire</option>
              <option value="hold">Hold</option>
              <option value="reject">Reject</option>
              <option value="strong_reject">Strong Reject</option>
            </select>
          </div>
          <div>
            <label className="field-label">Strengths</label>
            <textarea rows={2} className="input-field w-full resize-none" value={evalForm.strengths} onChange={(e) => setEvalForm((p) => ({ ...p, strengths: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Concerns</label>
            <textarea rows={2} className="input-field w-full resize-none" value={evalForm.concerns} onChange={(e) => setEvalForm((p) => ({ ...p, concerns: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setEvalOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              loading={submitEval.isPending}
              onClick={() => {
                submitEval.mutate(
                  {
                    applicant_id: id!,
                    stage: evalForm.stage,
                    overall_score: evalForm.overall_score ? Number(evalForm.overall_score) : undefined,
                    recommendation: evalForm.recommendation || undefined,
                    strengths: evalForm.strengths || undefined,
                    concerns: evalForm.concerns || undefined,
                  },
                  { onSuccess: () => setEvalOpen(false) },
                );
              }}
            >
              Submit
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Generate Offer Dialog */}
      <Dialog open={offerOpen} onClose={() => setOfferOpen(false)} title="Generate Offer Letter">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Offered Salary (₱) *</label>
              <input
                type="number"
                className="input-field h-10 w-full"
                value={offerForm.offered_salary ?? ''}
                onChange={(e) => setOfferForm((p) => ({ ...p, offered_salary: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="field-label">Start Date *</label>
              <input
                type="date"
                className="input-field h-10 w-full"
                value={offerForm.proposed_start_date ?? ''}
                onChange={(e) => setOfferForm((p) => ({ ...p, proposed_start_date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Expires At</label>
            <input
              type="date"
              className="input-field h-10 w-full"
              value={offerForm.expires_at ?? ''}
              onChange={(e) => setOfferForm((p) => ({ ...p, expires_at: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">Terms & Conditions</label>
            <textarea rows={3} className="input-field w-full resize-none" value={offerForm.terms ?? ''} onChange={(e) => setOfferForm((p) => ({ ...p, terms: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setOfferOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              loading={generateOffer.isPending}
              onClick={() => {
                if (!offerForm.offered_salary || !offerForm.proposed_start_date) return;
                generateOffer.mutate(
                  { ...offerForm, applicant_id: id! } as GenerateOfferPayload,
                  { onSuccess: () => setOfferOpen(false) },
                );
              }}
            >
              Generate
            </Button>
          </div>
        </div>
      </Dialog>
    </motion.div>
  );
}
