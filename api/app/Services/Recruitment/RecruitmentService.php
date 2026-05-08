<?php

declare(strict_types=1);

namespace App\Services\Recruitment;

use App\Models\Applicant;
use App\Models\CandidateEvaluation;
use App\Models\InterviewSchedule;
use App\Models\JobPosting;
use App\Models\JobRequisition;
use App\Models\OfferLetter;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class RecruitmentService
{
    public function __construct(private AuditLogger $audit) {}

    // ── Job Requisitions ────────────────────────────────────────────────────

    public function listRequisitions(array $filters = []): LengthAwarePaginator
    {
        return JobRequisition::with(['department', 'position', 'requester.user'])
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['department_id'] ?? null, fn ($q, $v) => $q->where('department_id', $v))
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->whereHas('position', fn ($qp) => $qp->where('title', 'like', "%{$v}%")))
            ->orderBy('created_at', 'desc')
            ->paginate((int) ($filters['per_page'] ?? 20));
    }

    public function findRequisition(string $id): JobRequisition
    {
        return JobRequisition::with(['department', 'position', 'requester.user', 'approver', 'jobPostings'])
            ->findOrFail($id);
    }

    public function createRequisition(array $data, User $actor): JobRequisition
    {
        $req = JobRequisition::create($data);

        $this->audit->log('recruitment.requisition.created', target: $req, after: $req->toArray(), actor: $actor);

        return $req->load(['department', 'position', 'requester.user']);
    }

    public function updateRequisition(string $id, array $data, User $actor): JobRequisition
    {
        $req = JobRequisition::findOrFail($id);
        $before = $req->toArray();
        $req->update($data);

        $this->audit->log('recruitment.requisition.updated', target: $req, before: $before, after: $req->toArray(), actor: $actor);

        return $req->fresh(['department', 'position', 'requester.user']);
    }

    public function approveRequisition(string $id, string $action, User $actor): JobRequisition
    {
        $req = JobRequisition::findOrFail($id);

        if ($req->status !== 'pending_approval') {
            throw ValidationException::withMessages(['status' => ['Only pending requisitions can be approved or rejected.']]);
        }

        $before = $req->toArray();
        $req->update([
            'status'      => $action === 'approve' ? 'approved' : 'rejected',
            'approved_by' => $actor->id,
            'approved_at' => now(),
        ]);

        $this->audit->log("recruitment.requisition.{$action}d", target: $req, before: $before, after: $req->toArray(), actor: $actor);

        return $req->fresh();
    }

    // ── Job Postings ────────────────────────────────────────────────────────

    public function listPostings(array $filters = []): LengthAwarePaginator
    {
        return JobPosting::with(['requisition', 'creator'])
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where('title', 'like', "%{$v}%"))
            ->withCount('applicants')
            ->orderBy('created_at', 'desc')
            ->paginate((int) ($filters['per_page'] ?? 20));
    }

    public function findPosting(string $id): JobPosting
    {
        return JobPosting::with(['requisition.department', 'requisition.position', 'creator'])
            ->withCount('applicants')
            ->findOrFail($id);
    }

    public function createPosting(array $data, User $actor): JobPosting
    {
        if (isset($data['status']) && $data['status'] === 'published') {
            $data['published_at'] = now();
        }

        $posting = JobPosting::create(array_merge($data, ['created_by' => $actor->id]));

        $this->audit->log('recruitment.posting.created', target: $posting, after: $posting->toArray(), actor: $actor);

        return $posting->load(['requisition', 'creator']);
    }

    public function updatePosting(string $id, array $data, User $actor): JobPosting
    {
        $posting = JobPosting::findOrFail($id);
        $before = $posting->toArray();

        if (isset($data['status']) && $data['status'] === 'published' && ! $posting->published_at) {
            $data['published_at'] = now();
        }

        $posting->update($data);

        $this->audit->log('recruitment.posting.updated', target: $posting, before: $before, after: $posting->toArray(), actor: $actor);

        return $posting->fresh(['requisition', 'creator']);
    }

    // ── Applicants ──────────────────────────────────────────────────────────

    public function listApplicants(array $filters = []): LengthAwarePaginator
    {
        return Applicant::with(['jobPosting'])
            ->when($filters['job_posting_id'] ?? null, fn ($q, $v) => $q->where('job_posting_id', $v))
            ->when($filters['stage'] ?? null, fn ($q, $v) => $q->where('stage', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($sq) =>
                $sq->where('first_name', 'like', "%{$v}%")
                   ->orWhere('last_name', 'like', "%{$v}%")
                   ->orWhere('email', 'like', "%{$v}%")
            ))
            ->orderBy('created_at', 'desc')
            ->paginate((int) ($filters['per_page'] ?? 20));
    }

    public function findApplicant(string $id): Applicant
    {
        return Applicant::with(['jobPosting', 'interviews.scheduler', 'evaluations.evaluator', 'offerLetters'])
            ->findOrFail($id);
    }

    public function createApplicant(array $data, ?User $actor = null): Applicant
    {
        $applicant = Applicant::create($data);

        if ($actor) {
            $this->audit->log('recruitment.applicant.created', target: $applicant, after: $applicant->toArray(), actor: $actor);
        }

        return $applicant->load('jobPosting');
    }

    public function advanceApplicantStage(string $id, string $stage, User $actor, ?string $rejectionReason = null): Applicant
    {
        $applicant = Applicant::findOrFail($id);
        $before = $applicant->toArray();

        $updates = ['stage' => $stage];

        if ($stage === 'hired') {
            $updates['status'] = 'hired';
            // Mark the requisition as fulfilled if all headcount is met
            $posting = $applicant->jobPosting;
            if ($posting?->job_requisition_id) {
                $hiredCount = Applicant::where('job_posting_id', $posting->id)->where('status', 'hired')->count() + 1;
                $requisition = $posting->requisition;
                if ($requisition && $hiredCount >= $requisition->headcount) {
                    $requisition->update(['status' => 'fulfilled']);
                }
            }
        }

        if ($stage === 'rejected') {
            $updates['status'] = 'rejected';
            if ($rejectionReason) {
                $updates['rejection_reason'] = $rejectionReason;
            }
        }

        $applicant->update($updates);

        $this->audit->log('recruitment.applicant.stage_changed', target: $applicant, before: $before, after: $applicant->toArray(), actor: $actor);

        return $applicant->fresh('jobPosting');
    }

    public function uploadResume(string $id, \Illuminate\Http\UploadedFile $file, User $actor): Applicant
    {
        $applicant = Applicant::findOrFail($id);

        $path = $file->store("recruitment/resumes/{$id}", 'local');
        $applicant->update(['resume_path' => $path]);

        $this->audit->log('recruitment.applicant.resume_uploaded', target: $applicant, actor: $actor);

        return $applicant;
    }

    // ── Interviews ──────────────────────────────────────────────────────────

    public function scheduleInterview(array $data, User $actor): InterviewSchedule
    {
        $interview = InterviewSchedule::create(array_merge($data, ['scheduled_by' => $actor->id]));

        $this->audit->log('recruitment.interview.scheduled', target: $interview, after: $interview->toArray(), actor: $actor);

        return $interview->load(['applicant', 'scheduler']);
    }

    public function updateInterview(string $id, array $data, User $actor): InterviewSchedule
    {
        $interview = InterviewSchedule::findOrFail($id);
        $before = $interview->toArray();
        $interview->update($data);

        $this->audit->log('recruitment.interview.updated', target: $interview, before: $before, after: $interview->toArray(), actor: $actor);

        return $interview->fresh(['applicant', 'scheduler']);
    }

    // ── Evaluations ─────────────────────────────────────────────────────────

    public function submitEvaluation(array $data, User $actor): CandidateEvaluation
    {
        $eval = CandidateEvaluation::create(array_merge($data, ['evaluated_by' => $actor->id]));

        $this->audit->log('recruitment.evaluation.submitted', target: $eval, after: $eval->toArray(), actor: $actor);

        return $eval->load(['applicant', 'evaluator']);
    }

    // ── Offer Letters ────────────────────────────────────────────────────────

    public function generateOffer(array $data, User $actor): OfferLetter
    {
        $offer = OfferLetter::create(array_merge($data, ['generated_by' => $actor->id, 'status' => 'draft']));

        $this->audit->log('recruitment.offer.generated', target: $offer, after: $offer->toArray(), actor: $actor);

        return $offer->load(['applicant', 'position', 'department']);
    }

    public function updateOfferStatus(string $id, string $status, User $actor, ?string $declineReason = null): OfferLetter
    {
        $offer = OfferLetter::findOrFail($id);
        $before = $offer->toArray();

        $updates = ['status' => $status];
        if (in_array($status, ['accepted', 'declined'], true)) {
            $updates['responded_at'] = now();
        }
        if ($status === 'declined' && $declineReason) {
            $updates['decline_reason'] = $declineReason;
        }
        if ($status === 'sent') {
            // Auto-advance applicant stage to 'offer'
            $offer->applicant->update(['stage' => 'offer']);
        }
        if ($status === 'accepted') {
            $offer->applicant->update(['stage' => 'hired', 'status' => 'hired']);
        }

        $offer->update($updates);

        $this->audit->log('recruitment.offer.status_changed', target: $offer, before: $before, after: $offer->toArray(), actor: $actor);

        return $offer->fresh(['applicant', 'position', 'department']);
    }

    // ── Analytics ───────────────────────────────────────────────────────────

    public function getAnalytics(): array
    {
        $openPostings = JobPosting::where('status', 'published')->count();
        $totalApplicants = Applicant::count();
        $hiredThisMonth = Applicant::where('status', 'hired')
            ->whereMonth('updated_at', now()->month)
            ->count();

        $byStage = Applicant::selectRaw('stage, COUNT(*) as count')
            ->where('status', 'active')
            ->groupBy('stage')
            ->pluck('count', 'stage');

        $bySource = Applicant::selectRaw('source, COUNT(*) as count')
            ->whereNotNull('source')
            ->groupBy('source')
            ->orderByDesc('count')
            ->get();

        $recentPostings = JobPosting::with('creator')
            ->withCount('applicants')
            ->where('status', 'published')
            ->latest()
            ->limit(5)
            ->get();

        return [
            'open_postings'     => $openPostings,
            'total_applicants'  => $totalApplicants,
            'hired_this_month'  => $hiredThisMonth,
            'pipeline_by_stage' => $byStage,
            'by_source'         => $bySource,
            'recent_postings'   => $recentPostings,
        ];
    }
}
