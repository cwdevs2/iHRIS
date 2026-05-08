import { useState } from 'react';
import dayjs from 'dayjs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useReviews, useReview, useSubmitReview, useAcknowledgeReview } from '@/hooks/usePerformance';
import { useAuthStore } from '@/stores/auth';
import type { ReviewFilters, ReviewType, ReviewStatus, SubmitReviewPayload } from '@/types';

const STATUS_VARIANT: Record<ReviewStatus, 'default' | 'warning' | 'success' | 'brand'> = {
  pending: 'default',
  in_progress: 'warning',
  submitted: 'brand',
  acknowledged: 'success',
};

const TYPE_VARIANT: Record<ReviewType, 'default' | 'info' | 'brand'> = {
  self: 'info',
  manager: 'brand',
  peer: 'default',
};

export function ReviewsTab() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [filters, setFilters] = useState<ReviewFilters>({ per_page: 25 });
  const [submitTarget, setSubmitTarget] = useState<string | null>(null);
  const [ackTarget, setAckTarget] = useState<string | null>(null);

  const { data, isLoading } = useReviews(filters);
  const { data: reviewData } = useReview(submitTarget ?? undefined);
  const submitReview = useSubmitReview(submitTarget ?? '');
  const ackReview = useAcknowledgeReview(ackTarget ?? '');

  const reviews = data?.reviews ?? [];
  const activeReview = reviewData?.review;

  const [scores, setScores] = useState<Record<string, number>>({});
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [ackComments, setAckComments] = useState('');

  const handleSubmit = () => {
    if (!submitTarget) return;
    const payload: SubmitReviewPayload = {
      strengths,
      areas_for_improvement: areasForImprovement,
      scores: Object.entries(scores).map(([criteria_id, score]) => ({ criteria_id, score })),
    };
    submitReview.mutate(payload, {
      onSuccess: () => {
        setSubmitTarget(null);
        setScores({});
        setStrengths('');
        setAreasForImprovement('');
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input-field h-10 w-[160px]"
          value={filters.review_type ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, review_type: (e.target.value || undefined) as ReviewType }))}
        >
          <option value="">All types</option>
          <option value="self">Self</option>
          <option value="manager">Manager</option>
          <option value="peer">Peer</option>
        </select>
        <select
          className="input-field h-10 w-[160px]"
          value={filters.status ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, status: (e.target.value || undefined) as ReviewStatus }))}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="submitted">Submitted</option>
          <option value="acknowledged">Acknowledged</option>
        </select>
        <span className="ml-auto text-sm text-surface-500">
          {data?.pagination ? `${data.pagination.total} reviews` : '—'}
        </span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                {['Employee', 'Reviewer', 'Cycle', 'Type', 'Status', 'Score', 'Submitted', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-surface-50">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 w-3/4 animate-pulse rounded bg-surface-100" /></td>
                      ))}
                    </tr>
                  ))
                : reviews.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-surface-400">No reviews found.</td></tr>
                  ) : reviews.map((r) => (
                    <tr key={r.id} className="border-b border-surface-50 hover:bg-surface-50">
                      <td className="px-4 py-3 text-surface-900">{r.employee?.full_name ?? r.employee_id}</td>
                      <td className="px-4 py-3 text-surface-600">{r.reviewer?.full_name ?? r.reviewer_id}</td>
                      <td className="px-4 py-3 text-surface-500">{r.cycle?.name ?? r.cycle_id}</td>
                      <td className="px-4 py-3">
                        <Badge variant={TYPE_VARIANT[r.review_type]} className="capitalize">{r.review_type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">{r.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-surface-900">
                        {r.overall_score ? `${parseFloat(r.overall_score).toFixed(2)} / 5` : '—'}
                      </td>
                      <td className="px-4 py-3 text-surface-500">
                        {r.submitted_at ? dayjs(r.submitted_at).format('MMM D, YYYY') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(r.status === 'pending' || r.status === 'in_progress') && (
                            <button
                              type="button"
                              onClick={() => setSubmitTarget(r.id)}
                              className="text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer"
                            >
                              Submit
                            </button>
                          )}
                          {r.status === 'submitted' && hasPermission('performance.reviews.view') && (
                            <button
                              type="button"
                              onClick={() => setAckTarget(r.id)}
                              className="text-xs font-medium text-green-600 hover:text-green-700 cursor-pointer"
                            >
                              Acknowledge
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Submit Review Panel */}
      <Dialog
        open={!!submitTarget}
        onClose={() => setSubmitTarget(null)}
        title="Submit Performance Review"
      >
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {activeReview?.cycle?.criteria && activeReview.cycle.criteria.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-surface-800">Scores</p>
              <div className="flex flex-col gap-3">
                {activeReview.cycle.criteria.map((crit) => (
                  <div key={crit.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-surface-800">{crit.name}</p>
                      <p className="text-xs text-surface-400">Weight: {crit.weight}% · Max: {crit.max_score}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={crit.max_score}
                      step={0.5}
                      className="input-field h-9 w-20"
                      value={scores[crit.id] ?? ''}
                      onChange={(e) => setScores((p) => ({ ...p, [crit.id]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="field-label">Strengths</label>
            <textarea rows={2} className="input-field w-full resize-none" value={strengths} onChange={(e) => setStrengths(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Areas for Improvement</label>
            <textarea rows={2} className="input-field w-full resize-none" value={areasForImprovement} onChange={(e) => setAreasForImprovement(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setSubmitTarget(null)}>Cancel</Button>
            <Button size="sm" loading={submitReview.isPending} onClick={handleSubmit}>Submit Review</Button>
          </div>
        </div>
      </Dialog>

      {/* Acknowledge Dialog */}
      <Dialog open={!!ackTarget} onClose={() => setAckTarget(null)} title="Acknowledge Review">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-surface-700">
            You are acknowledging this performance review. Optionally add comments below.
          </p>
          <div>
            <label className="field-label">Comments</label>
            <textarea rows={3} className="input-field w-full resize-none" value={ackComments} onChange={(e) => setAckComments(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAckTarget(null)}>Cancel</Button>
            <Button
              size="sm"
              variant="cta"
              loading={ackReview.isPending}
              onClick={() => {
                ackReview.mutate(ackComments || undefined, {
                  onSuccess: () => {
                    setAckTarget(null);
                    setAckComments('');
                  },
                });
              }}
            >
              Acknowledge
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
