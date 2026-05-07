<?php

declare(strict_types=1);

namespace App\Services\Payroll;

use App\Models\Payslip;
use Illuminate\Contracts\View\Factory as ViewFactory;

/**
 * Payslip document rendering.
 *
 * Renders a Blade template to printable HTML. Browsers can save the result as
 * PDF via "Print to PDF" with no additional packages, satisfying the Phase 4
 * "Payslip PDF Generation" deliverable in a deployment-flexible way.
 *
 * If the project later installs `barryvdh/laravel-dompdf`, swap renderHtml() for
 * a PDF::loadView() call without changing the controller surface.
 */
class PayslipDocumentService
{
    public function __construct(private ViewFactory $views) {}

    public function renderHtml(Payslip $payslip): string
    {
        $payslip->loadMissing(['employee.user', 'employee.department', 'employee.position', 'items', 'run.period']);

        // Group line items for cleaner rendering
        $earnings = $payslip->items->filter(fn ($i) => str_starts_with($i->category, 'earning_'))->values();
        $deductions = $payslip->items->filter(fn ($i) => str_starts_with($i->category, 'deduction_'))->values();

        return $this->views->make('payroll.payslip', [
            'payslip' => $payslip,
            'employee' => $payslip->employee,
            'run' => $payslip->run,
            'period' => $payslip->run->period,
            'earnings' => $earnings,
            'deductions' => $deductions,
            'company' => [
                'name' => config('app.name', 'iHRIS'),
                'tagline' => 'Human Resource Information System',
            ],
        ])->render();
    }
}
