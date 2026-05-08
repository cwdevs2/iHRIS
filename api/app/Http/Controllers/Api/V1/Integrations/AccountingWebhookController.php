<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Integrations;

use App\Http\Controllers\Controller;
use App\Models\IntegrationLog;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Outbound accounting bridge — STUB IMPLEMENTATION.
 *
 * VENDOR ADAPTERS (NOT YET IMPLEMENTED):
 *   - QuickBooks Online (OAuth2 + Journal Entries API)
 *   - Xero (OAuth2 + Manual Journals API)
 *   - SAP Business One (DI Server / Service Layer)
 *
 * For now, this controller exposes a /preview endpoint that mocks the journal
 * entries that *would* be pushed when payroll is finalized, so HR can validate
 * the GL mapping before a real adapter is wired up.
 */
class AccountingWebhookController extends Controller
{
    /**
     * POST /integrations/accounting/preview
     *
     * Returns a deterministic preview of the journal entries that would be
     * created downstream from a finalized payroll run. No external calls are
     * made; this is a documentation-quality stub.
     */
    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'payroll_run_id' => ['required', 'string', 'uuid'],
        ]);

        $entries = [
            ['account' => '5100', 'description' => 'Salaries and wages', 'debit' => 0.00, 'credit' => 0.00],
            ['account' => '5110', 'description' => 'SSS contributions (employer)', 'debit' => 0.00, 'credit' => 0.00],
            ['account' => '5120', 'description' => 'PhilHealth contributions (employer)', 'debit' => 0.00, 'credit' => 0.00],
            ['account' => '5130', 'description' => 'Pag-IBIG contributions (employer)', 'debit' => 0.00, 'credit' => 0.00],
            ['account' => '2100', 'description' => 'Salaries payable', 'debit' => 0.00, 'credit' => 0.00],
            ['account' => '2110', 'description' => 'BIR withholding tax payable', 'debit' => 0.00, 'credit' => 0.00],
        ];

        IntegrationLog::create([
            'integration' => 'accounting',
            'direction' => 'outbound',
            'endpoint' => 'integrations/accounting/preview',
            'status_code' => 200,
            'request_payload' => $data,
            'response_payload' => ['entry_count' => count($entries)],
            'source_ip' => $request->ip(),
        ]);

        return ApiResponse::success([
            'payroll_run_id' => $data['payroll_run_id'],
            'note' => 'Stub preview only. Real GL push is not implemented; see AccountingWebhookController for vendor TODOs.',
            'journal_entries' => $entries,
        ]);
    }
}
