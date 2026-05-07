<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Payslip — {{ $payslip->run->reference_number }} — {{ $employee->user?->full_name }}</title>
    <style>
        @page { size: A4; margin: 18mm 14mm; }
        * { box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
            color: #0f172a;
            font-size: 11.5px;
            line-height: 1.45;
            margin: 0;
            padding: 24px 32px;
            background: #f8fafc;
        }
        .sheet {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 28px 32px;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            border-bottom: 2px solid #0891b2;
            padding-bottom: 14px;
            margin-bottom: 18px;
        }
        .brand {
            font-size: 18px;
            font-weight: 700;
            color: #0891b2;
            letter-spacing: -0.01em;
        }
        .brand small {
            display: block;
            font-size: 10px;
            font-weight: 500;
            color: #64748b;
            letter-spacing: 0;
            margin-top: 2px;
        }
        .doc-title {
            text-align: right;
        }
        .doc-title h1 {
            margin: 0;
            font-size: 16px;
            color: #0f172a;
            letter-spacing: -0.01em;
        }
        .doc-title .ref {
            display: inline-block;
            margin-top: 4px;
            padding: 2px 8px;
            background: #ecfeff;
            color: #0e7490;
            border-radius: 4px;
            font-weight: 600;
            font-size: 10.5px;
        }
        .meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px 24px;
            margin-bottom: 20px;
        }
        .meta dt {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #64748b;
            margin: 0;
        }
        .meta dd {
            margin: 0 0 6px;
            font-size: 12px;
            color: #0f172a;
        }
        h2 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #475569;
            margin: 18px 0 8px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        th, td {
            text-align: left;
            padding: 6px 4px;
            font-size: 11.5px;
        }
        thead th {
            font-weight: 600;
            color: #64748b;
            border-bottom: 1px solid #cbd5e1;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        tbody tr {
            border-bottom: 1px solid #f1f5f9;
        }
        tbody tr:nth-child(even) {
            background: #fafbfd;
        }
        .num {
            text-align: right;
            font-variant-numeric: tabular-nums;
        }
        tfoot td {
            font-weight: 600;
            border-top: 2px solid #cbd5e1;
            color: #0f172a;
        }
        .net-row {
            margin-top: 18px;
            padding: 14px 18px;
            border-radius: 10px;
            background: #ecfeff;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .net-row span {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #0e7490;
            font-weight: 600;
        }
        .net-row strong {
            font-size: 22px;
            color: #0f172a;
            font-variant-numeric: tabular-nums;
            font-weight: 700;
        }
        .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px dashed #cbd5e1;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
        }
        .footer .gen {
            color: #64748b;
        }
        @media print {
            body { background: #fff; padding: 0; }
            .sheet { border: none; box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="header">
            <div>
                <div class="brand">
                    {{ $company['name'] }}
                    <small>{{ $company['tagline'] }}</small>
                </div>
            </div>
            <div class="doc-title">
                <h1>Payslip</h1>
                <div class="ref">{{ $run->reference_number }}</div>
            </div>
        </div>

        <dl class="meta">
            <div>
                <dt>Employee</dt>
                <dd>{{ $employee->user?->full_name }} ({{ $employee->employee_number }})</dd>

                <dt>Department / Position</dt>
                <dd>{{ $employee->department?->name ?? '—' }} · {{ $employee->position?->title ?? '—' }}</dd>
            </div>
            <div>
                <dt>Pay Period</dt>
                <dd>{{ $period->period_start->format('M j, Y') }} – {{ $period->period_end->format('M j, Y') }}</dd>

                <dt>Pay Date</dt>
                <dd>{{ $period->pay_date?->format('M j, Y') ?? 'TBD' }}</dd>
            </div>
        </dl>

        <h2>Earnings</h2>
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="num">Qty</th>
                    <th class="num">Rate</th>
                    <th class="num">Amount</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($earnings as $item)
                    <tr>
                        <td>{{ $item->label }}</td>
                        <td class="num">{{ rtrim(rtrim(number_format((float) $item->quantity, 2), '0'), '.') }}</td>
                        <td class="num">{{ number_format((float) $item->rate, 2) }}</td>
                        <td class="num">₱ {{ number_format((float) $item->amount, 2) }}</td>
                    </tr>
                @empty
                    <tr><td colspan="4" style="color:#94a3b8; text-align:center;">No earnings recorded.</td></tr>
                @endforelse
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3">Gross Earnings</td>
                    <td class="num">₱ {{ number_format((float) $payslip->gross_earnings, 2) }}</td>
                </tr>
            </tfoot>
        </table>

        <h2>Deductions</h2>
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="num" colspan="2">Reference</th>
                    <th class="num">Amount</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($deductions as $item)
                    <tr>
                        <td>{{ $item->label }}</td>
                        <td class="num" colspan="2" style="color:#94a3b8;">{{ $item->code }}</td>
                        <td class="num">₱ {{ number_format((float) $item->amount, 2) }}</td>
                    </tr>
                @empty
                    <tr><td colspan="4" style="color:#94a3b8; text-align:center;">No deductions recorded.</td></tr>
                @endforelse
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3">Total Deductions</td>
                    <td class="num">₱ {{ number_format((float) $payslip->total_deductions, 2) }}</td>
                </tr>
            </tfoot>
        </table>

        <div class="net-row">
            <span>Net Pay</span>
            <strong>₱ {{ number_format((float) $payslip->net_pay, 2) }}</strong>
        </div>

        <div class="footer">
            <div>
                Generated {{ $payslip->generated_at?->format('M j, Y g:i A') }}
                · This is a system-generated document and does not require a signature.
            </div>
            <div class="gen">Payslip ID · {{ substr($payslip->id, 0, 8) }}</div>
        </div>
    </div>
</body>
</html>
