# Phase 7 — Security & Performance Hardening Checklist

This document tracks the production-readiness work completed in Phase 7, plus the
items intentionally deferred (and why).

> **Status (2026-05-08):** ✅ In-app modules complete. Vendor-specific integration adapters and a full pen-test pass remain on the post-launch backlog.

---

## 1. Authentication & Session

| Item | Status | Notes |
|---|---|---|
| Sanctum bearer tokens | ✅ Phase 0 | Token rotation on logout; tokens hashed at rest |
| Password hashing | ✅ Phase 0 | bcrypt cost 12 (Laravel default) |
| MFA (TOTP) | ✅ Phase 0 | RFC 6238; secret encrypted; recovery codes issued |
| Account lockout | ⚠️ Deferred | Implement via failed-login throttle in Phase 7.5 |
| Session timeout (per-role) | ⚠️ Deferred | Token expiry is global today; per-role is post-launch |
| Forced password rotation on first login | ⚠️ Deferred | Add in Phase 7.5 |

## 2. Authorization (RBAC)

| Item | Status | Notes |
|---|---|---|
| Permission middleware (server-side) | ✅ Phase 0 | `EnsurePermission`; pattern: `module.feature.action` |
| Permission cache | ✅ Phase 0 | User permissions are loaded once per request |
| Sensitive field gating | ✅ Phase 1 | `view_sensitive` permission for SSS/PhilHealth/TIN/salary |
| Audit log on every mutation | ✅ Phase 0 | `AuditLogger::log()` in all services |
| Append-only audit log | ✅ Phase 0 | `AuditLog::update()` and `delete()` throw |

## 3. Transport Security (Phase 7)

| Item | Status | Notes |
|---|---|---|
| HSTS | ✅ | `SecurityHeaders` middleware; only set when `request->isSecure()` |
| `X-Content-Type-Options: nosniff` | ✅ | Applied globally to API responses |
| `X-Frame-Options: DENY` | ✅ | Applied globally to API responses |
| `Referrer-Policy: no-referrer` | ✅ | Applied globally |
| `Permissions-Policy` | ✅ | Camera/mic/payment denied; geolocation self-only |
| HTTPS enforcement | ⚠️ Deploy-time | Configure at the Nginx/reverse-proxy layer |
| TLS 1.3 | ⚠️ Deploy-time | Configure at the Nginx layer |

## 4. Input Validation & Output Encoding

| Item | Status |
|---|---|
| Form Request validation on every endpoint | ✅ |
| Eloquent `$fillable` lists, never `$guarded` | ✅ |
| API Resources for response shaping (no raw model dumps) | ✅ |
| File upload validation (mime, size) | ✅ Phase 1 |
| SQL injection — Eloquent + parameterized queries everywhere | ✅ |
| XSS — frontend uses React (auto-escaped); backend never echoes HTML | ✅ |

## 5. Rate Limiting (Phase 7)

| Item | Status | Notes |
|---|---|---|
| Global API throttle | ✅ | `Middleware::throttleApi()` in `bootstrap/app.php` |
| Per-API-key rate limit | ✅ | `AuthenticateApiKey` middleware enforces `rate_limit_per_minute` |
| Login endpoint throttle | ⚠️ Deferred | Add `throttle:5,1` on `/auth/login` in Phase 7.5 |

## 6. API Integration Security (Phase 7)

| Item | Status |
|---|---|
| API keys hashed at rest (SHA-256) | ✅ |
| Plain token returned ONCE at creation | ✅ |
| Per-key scopes | ✅ |
| Per-key rate limits | ✅ |
| Inbound request logging (every call → `integration_logs`) | ✅ |
| Outbound webhook signing (HMAC-SHA256) | ✅ |
| Webhook delivery retries with exponential backoff | ⚠️ Deferred | Move to a queued job in Phase 7.5 |

## 7. Performance Optimization

| Item | Status | Notes |
|---|---|---|
| All FK columns indexed | ✅ | Confirmed in all migrations |
| Composite index on `asset_assignments(asset_id, returned_on)` | ✅ | For active-assignment lookup |
| Composite index on `compliance_policies(category, status)` | ✅ | For filtered policy lists |
| Composite index on `regulatory_filings(agency, status)` + `due_on` | ✅ | For agency dashboards |
| Eager loading on hot paths | ✅ | `with()` calls in all listing services |
| N+1 audit | ⚠️ Partial | Recommend running `barryvdh/laravel-debugbar` in staging |
| Query result caching (Redis) | ⚠️ Deferred | Add for executive summary tile in Phase 7.5 |

## 8. Penetration Test Checklist (for vendor)

When engaging a third-party pen-tester for the production launch, scope should include:

- [ ] Authentication bypass attempts (token replay, MFA bypass)
- [ ] IDOR (Insecure Direct Object Reference) — try accessing other employees' payslips/policies/assets
- [ ] CSRF — confirm token-based auth is immune (no cookie session)
- [ ] SSRF on webhook target URLs
- [ ] Mass assignment — try posting `role_id`, `permissions`, `is_super_admin` to update endpoints
- [ ] Stored XSS in policy body, HR ticket notes, performance review comments
- [ ] File upload — try executable extensions, polyglot files, ZIP slip
- [ ] BIR/SSS/PhilHealth report endpoints — verify only authorized users can export
- [ ] Audit log tampering — confirm DB user has no UPDATE/DELETE on `audit_logs`
- [ ] Permission escalation — non-admin tries to assign themselves admin role

## 9. Load Testing Plan (deferred to staging)

Deferred until a staging environment exists. Suggested approach:

1. **Tool:** k6 or JMeter
2. **Scenarios:**
   - 100 concurrent users hitting `/dashboard` and `/reports/summary`
   - 50 concurrent payroll runs being generated (read-heavy)
   - 1000 inbound biometric events/min via `/integrations/biometric/events`
3. **Targets:**
   - p95 latency < 800ms for read endpoints
   - p95 latency < 3s for payroll generation
   - Webhook dispatch should not block emitting transaction
4. **Acceptance:** zero 5xx, no DB connection pool exhaustion

## 10. Vendor Adapters (Stubbed in Phase 7)

The following integrations have controllers + DB tables but **no real vendor SDK calls yet**. They accept vendor-neutral payloads; real adapters should normalize and call these endpoints.

- **ZKTeco / Suprema / HikVision biometric** — `BiometricWebhookController::ingest()` accepts the neutral payload shape; per-vendor adapters belong in a separate package.
- **QuickBooks / Xero / SAP B1 accounting** — `AccountingWebhookController::preview()` returns mock journal entries to validate the GL mapping; real OAuth + push to be implemented when a vendor is selected.
- **SSO via Google Workspace / Azure AD** — `socialite` package needs to be added; routes already permission-gated under `integrations.keys.manage`.
- **SMS via Semaphore / Vonage** — Notifications module is stubbed; channel adapters in Phase 7.5.
