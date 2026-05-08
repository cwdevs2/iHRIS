<?php

declare(strict_types=1);

namespace App\Services\Performance;

use App\Models\Employee;
use App\Models\PerformanceGoal;
use App\Models\PerformanceReview;
use App\Models\PerformanceReviewCriteria;
use App\Models\PerformanceReviewCycle;
use App\Models\PerformanceReviewScore;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class PerformanceService
{
    public function __construct(private AuditLogger $audit) {}

    // ── Review Cycles ────────────────────────────────────────────────────────

    public function listCycles(array $filters = []): LengthAwarePaginator
    {
        return PerformanceReviewCycle::with(['creator'])
            ->withCount('reviews')
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['type'] ?? null, fn ($q, $v) => $q->where('type', $v))
            ->orderBy('period_start', 'desc')
            ->paginate((int) ($filters['per_page'] ?? 20));
    }

    public function findCycle(string $id): PerformanceReviewCycle
    {
        return PerformanceReviewCycle::with(['creator', 'criteria'])->findOrFail($id);
    }

    public function createCycle(array $data, User $actor): PerformanceReviewCycle
    {
        $criteria = $data['criteria'] ?? [];
        unset($data['criteria']);

        $cycle = PerformanceReviewCycle::create(array_merge($data, ['created_by' => $actor->id]));

        foreach ($criteria as $index => $criterion) {
            PerformanceReviewCriteria::create(array_merge($criterion, [
                'cycle_id'   => $cycle->id,
                'sort_order' => $index,
            ]));
        }

        $this->audit->log('performance.cycle.created', target: $cycle, after: $cycle->toArray(), actor: $actor);

        return $cycle->load('criteria');
    }

    public function updateCycle(string $id, array $data, User $actor): PerformanceReviewCycle
    {
        $cycle = PerformanceReviewCycle::findOrFail($id);
        $before = $cycle->toArray();

        $criteria = $data['criteria'] ?? null;
        unset($data['criteria']);

        $cycle->update($data);

        if ($criteria !== null) {
            // Replace criteria wholesale only if cycle is still draft
            if ($cycle->status !== 'draft') {
                throw ValidationException::withMessages(['criteria' => ['Cannot modify criteria on an active or completed cycle.']]);
            }
            $cycle->criteria()->delete();
            foreach ($criteria as $index => $criterion) {
                PerformanceReviewCriteria::create(array_merge($criterion, [
                    'cycle_id'   => $cycle->id,
                    'sort_order' => $index,
                ]));
            }
        }

        $this->audit->log('performance.cycle.updated', target: $cycle, before: $before, after: $cycle->toArray(), actor: $actor);

        return $cycle->fresh('criteria');
    }

    public function activateCycle(string $id, User $actor): PerformanceReviewCycle
    {
        $cycle = PerformanceReviewCycle::findOrFail($id);

        if ($cycle->status !== 'draft') {
            throw ValidationException::withMessages(['status' => ['Only draft cycles can be activated.']]);
        }

        $cycle->update(['status' => 'active']);
        $this->audit->log('performance.cycle.activated', target: $cycle, actor: $actor);

        return $cycle;
    }

    public function closeCycle(string $id, User $actor): PerformanceReviewCycle
    {
        $cycle = PerformanceReviewCycle::findOrFail($id);

        if ($cycle->status !== 'active') {
            throw ValidationException::withMessages(['status' => ['Only active cycles can be closed.']]);
        }

        $cycle->update(['status' => 'completed']);
        $this->audit->log('performance.cycle.closed', target: $cycle, actor: $actor);

        return $cycle;
    }

    // ── Goals ────────────────────────────────────────────────────────────────

    public function listGoals(array $filters = []): LengthAwarePaginator
    {
        return PerformanceGoal::with(['employee.user', 'cycle'])
            ->when($filters['employee_id'] ?? null, fn ($q, $v) => $q->where('employee_id', $v))
            ->when($filters['cycle_id'] ?? null, fn ($q, $v) => $q->where('cycle_id', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->orderBy('created_at', 'desc')
            ->paginate((int) ($filters['per_page'] ?? 20));
    }

    public function createGoal(array $data, User $actor): PerformanceGoal
    {
        $goal = PerformanceGoal::create(array_merge($data, ['created_by' => $actor->id]));

        $this->audit->log('performance.goal.created', target: $goal, after: $goal->toArray(), actor: $actor);

        return $goal->load(['employee.user', 'cycle']);
    }

    public function updateGoal(string $id, array $data, User $actor): PerformanceGoal
    {
        $goal = PerformanceGoal::findOrFail($id);
        $before = $goal->toArray();
        $goal->update($data);

        $this->audit->log('performance.goal.updated', target: $goal, before: $before, after: $goal->toArray(), actor: $actor);

        return $goal->fresh(['employee.user', 'cycle']);
    }

    public function deleteGoal(string $id, User $actor): void
    {
        $goal = PerformanceGoal::findOrFail($id);
        $this->audit->log('performance.goal.deleted', target: $goal, before: $goal->toArray(), actor: $actor);
        $goal->delete();
    }

    // ── Reviews ──────────────────────────────────────────────────────────────

    public function listReviews(array $filters = []): LengthAwarePaginator
    {
        return PerformanceReview::with(['cycle', 'employee.user', 'reviewer'])
            ->when($filters['cycle_id'] ?? null, fn ($q, $v) => $q->where('cycle_id', $v))
            ->when($filters['employee_id'] ?? null, fn ($q, $v) => $q->where('employee_id', $v))
            ->when($filters['reviewer_id'] ?? null, fn ($q, $v) => $q->where('reviewer_id', $v))
            ->when($filters['review_type'] ?? null, fn ($q, $v) => $q->where('review_type', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->orderBy('created_at', 'desc')
            ->paginate((int) ($filters['per_page'] ?? 20));
    }

    public function findReview(string $id): PerformanceReview
    {
        return PerformanceReview::with(['cycle.criteria', 'employee.user', 'reviewer', 'scores.criteria'])
            ->findOrFail($id);
    }

    /**
     * Initiate reviews for all active employees in a cycle.
     * Creates manager + self reviews per employee (and peer if enabled).
     */
    public function initiateReviews(string $cycleId, User $actor): int
    {
        $cycle = PerformanceReviewCycle::findOrFail($cycleId);

        if ($cycle->status !== 'active') {
            throw ValidationException::withMessages(['cycle' => ['Reviews can only be initiated for active cycles.']]);
        }

        $employees = Employee::whereNotIn('employment_status', ['resigned', 'terminated'])
            ->with('user')
            ->get();

        $created = 0;

        foreach ($employees as $employee) {
            // Manager review
            if ($employee->user_id) {
                $this->findOrCreateReview($cycle->id, $employee->id, $employee->user_id, 'manager');
                $created++;
            }

            // Self-assessment
            if ($cycle->enable_self_assessment && $employee->user_id) {
                $this->findOrCreateReview($cycle->id, $employee->id, $employee->user_id, 'self');
                $created++;
            }
        }

        $this->audit->log('performance.reviews.initiated', metadata: ['cycle_id' => $cycleId, 'count' => $created], actor: $actor);

        return $created;
    }

    private function findOrCreateReview(string $cycleId, string $employeeId, string $reviewerId, string $reviewType): PerformanceReview
    {
        return PerformanceReview::firstOrCreate(
            ['cycle_id' => $cycleId, 'employee_id' => $employeeId, 'reviewer_id' => $reviewerId, 'review_type' => $reviewType],
            ['status' => 'pending'],
        );
    }

    /**
     * Submit a completed review with per-criterion scores.
     */
    public function submitReview(string $id, array $data, User $actor): PerformanceReview
    {
        $review = PerformanceReview::with('cycle.criteria')->findOrFail($id);

        if ($review->status === 'submitted') {
            throw ValidationException::withMessages(['status' => ['This review has already been submitted.']]);
        }

        $scores = $data['scores'] ?? [];
        unset($data['scores']);

        $review->update(array_merge($data, ['status' => 'in_progress']));

        // Upsert per-criterion scores
        foreach ($scores as $scoreData) {
            PerformanceReviewScore::updateOrCreate(
                ['review_id' => $review->id, 'criteria_id' => $scoreData['criteria_id']],
                ['score' => $scoreData['score'], 'comments' => $scoreData['comments'] ?? null],
            );
        }

        // Compute weighted overall score
        $overallScore = $this->computeOverallScore($review->id, $review->cycle->criteria);
        $review->update(['status' => 'submitted', 'overall_score' => $overallScore, 'submitted_at' => now()]);

        $this->audit->log('performance.review.submitted', target: $review, after: $review->toArray(), actor: $actor);

        return $review->fresh(['scores.criteria', 'employee.user', 'reviewer']);
    }

    public function acknowledgeReview(string $id, ?string $comments, User $actor): PerformanceReview
    {
        $review = PerformanceReview::findOrFail($id);

        if ($review->status !== 'submitted') {
            throw ValidationException::withMessages(['status' => ['Only submitted reviews can be acknowledged.']]);
        }

        $review->update([
            'status'           => 'acknowledged',
            'employee_comments' => $comments,
            'acknowledged_at'  => now(),
        ]);

        $this->audit->log('performance.review.acknowledged', target: $review, actor: $actor);

        return $review->fresh();
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    public function getAnalytics(?string $cycleId = null): array
    {
        $cycleQuery = PerformanceReview::when($cycleId, fn ($q) => $q->where('cycle_id', $cycleId))
            ->where('status', 'submitted');

        $avgScore = $cycleQuery->avg('overall_score');
        $submittedCount = $cycleQuery->count();
        $pendingCount = PerformanceReview::when($cycleId, fn ($q) => $q->where('cycle_id', $cycleId))
            ->whereIn('status', ['pending', 'in_progress'])
            ->count();

        $scoreDistribution = PerformanceReview::when($cycleId, fn ($q) => $q->where('cycle_id', $cycleId))
            ->where('status', 'submitted')
            ->selectRaw('
                CASE
                    WHEN overall_score >= 4.5 THEN "Outstanding (4.5–5)"
                    WHEN overall_score >= 3.5 THEN "Exceeds (3.5–4.4)"
                    WHEN overall_score >= 2.5 THEN "Meets (2.5–3.4)"
                    WHEN overall_score >= 1.5 THEN "Below (1.5–2.4)"
                    ELSE "Unsatisfactory (<1.5)"
                END as band,
                COUNT(*) as count
            ')
            ->groupBy('band')
            ->get();

        $topPerformers = PerformanceReview::with('employee.user')
            ->when($cycleId, fn ($q) => $q->where('cycle_id', $cycleId))
            ->where('status', 'submitted')
            ->where('review_type', 'manager')
            ->orderByDesc('overall_score')
            ->limit(10)
            ->get(['employee_id', 'overall_score']);

        $activeCycles = PerformanceReviewCycle::where('status', 'active')->count();
        $goalsOnTrack = PerformanceGoal::whereIn('status', ['active', 'achieved'])->count();

        return [
            'avg_score'          => round((float) ($avgScore ?? 0), 2),
            'submitted_reviews'  => $submittedCount,
            'pending_reviews'    => $pendingCount,
            'score_distribution' => $scoreDistribution,
            'top_performers'     => $topPerformers,
            'active_cycles'      => $activeCycles,
            'goals_on_track'     => $goalsOnTrack,
        ];
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private function computeOverallScore(string $reviewId, Collection $criteria): float
    {
        $scores = PerformanceReviewScore::where('review_id', $reviewId)->get()->keyBy('criteria_id');
        $totalWeight = 0.0;
        $weightedSum = 0.0;

        foreach ($criteria as $criterion) {
            $score = $scores->get($criterion->id);
            if (! $score) {
                continue;
            }
            $normalised = ($criterion->max_score > 0)
                ? ((float) $score->score / (float) $criterion->max_score) * 5
                : (float) $score->score;
            $weight = (float) $criterion->weight;
            $weightedSum += $normalised * $weight;
            $totalWeight += $weight;
        }

        return $totalWeight > 0 ? round($weightedSum / $totalWeight, 2) : 0.0;
    }
}
