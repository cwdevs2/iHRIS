# Security Guidelines — iHRIS

> **Standard:** OWASP Top 10 · PH Data Privacy Act (RA 10173) · DOLE / SSS data handling requirements  
> **Applies to:** All backend API code, frontend code, infrastructure, and deployment

---

## 1. Authentication Security

### 1.1 Password Security
- **Algorithm:** bcrypt with cost factor 12 (`Hash::make($password)`)
- **Minimum length:** 8 characters (enforce in `StoreUserRequest`)
- **No plaintext storage:** Passwords are never logged, returned in API responses, or stored in plain text
- **Password reset:** Time-limited tokens (60 minutes), single-use, sent only to verified email

### 1.2 Account Lockout
```php
// users table
failed_login_attempts: INT   // increments on each failed login
locked_until: TIMESTAMP      // set to now() + 30 minutes after 5 failures
```

- After **5 consecutive failures**: account locked for 30 minutes
- Lockout resets on successful login
- All lockout events logged to `audit_logs`

### 1.3 Multi-Factor Authentication (MFA)
- **Algorithm:** TOTP RFC 6238 (6-digit, 30-second window)
- **Secret storage:** `users.mfa_secret` — encrypted at rest using Laravel's encryption (`encrypt()`)
- **Recovery codes:** Stored as bcrypt hashes in `mfa_recovery_codes` JSON array
- **MFA enforcement:** Not currently mandatory but can be enforced per role in future
- **Challenge flow:** Login returns `requires_mfa: true` + short-lived challenge token; full token issued only after TOTP verification

### 1.4 Sanctum Token Security
- Tokens are hashed before storage in `personal_access_tokens`
- Token rotation on sensitive operations (payroll finalize, role changes)
- Logout immediately revokes the current token
- No shared tokens between sessions

---

## 2. Authorization Security

### 2.1 RBAC Enforcement
**All authorization is middleware-enforced on the server side.** Frontend permission checks are UX helpers only — never security boundaries.

```php
// Every route that mutates data or returns sensitive info:
Route::middleware('permission:module.feature.action')->...
```

**Permission check flow:**
1. Middleware calls `$user->hasPermission($module, $feature, $action)`
2. Checks Redis cache (`user:{id}:permissions`) — fast path
3. Cache miss: queries `user_roles → role_permissions → permissions`
4. Returns `true/false` — **403 if false**
5. Cache TTL: 60 minutes; invalidated immediately on role change

### 2.2 Row-Level Authorization
For endpoints where an employee can only access their own data:

```php
// Controller example — ESS payslip
$payslip = Payslip::findOrFail($id);
if ($payslip->employee_id !== $request->user()->employee_id) {
    abort(403, 'Access denied.');
}
```

This pattern is used in:
- ESS attendance (own logs only)
- ESS leave (own requests only)
- Payslip view (own payslip, or `view_all` for HR)

### 2.3 Principle of Least Privilege
- Default role (Employee) has only `ess.self.access` and read permissions
- No permission is granted by default on role creation
- System roles (Super Admin, HR Admin, etc.) are seeded with explicitly defined permissions only

---

## 3. Input Validation

### 3.1 Form Request Validation
Every POST/PATCH endpoint uses a `FormRequest` class with Zod-equivalent PHP validation rules:

```php
// Example: StoreEmployeeRequest
public function rules(): array
{
    return [
        'first_name'    => ['required', 'string', 'max:100'],
        'email'         => ['required', 'email:rfc,dns', 'unique:users,email'],
        'basic_salary'  => ['required', 'numeric', 'min:0', 'max:999999.9999'],
        'pay_frequency' => ['required', Rule::in(['monthly', 'semi_monthly', 'weekly', 'daily'])],
    ];
}
```

### 3.2 UUID Validation
All route parameters that represent UUIDs are validated:
```php
'id' => ['required', 'uuid']
```

### 3.3 File Upload Validation
```php
'file' => ['required', 'file', 'max:5120', 'mimes:pdf,jpg,jpeg,png']
```
- Max file size: 5MB for documents, 2MB for avatars
- MIME type whitelist — never `mimes:*`
- Uploaded files stored with randomized names (never original filename as path)

### 3.4 Mass Assignment Protection
All Eloquent models use `$fillable` (not `$guarded = []`). Never use `forceCreate()` with user input directly.

---

## 4. Sensitive Data Protection

### 4.1 Government ID Encryption
The following fields are encrypted at rest using Laravel's `Crypt` facade via model casts:

```php
// Employee model
protected $casts = [
    'sss_number'          => 'encrypted',
    'philhealth_number'   => 'encrypted',
    'pagibig_number'      => 'encrypted',
    'tin'                 => 'encrypted',
];
```

**Encryption:** AES-256-CBC with APP_KEY. Rotate APP_KEY only with a full re-encryption migration.

### 4.2 MFA Secret Encryption
```php
protected $casts = [
    'mfa_secret' => 'encrypted',
];
```

### 4.3 API Key Hashing
Raw API keys are **never stored**. Only `SHA-256(raw_key)` is stored in `api_keys.key_hash`:

```php
$keyHash = hash('sha256', $rawKey);
```

The raw key is returned **once** at creation time — it cannot be retrieved again.

### 4.4 Response Scrubbing
The following fields are never returned in API responses:
- `users.password`
- `users.mfa_secret`
- `users.mfa_recovery_codes`
- `employees.sss_number` / `philhealth_number` / `pagibig_number` / `tin` (masked in Resources: `SSS-***-***-123`)
- `api_keys.key_hash`
- `webhook_subscriptions.signing_secret`

---

## 5. HTTP Security Headers

Applied to every API response by `SecurityHeaders` middleware:

```php
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains  // HTTPS only
```

**Additional headers set at Nginx level (production):**
```nginx
add_header Content-Security-Policy "default-src 'self'; ...";
add_header X-XSS-Protection "1; mode=block";
```

---

## 6. CORS Configuration

```php
// config/cors.php
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:5173'),
],
'supports_credentials' => true,
```

**Production:** `FRONTEND_URL` must be set to the exact SPA origin. Never use `*` for `allowed_origins` with credentials.

---

## 7. Rate Limiting

### API-wide throttle
Laravel's built-in `throttleApi` middleware: **60 requests/minute per IP** on all `/api/v1/*` routes.

### Auth endpoint throttle
Login endpoint has a stricter per-IP throttle to prevent brute-force attacks (configurable in `bootstrap/app.php`).

### Per-API-Key throttle
`AuthenticateApiKey` middleware enforces `api_keys.rate_limit_per_minute` per key:
```php
$bucket = "apikey:{$key->id}";
if ($this->limiter->tooManyAttempts($bucket, $key->rate_limit_per_minute)) {
    return ApiResponse::error('API key rate limit exceeded.', 429);
}
$this->limiter->hit($bucket, 60);
```

---

## 8. SQL Injection Prevention

- **Eloquent ORM** used throughout — parameterized queries by default
- Raw queries only via `DB::select()` / `DB::statement()` with bound parameters:
  ```php
  DB::select('SELECT * FROM users WHERE id = ?', [$userId]);
  ```
- Never concatenate user input into SQL strings
- `LIKE` queries use `$query->where('name', 'LIKE', '%' . addcslashes($search, '%_') . '%')`

---

## 9. Audit Trail (Security Monitoring)

Every security-relevant event is logged to `audit_logs`:

| Event | Trigger |
|---|---|
| `auth.login` | Successful login |
| `auth.login_failed` | Failed login attempt |
| `auth.logout` | Logout |
| `auth.locked` | Account locked after failed attempts |
| `auth.mfa_enabled` / `auth.mfa_disabled` | MFA changes |
| `auth.password_reset` | Password reset completed |
| `user.role_assigned` / `user.role_removed` | RBAC changes |
| `payroll.run.finalized` | Payroll locked |
| `employee.created` / `employee.updated` / `employee.deleted` | HR record changes |
| `attendance.clock_in` / `attendance.clock_out` | ESS attendance |
| `leave.filed` / `leave.approved` / `leave.rejected` | Leave workflow |

**The `audit_logs` table has MySQL-level triggers** preventing UPDATE or DELETE — any attempt raises `SQLSTATE 45000`.

---

## 10. File Upload Security

1. **Store outside web root** — uploads go to `storage/app/` which is not publicly accessible
2. **Randomized filenames** — never use original filename as storage key
3. **MIME validation** — validate both Content-Type header and file magic bytes
4. **Serve via signed URLs** — never expose raw storage paths
5. **No executable uploads** — reject `.php`, `.exe`, `.sh`, `.js` extensions
6. **Virus scanning (production)** — configure ClamAV scan on resume uploads

```php
// Correct file storage pattern
$path = $request->file('document')->store(
    "documents/{$employeeId}",
    'private'  // not 'public' disk
);
```

---

## 11. Session Security

```php
// config/session.php (production settings)
'secure'    => true,   // HTTPS-only cookie
'httponly'  => true,   // No JS access to session cookie
'same_site' => 'lax',  // CSRF mitigation
```

**Sanctum tokens** are stored in `localStorage` on the frontend via `tokenStorage`. For higher security environments, move to `HttpOnly` cookies.

---

## 12. OWASP Top 10 Coverage

| # | Vulnerability | Mitigation in iHRIS |
|---|---|---|
| A01 | Broken Access Control | RBAC middleware on every route; row-level checks in controllers |
| A02 | Cryptographic Failures | bcrypt passwords; AES-256 for sensitive fields; SHA-256 for API keys; HTTPS enforced |
| A03 | Injection | Eloquent ORM; parameterized queries; input validation via FormRequests |
| A04 | Insecure Design | Principle of least privilege; append-only audit log; immutable payroll records |
| A05 | Security Misconfiguration | Security headers middleware; strict CORS; no debug mode in production |
| A06 | Vulnerable Components | `composer audit` in CI; `npm audit` for frontend; keep dependencies updated |
| A07 | Auth and Session Failures | Account lockout; MFA; token revocation; bcrypt 12 |
| A08 | Software and Data Integrity | Payroll immutability; audit log DB triggers; signed webhooks |
| A09 | Security Logging and Monitoring | All auth events in `audit_logs`; integration logs; Nginx access logs |
| A10 | Server-Side Request Forgery | Webhook target URL validation; no user-controlled URLs in server-side HTTP calls |

---

## 13. Webhook Security

Outbound webhooks are signed with HMAC-SHA256:

```php
$signature = hash_hmac('sha256', $payloadJson, $subscription->signing_secret);
// Header: X-IHRIS-Signature: sha256={$signature}
```

Receiving systems should verify this signature before processing.

---

## 14. Environment Security Checklist

Before production deployment, verify:

- [ ] `APP_ENV=production` in `.env`
- [ ] `APP_DEBUG=false` — never expose stack traces
- [ ] `APP_KEY` is 32+ random bytes and unique per environment
- [ ] Database user has only necessary privileges (no `SUPER`, no `DROP DATABASE`)
- [ ] Redis requires password (`requirepass` in redis.conf)
- [ ] All `.env` secrets use strong random values (generated with `php artisan key:generate`)
- [ ] `FRONTEND_URL` set to exact production domain (not `*`)
- [ ] SSL certificate active and auto-renewing
- [ ] `storage/` and `bootstrap/cache/` not accessible via web
- [ ] `.env` file not committed to version control (in `.gitignore`)
- [ ] Production server firewall allows only 80, 443, 22 (SSH) inbound
- [ ] SSH key-only authentication (no password SSH)
- [ ] `adminer-src.php` removed from `public/` in production (dev tool only)

---

## 15. Data Privacy (RA 10173 — Philippine Data Privacy Act)

iHRIS processes personal and sensitive personal information. Compliance requirements:

| Data Category | Examples | Requirement |
|---|---|---|
| Personal Information | Name, address, birthday | Encrypt in transit (HTTPS), limit access by RBAC |
| Sensitive Personal Information | Government IDs (SSS, TIN, PhilHealth) | Encrypted at rest (AES-256), access logged |
| Financial Information | Salary, payslips | Encrypted in transit, RBAC-gated, audit logged |
| Health Information | Sick leave records, medical certs | RBAC-gated, need-to-know only |

**Retention:** Payroll records and audit logs must be retained for at least 10 years per BIR requirements. Do not purge `audit_logs` or `payslips`.

**Data Subject Requests:** Employees can view their own data via ESS portal (right to access). Profile update requests (Section 7 leave workflow) satisfy the right to correction.
