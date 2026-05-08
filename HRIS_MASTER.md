# HRIS — Human Resource Information System
### Master Project Document · Standalone System · Philippines-Compliant

> **Document covers:** Project README · Full PRD · Development Roadmap · Claude Code Master Prompt  
> **Version:** 1.0.0  
> **Stack:** React + TypeScript · Laravel · MySQL · Tailwind CSS · Framer Motion

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Module Specifications (PRD)](#4-module-specifications-prd)
5. [Development Roadmap](#5-development-roadmap)
6. [Claude Code Master Prompt](#6-claude-code-master-prompt)

---

## 1. Project Overview

### What Is This?

A **standalone, production-grade HRIS** (Human Resource Information System) built for Philippine-based companies. It handles the full employee lifecycle — from recruitment and onboarding, through day-to-day attendance and payroll, to performance management and offboarding.

### Target Users

| Role | Primary Use |
|---|---|
| Super Admin | Full system control, global configuration |
| HR Admin | Employee records, payroll, compliance |
| Manager | Team approvals, scheduling, performance |
| Employee | ESS portal — payslips, leaves, requests |

### Core Value Propositions

- **PH-Compliant Payroll** — SSS, PhilHealth, Pag-IBIG, BIR, 13th Month, Final Pay computed automatically
- **Modular Architecture** — Each module is independently deployable and permission-gated
- **Role-Based Access** — Granular permission system down to individual features
- **ESS-First** — Employees self-serve; HR handles exceptions
- **Audit-Proof** — Every data mutation is logged, timestamped, and immutable

---

## 2. Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion + GSAP (ScrollTrigger for dashboards) |
| UI Components | ShadCN UI |
| State Management | Zustand |
| Data Fetching | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Charts | Recharts |
| Date Handling | Day.js |
| Rich Text | TipTap |

### Backend

| Layer | Technology |
|---|---|
| Framework | Laravel 11 (PHP 8.3) |
| API | RESTful JSON API |
| Auth | Laravel Sanctum (JWT/Token) |
| Queue | Laravel Queues + Redis |
| Notifications | Laravel Notifications (Email/SMS/Push) |
| Storage | Laravel Storage + S3-compatible |
| Scheduler | Laravel Task Scheduler |

### Database

| Layer | Technology |
|---|---|
| Primary DB | MySQL 8.x |
| Cache | Redis |
| Search | Laravel Scout (optional Meilisearch) |

### Infrastructure

| Layer | Technology |
|---|---|
| Hosting | VPS (Ubuntu 24 LTS) |
| Web Server | Nginx |
| Process Manager | Supervisor (for queues) |
| SSL | Let's Encrypt |
| CI/CD | GitHub Actions |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React Frontend                      │
│         (Vite · TypeScript · Tailwind · ShadCN)         │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS / REST API
┌─────────────────────▼───────────────────────────────────┐
│                   Laravel Backend                        │
│     API Routes → Middleware → Controllers → Services     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  RBAC    │  │  Payroll │  │ Attendance│  │ Leave  │  │
│  │ Middleware│  │  Engine  │  │  Engine  │  │ Engine │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Laravel Queue Workers (Redis)           │   │
│  │   Notifications · Reports · Payroll · Emails     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   MySQL Database                         │
│  Core · HR · Payroll · Attendance · Audit (separated)   │
└─────────────────────────────────────────────────────────┘
```

### Database Schema Strategy

- Separate schemas per domain: `core`, `hr`, `payroll`, `attendance`, `audit`
- All tables use UUID primary keys
- Soft deletes on all user-facing entities
- `audit_logs` table is append-only (no updates, no deletes)
- All timestamps stored in UTC; displayed in Asia/Manila on frontend

---

## 4. Module Specifications (PRD)

---

### 4.1 — Auth & Authentication Module

**Purpose:** Secure, stateless authentication for all user roles.

#### Features

- Secure Login / Logout
- Forgot Password + Email-based Reset
- Multi-Factor Authentication (TOTP via Authenticator App)
- Remember Device (30-day token)
- Session Timeout (configurable per role)
- Account Lockout after N failed attempts
- IP & Device Tracking on every login
- Single Sign-On (SSO) via OAuth2 (Google Workspace)
- CAPTCHA on login (hCaptcha)

#### Technical Requirements

- Auth: Laravel Sanctum (API tokens)
- Passwords: bcrypt (cost factor 12)
- HTTPS-only; HSTS headers
- MFA: TOTP (RFC 6238), stored encrypted
- All auth events logged to `audit_logs`
- Token rotation on sensitive operations (payroll access, role changes)

#### API Endpoints

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/mfa/verify
POST   /api/auth/mfa/setup
GET    /api/auth/me
```

---

### 4.2 — Role-Based UI Dashboard Module

**Purpose:** Contextual, role-specific landing page post-login.

#### Role Views

| Role | Dashboard Widgets |
|---|---|
| Super Admin | System health, active users, audit summary, module toggles |
| HR Admin | Attendance today, pending approvals, payroll status, headcount |
| Manager | Team attendance, pending leaves, upcoming schedules |
| Employee | My attendance, leave balance, payslip preview, announcements |

#### Features

- Real-time analytics widgets (React Query polling)
- Notification center (bell icon with unread badge)
- Company announcements banner
- Quick action shortcuts (role-specific)
- HR calendar (leaves, holidays, payroll dates)
- KPI summary cards

#### Technical Requirements

- Widget-based architecture (each widget is an independent component)
- Permission-gated widget rendering (no widget mounts if unauthorized)
- GSAP ScrollTrigger for dashboard reveal animations
- Framer Motion for widget entrance animations
- Dashboard layout persisted in localStorage per user

---

### 4.3 — User Management Module

**Purpose:** Lifecycle management of all system accounts.

#### Features

- Create / Edit / Deactivate Users
- Employee Account Creation (linked to Employee record)
- Department & Position Assignment
- Profile Picture Upload (max 2MB, JPEG/PNG, cropped to 1:1)
- Contact & Emergency Contact Management
- Account Status: Active / Inactive / Suspended
- Employee Profile History (immutable change log)
- Bulk Import via Excel template

#### Technical Requirements

- Soft delete (never hard delete user records)
- UUID-based user IDs
- File storage: S3-compatible (local disk for dev, cloud for prod)
- Profile image: auto-compressed on upload
- Import: validate before write; return row-level error report

---

### 4.4 — Role & Access Management (RBAC) Module

**Purpose:** Granular, auditable permission system.

#### Permission Levels

```
System
  └── Module
        └── Feature
              └── Action (view | create | edit | delete | export)
```

#### Features

- Role Creation (custom roles, unlimited)
- Permission Assignment per Role (module + feature + action)
- Hierarchical Roles (Super Admin > HR Admin > Manager > Employee)
- Clone Role permissions
- Permission preview before saving
- Audit trail for all permission changes

#### Technical Requirements

- Middleware-enforced (no client-side-only gating)
- Permission cache (Redis, invalidated on role change)
- Principle of Least Privilege as default
- All permission mutations logged with actor + before/after diff

---

### 4.5 — Employee Management Module

**Purpose:** Single source of truth for all employee data.

#### Features

- Employee Master Record (personal, employment, compensation)
- Auto-generated Employee ID (format configurable: `EMP-0001`)
- Employment Status: Regular / Probationary / Contractual / Part-time / Resigned / Terminated
- Department & Position Management (with hierarchy)
- Employment History (promotion, transfer, salary change — all versioned)
- Contract Management (upload, expiry alerts)
- Dependents Management
- Government ID Numbers (SSS, PhilHealth, Pag-IBIG, TIN)
- Document Expiration Reminders (automated via scheduler)

#### Technical Requirements

- Normalize: `employees`, `employment_histories`, `positions`, `departments`, `contracts`
- All salary history is append-only (no mutation of past records)
- Government IDs stored encrypted at rest
- Expiry reminders: Laravel Scheduler → Notification queue

---

### 4.6 — Attendance Tracking Module

**Purpose:** Accurate, flexible daily attendance capture.

#### Features

- Time In / Time Out logging
- Multiple entry modes: Web, QR Code, Biometric Device, GPS, Face Recognition
- Late & Undertime detection (vs. scheduled shift)
- Overtime tracking (auto-flagged, pending approval)
- Break Time Monitoring
- Attendance Correction Requests (employee-initiated, manager-approved)
- Attendance Reports (daily, weekly, monthly)
- Duplicate entry prevention
- Remote attendance with location tagging

#### Technical Requirements

- All timestamps stored in UTC
- Work hours auto-computed on Time Out
- Immutable log table; corrections create new rows (not updates)
- Late threshold: configurable per company policy
- GPS validation: configurable radius per location
- QR: time-based rotating QR codes (refresh every 5 minutes)

#### Calculation Logic

```
Regular Hours    = min(actual_work_hours, shift_hours)
Undertime        = max(0, shift_hours - actual_work_hours)
Overtime         = max(0, actual_work_hours - shift_hours)  [pending approval]
Late Minutes     = max(0, time_in - shift_start)
```

---

### 4.7 — Shift & Scheduling Module

**Purpose:** Define and manage work schedules for all employees.

#### Features

- Shift Templates (Day / Evening / Night / Custom)
- Rotational & Fixed Scheduling
- Rest Day Configuration
- Auto Shift Assignment (by department or position)
- Shift Swap Requests (employee-to-employee, manager-approved)
- Team Scheduling Calendar
- Conflict Detection (overlapping shifts, rest day violations)
- Holiday Tagging on Calendar

#### Technical Requirements

- Schedule stored per employee per date
- Conflict check runs pre-save
- Calendar view: FullCalendar.js or custom Recharts timeline
- Overtime threshold: configurable (default: 8 hours/day)

---

### 4.8 — Leave Management Module

**Purpose:** Structured, policy-driven leave filing and approval.

#### Leave Types (Configurable)

- Vacation Leave (VL)
- Sick Leave (SL)
- Emergency Leave
- Maternity / Paternity Leave (PH Labor Code compliant)
- Solo Parent Leave
- Service Incentive Leave (SIL)
- Custom company-defined types

#### Features

- Leave Filing (full-day and half-day)
- Multi-Level Approval Workflow (configurable: 1–3 levels)
- Leave Credits Management (manual + automated accrual)
- Leave Carry-Over Policy (configurable)
- Leave Encashment (computed in payroll)
- Leave Calendar (team visibility, conflict indicator)
- Sick Leave: attachment upload (medical cert)
- Leave History per employee

#### Technical Requirements

- Leave balance validated before filing (cannot exceed credits)
- Leave deduction: auto-applied on approval
- Approval chain: configurable per leave type
- Carry-over: processed on fiscal year reset (scheduler)
- Overlapping leave detection

---

### 4.9 — Payroll Module (Philippines-Compliant)

**Purpose:** Accurate, auditable payroll processing for PH-based companies.

#### Base Computation

```
Gross Pay     = Basic Pay + Overtime Pay + Holiday Pay + Night Diff + Allowances + Bonuses
Total Deductions = SSS + PhilHealth + Pag-IBIG + Withholding Tax + Loan Deductions + Others
Net Pay       = Gross Pay - Total Deductions
```

#### PH-Specific Features

| Component | Basis |
|---|---|
| SSS | 2024 contribution table |
| PhilHealth | 5% of basic monthly salary (shared 50/50) |
| Pag-IBIG | 2% of monthly compensation (max ₱100 EE share) |
| Withholding Tax | TRAIN Law 2023 tax table |
| 13th Month Pay | 1/12 of total basic salary for the year |
| Final Pay | Unpaid salary + pro-rated 13th month + leave encashment + others |
| Holiday Pay | Regular: 100% + 100% premium; Special: 100% + 30% premium |
| Night Differential | 10% of hourly rate (10PM–6AM) |
| Overtime | Weekday: +25%; Rest day: +30%; Holiday OT: varies |

#### Features

- Payroll Period Configuration (semi-monthly / monthly / weekly)
- Payroll Generation (per period, per department, or company-wide)
- Payslip Generation (PDF, downloadable via ESS)
- Loan Deduction Management (SSS loan, Pag-IBIG loan, company loan)
- Bonus & Incentives
- Payroll Locking (finalized periods are immutable)
- Payroll History & Versioning
- Export: Excel / PDF / BIR Alpha List format

#### Technical Requirements

- All monetary values: `DECIMAL(15, 4)` in DB
- Tax tables stored in DB (updatable without code deploy)
- Payroll engine is a dedicated Laravel service class (testable in isolation)
- Payroll audit log: captures who ran it, when, and the full computation snapshot

---

### 4.10 — Employee Self-Service (ESS) Portal

**Purpose:** Empower employees to self-manage routine HR tasks.

#### Features

- View & Download Payslips (PDF)
- File Leave Requests
- View Attendance Record
- Submit Attendance Correction Requests
- View Leave Balance & History
- Update Personal Information (pending HR approval)
- Download Company Documents
- View Company Announcements
- Track Request Statuses
- In-App Notifications

#### Technical Requirements

- Mobile-first responsive design
- Progressive Web App (PWA) support for mobile employees
- All actions require employee authentication
- Personal info updates: workflow-gated (not directly applied)

---

### 4.11 — Recruitment & ATS Module

**Purpose:** End-to-end hiring pipeline from job posting to offer.

#### Hiring Pipeline Stages

```
Job Requisition → Job Posting → Application → Screening → Interview → Evaluation → Offer → Hired
```

#### Features

- Job Requisition (manager-initiated, HR-approved)
- Job Posting (internal portal + external job boards via webhook)
- Applicant Portal (public-facing application form)
- Resume Upload & Parsing
- Interview Scheduling (with interviewer calendar integration)
- Candidate Evaluation Scorecards
- Offer Letter Generation (PDF template)
- Talent Pool (rejected or future candidates)
- Hiring Analytics (time-to-hire, source tracking)

#### Technical Requirements

- Applicant portal: publicly accessible (no auth required)
- Resume storage: S3 with virus scan on upload
- Offer letters: Blade PDF templates, digitally signed
- Pipeline stages: fully configurable

---

### 4.12 — Performance Management Module

**Purpose:** Structured, data-driven employee performance evaluation.

#### Features

- KPI Definition per Position / Department
- Goal Setting (OKR-style or custom)
- Employee Self-Assessments
- Manager Evaluations
- Peer Reviews (360-degree, optional)
- Performance Score Computation (weighted)
- Review Scheduling (quarterly / semi-annual / annual)
- Performance Analytics per Team / Department
- Evaluation History

#### Technical Requirements

- Evaluation templates: configurable per role
- Scoring: weighted average of KPIs (weights configurable)
- Review reminders: automated via scheduler → notification queue
- Peer reviews: anonymized by default

---

### 4.13 — Reports & Analytics Module

**Purpose:** Actionable HR data for decision-making and compliance.

#### Report Types

| Category | Reports |
|---|---|
| Attendance | Daily logs, late/absent summary, OT summary |
| Payroll | Payroll register, payslip batch, BIR Alpha List, SSS/PhilHealth/Pag-IBIG remittance |
| Leave | Leave utilization, leave balance, leave history |
| Employee | Headcount, turnover rate, department summary |
| Recruitment | Pipeline status, time-to-hire, source effectiveness |
| Performance | Score distribution, top performers, improvement areas |

#### Features

- Role-gated report access
- Date range & filter parameters
- Export to Excel / PDF / CSV
- Scheduled report delivery via email
- Real-time KPI dashboard widgets

---

### 4.14 — Notifications Module

**Purpose:** Timely, multi-channel alerts for all system events.

#### Channels

- In-App (bell icon, notification drawer)
- Email (Laravel Mailable + queue)
- SMS (Semaphore / Vonage integration)
- Push Notifications (via PWA service worker)

#### Trigger Events

- Leave filed / approved / rejected
- Attendance correction submitted / resolved
- Payroll processed / payslip available
- Document expiring in 30/15/7 days
- New announcement published
- Job application status update
- Performance review due

#### Technical Requirements

- Queue-based delivery (Redis + Laravel Horizon)
- Per-user notification preferences
- Retry mechanism (3 attempts with exponential backoff)
- Notification read/unread state

---

### 4.15 — Audit Logs Module

**Purpose:** Complete, tamper-proof activity history.

#### Tracked Events

- All authentication events (login, logout, failed, MFA)
- Permission changes (who changed what, before/after)
- Payroll runs (who, when, computed snapshot)
- Employee record mutations (field-level diff)
- Document access
- Role assignments

#### Technical Requirements

- Append-only table (no UPDATE, no DELETE — enforced via DB trigger)
- Every row: `actor_id`, `action`, `target_type`, `target_id`, `before`, `after`, `ip_address`, `user_agent`, `created_at`
- Separate audit DB schema (cannot be dropped by application user)
- Queryable with filters by actor, action type, date range

---

### 4.16 — Organization Structure Module

**Purpose:** Visual and data representation of the company hierarchy.

#### Features

- Department Creation & Management
- Position / Job Title Management
- Reporting Line Configuration (who reports to whom)
- Organizational Chart (interactive, zoomable)
- Multi-Branch Support
- Drag-and-drop hierarchy editor (HR Admin only)

---

### 4.17 — Document Management Module

**Purpose:** Centralized, secure storage for all employee documents.

#### Features

- Employee File Storage (contracts, IDs, certificates, licenses)
- File Versioning (keep all revisions)
- Document Expiration Alerts (automated)
- Secure File Sharing (role-gated download links)
- Document Categories & Tags

#### Technical Requirements

- File encryption at rest (AES-256)
- Role-based file access
- Signed temporary URLs for download (expire after 15 minutes)
- Backup: automated daily snapshot

---

### 4.18 — HR Ticketing / Helpdesk Module

**Purpose:** Structured channel for employee HR concerns and requests.

#### Features

- Ticket Filing (employee-initiated)
- Category: Leave concerns, Payroll discrepancy, Document request, Policy inquiry, Others
- Ticket Assignment to HR staff
- Status Tracking: Open / In Progress / Resolved / Closed
- Internal Notes (HR-only, not visible to employee)
- SLA Monitoring (configurable response targets)
- Escalation on SLA breach

---

### 4.19 — Onboarding Module

**Purpose:** Structured, digital-first onboarding experience for new hires.

#### Features

- New Hire Checklist (configurable per position/department)
- Orientation Scheduling
- Digital Document Submission (pre-employment requirements)
- Equipment Assignment (integrated with Asset Management)
- Policy Acceptance with e-Signature
- Probation Period Monitoring (automated milestone alerts)
- Onboarding Progress Tracker (HR view)

---

### 4.20 — Asset Management Module

**Purpose:** Track company-owned equipment assigned to employees.

#### Features

- Equipment / Asset Registry
- Assignment to Employee
- QR / Barcode Tagging
- Maintenance Log
- Return Tracking (on resignation or transfer)
- Asset Lifecycle: Active / Under Maintenance / Retired
- Automated Maintenance Reminders

---

### 4.21 — Compliance Management Module

**Purpose:** Ensure company and employee compliance with policies and regulations.

#### Features

- Company Policy Repository (versioned)
- Policy Acknowledgment Tracking (per employee)
- Government Filing Reminders (SSS, PhilHealth, Pag-IBIG, BIR deadlines)
- Regulatory Compliance Reports
- Employee Compliance Monitoring Dashboard

---

### 4.22 — API Integration Module

**Purpose:** Enable integration with external systems and devices.

#### Supported Integrations

- Biometric Device API (attendance feed)
- Accounting Software Webhook (payroll journal entries)
- Email Provider (SMTP / SendGrid / Mailgun)
- SMS Provider (Semaphore PH / Vonage)
- SSO Provider (Google Workspace / Microsoft Azure AD)

#### Technical Requirements

- REST API with OAuth2
- API versioning (`/api/v1/`)
- Rate limiting (configurable per client)
- Webhook support with signature verification (HMAC-SHA256)
- API key management dashboard

---

### Phase 0 — Project Setup

**Goal:** Working skeleton with auth, RBAC, and deployment pipeline.

- [ ] Initialize Laravel project (API-only, Sanctum)
- [ ] Initialize React + TypeScript + Vite + Tailwind project
- [ ] Configure MySQL schemas (`core`, `hr`, `payroll`, `attendance`, `audit`)
- [ ] Set up Redis (cache + queue)
- [ ] CI/CD pipeline (GitHub Actions → VPS)
- [ ] Base RBAC: roles, permissions, middleware
- [ ] Auth module (login, logout, MFA, password reset)
- [ ] Role-based dashboard shell (empty widgets)
- [ ] Global notification component

---

### Phase 1 — Core HR 

**Goal:** Full employee lifecycle data management.

- [ ] Employee Management (master record, employment history)
- [ ] User Management (accounts, profile, bulk import)
- [ ] Department & Position Management
- [ ] Organization Chart
- [ ] Document Management (upload, versioning, expiry alerts)
- [ ] Onboarding Module
- [ ] HR Ticketing / Helpdesk

**Deliverables:** HR Admin can fully manage employee records

---

### Phase 2 — Time & Attendance 

**Goal:** Accurate daily attendance capture and scheduling.

- [ ] Shift & Scheduling Module
- [ ] Attendance Tracking (web + QR; GPS + biometric as Phase 3 add-on)
- [ ] Late / Undertime / Overtime detection
- [ ] Attendance Correction Workflow
- [ ] Attendance Reports

**Deliverables:** Employees clock in; managers see team attendance

---

### Phase 3 — Leave Management 

**Goal:** Policy-driven leave filing and approval.

- [ ] Leave Type Configuration
- [ ] Leave Filing + Approval Workflow
- [ ] Leave Credits & Accrual Engine
- [ ] Leave Calendar
- [ ] Leave Reports

**Deliverables:** Full leave cycle from filing to approval to deduction

---

### Phase 4 — Payroll 

**Goal:** Accurate, compliant PH payroll processing.

- [x] Payroll Engine (base + deductions + PH government contributions)
- [x] Withholding Tax (TRAIN Law)
- [x] Holiday Pay & Night Differential
- [x] Overtime Pay Integration
- [x] Loan Deduction Management
- [x] 13th Month Pay
- [x] Final Pay Computation
- [x] Payslip PDF Generation (printable Blade HTML; browser "Save as PDF")
- [x] Government Compliance Reports (SSS, PhilHealth, Pag-IBIG, BIR)
- [x] Payroll Audit Logging

**Deliverables:** Full payroll run with downloadable payslips and compliance reports

**Status (2026-05-07):** ✅ Phase 4 complete. 11 migrations, 11 models, 7 service classes, 7 controllers, 27 API routes, 9 React pages/tabs, 28 PHPUnit tests passing (66 assertions). Statutory tables seeded for 2024 with year-fallback lookup so payroll continues to work in subsequent years until HR Admin uploads new schedules.

---

### Phase 5 — ESS Portal 

**Goal:** Employee self-service access to their own HR data.

- [ ] ESS Dashboard
- [ ] Payslip Viewer + Download
- [ ] Leave Filing via ESS
- [ ] Attendance Recording ClockIn/Clockout
- [ ] Correction Request via ESS
- [ ] Personal Info Update Request
- [ ] PWA Configuration

**Deliverables:** Employees no longer need to contact HR for routine requests

---

### Phase 6 — Recruitment & Performance 

**Goal:** Attract, hire, and evaluate talent.

- [x] Recruitment Module (requisition → pipeline → hire)
- [ ] Applicant Portal (public-facing)
- [x] Offer Letter Generator
- [x] Performance Module (KPIs, evaluations, reviews)
- [ ] 360-Degree Peer Review
- [x] Performance Analytics

**Deliverables:** Full recruitment-to-performance loop

---

### Phase 7— Reporting, Integrations & Hardening 

**Goal:** Production-ready system with analytics and external integrations.

- [x] Reports & Analytics Module (all report types)
- [ ] Scheduled Report Delivery — *deferred (manual trigger + CSV export shipped)*
- [x] API Integration Module (API keys, webhook subscriptions, rate-limit middleware, integration log)
- [x] Biometric Device Integration *(vendor-neutral receiver; ZKTeco/Suprema/HikVision adapters stubbed)*
- [x] Accounting Software Webhook *(preview endpoint; QuickBooks/Xero/SAP push stubbed)*
- [x] Asset Management Module
- [x] Compliance Management Module
- [x] Security hardening (security headers middleware, API throttle, HMAC webhook signing, [pen-test checklist](docs/PHASE_7_HARDENING.md))
- [x] Performance optimization (composite indexes on hot lookups, eager loading on listing services)
- [ ] Load testing — *deferred to staging environment ([plan](docs/PHASE_7_HARDENING.md#9-load-testing-plan-deferred-to-staging))*

**Deliverables:** Production-ready HRIS with cross-module reporting, vendor-neutral integration scaffolding, asset & compliance management, and a documented hardening posture.

**Status (2026-05-08):** ✅ Phase 7 in-app modules complete.
- 3 migrations adding 11 tables (assets, compliance, integrations)
- 11 new models, 8 services, 9 controllers, 5 API resources
- ~50 new API routes (reports, assets, compliance, integrations) + 2 inbound webhook receivers
- 19 new permissions seeded across `reports`, `assets`, `compliance`, `integrations` modules
- 4 new frontend page sets: Reports hub + 6 drilldowns, Assets list + dialogs, Compliance (policies + filings tabs), Integrations (keys + webhooks + logs tabs)
- 2 new middleware: `AuthenticateApiKey` (with per-key rate limiting + audit log), `SecurityHeaders`
- Full vendor adapter docs in [docs/PHASE_7_HARDENING.md](docs/PHASE_7_HARDENING.md)

## 6. Claude Code Master Prompt

> Use this prompt when invoking Claude Code to build any module of this HRIS.  
> Prepend it to any feature-specific instruction for full context injection.

---

```
=======================================================================
HRIS SYSTEM — CLAUDE CODE MASTER CONTEXT PROMPT
=======================================================================

You are an expert full-stack developer building a standalone, production-
grade Human Resource Information System (HRIS) for Philippine-based
companies. You write clean, typed, auditable code that is ready for
production — not prototypes.

---

TECH STACK
---
Frontend:
  - React 19 + TypeScript (strict mode)
  - Tailwind CSS v4
  - ShadCN UI (component primitives)
  - Framer Motion (page transitions, widget animations)
  - GSAP + ScrollTrigger (dashboard reveals)
  - TanStack Query (data fetching + caching)
  - TanStack Table (data tables)
  - Zustand (global state)
  - React Hook Form + Zod (form validation)
  - Day.js (date handling — always UTC internally, Asia/Manila display)
  - Recharts (charts and graphs)

Backend:
  - Laravel 11 (PHP 8.3, strict types)
  - Laravel Sanctum (API token auth)
  - Laravel Queues + Redis (background jobs)
  - Laravel Notifications (email, SMS, in-app)
  - Laravel Storage (S3-compatible)
  - Laravel Task Scheduler

Database:
  - MySQL 8.x
  - All monetary fields: DECIMAL(15, 4)
  - All timestamps: stored UTC, displayed Asia/Manila
  - All primary keys: UUID
  - All user-facing entities: soft deletes
  - Audit log table: append-only (no UPDATE, no DELETE)

---

ARCHITECTURE RULES
---
1. RBAC is enforced server-side via middleware — never client-side only.
2. Payroll engine is a standalone Laravel Service class with unit tests.
3. All file uploads: validated type + size, stored via Laravel Storage,
   served via signed temporary URLs (15-min expiry).
4. Every data mutation must write to the audit_logs table with:
   actor_id, action, target_type, target_id, before (JSON), after (JSON),
   ip_address, user_agent, created_at.
5. No hard deletes on user, employee, payroll, or attendance records.
6. All API routes: versioned under /api/v1/
7. All responses follow JSend spec:
   { status: 'success'|'fail'|'error', data: {...}, message?: '' }

---

PHILIPPINES COMPLIANCE RULES
---
- SSS contributions: use current table from DB (not hardcoded)
- PhilHealth: 5% of basic monthly salary, split 50/50 EE/ER
- Pag-IBIG: 2% employee share, max ₱100/month employee cap
- BIR Withholding Tax: TRAIN Law 2023 graduated tax table
- 13th Month Pay: 1/12 of total basic salary earned for the year
- Night Differential: 10% of hourly rate for hours worked 10PM–6AM
- Regular Holiday: 100% + 100% premium (200% of daily rate)
- Special Non-Working Holiday: 130% of daily rate if worked
- Overtime (weekday): +25% of hourly rate
- Overtime (rest day/special holiday): +30% of hourly rate
- All statutory contribution tables must be updatable via DB admin
  without a code deployment.

---

CODE QUALITY STANDARDS
---
- Laravel: Follow Repository Pattern (Repository → Service → Controller)
- TypeScript: No `any` types. Define all interfaces in /types directory.
- Components: All React components typed with explicit props interfaces.
- Forms: All forms validated with Zod schema before submission.
- Tables: Use TanStack Table with server-side pagination.
- API calls: All wrapped in TanStack Query hooks (custom hooks in /hooks).
- Error handling: Global error boundary + per-request toast feedback.
- Loading states: Skeleton loaders (not spinners) for all data fetches.
- Empty states: Meaningful empty state components (not blank divs).

---

UI/UX STANDARDS
---
- Design system: ShadCN UI base, extended with project tokens
- Dark mode: supported via Tailwind dark: classes
- Responsive: mobile-first (ESS portal must be fully mobile usable)
- Animations:
    - Page transitions: Framer Motion (fade + slide, 200ms)
    - Dashboard widget entrance: GSAP staggered reveal on mount
    - Table row interactions: Framer Motion layout animations
- Data tables: column sorting, filtering, pagination, export button
- Modals: ShadCN Dialog, always with loading + error states
- Forms: inline validation, disabled submit until valid

---

FILE STRUCTURE CONVENTIONS
---
Backend (Laravel):
  app/
    Http/Controllers/Api/V1/{Module}/
    Http/Requests/{Module}/
    Services/{Module}Service.php
    Repositories/{Module}Repository.php
    Models/
    Notifications/
    Jobs/
  database/
    migrations/
    seeders/

Frontend (React):
  src/
    api/          — Axios instances + raw API calls
    hooks/        — TanStack Query custom hooks
    components/
      ui/         — ShadCN primitives
      shared/     — Reusable project components
      {module}/   — Module-specific components
    pages/        — Route-level page components
    stores/       — Zustand stores
    types/        — TypeScript interfaces
    utils/        — Pure utility functions
    lib/          — Third-party config (queryClient, axios, dayjs)

---

WHEN BUILDING A MODULE, ALWAYS DELIVER:
---
1. Database migrations (with indexes, foreign keys, soft deletes)
2. Laravel Model (with relationships, casts, fillable)
3. Repository class (all DB queries isolated here)
4. Service class (business logic, calls repository)
5. Controller (thin — delegates to service, returns response)
6. Form Requests (validation rules)
7. API Resource (response shaping)
8. Routes (in routes/api.php, versioned, middleware-gated)
9. Notification classes (if module triggers alerts)
10. React types (TypeScript interfaces matching API Resource)
11. TanStack Query hooks (useGetX, useCreateX, useUpdateX, useDeleteX)
12. Page component (with table/list, create/edit modal, filters)
13. Audit log integration (every mutation writes to audit_logs)
14. Unit tests for Service class (especially payroll and leave logic)

---

WHEN IN DOUBT:
---
- More restrictive permission is always correct
- Never trust client-sent data without server validation
- If a number is money, use DECIMAL(15,4) — never float
- If a time is stored, store UTC — always
- If a record changes, log it — always
=======================================================================
```

---

## Appendix A — Government Contribution Tables (2024)

### SSS Contribution Table (2024)

| Monthly Compensation | EE Share | ER Share |
|---|---|---|
| ≤ ₱3,250 | ₱135.00 | ₱275.00 |
| ₱3,250 – ₱3,749.99 | ₱157.50 | ₱292.50 |
| … | … | … |
| ₱29,750 and above | ₱1,125.00 | ₱2,255.00 |

> Store the full table in `sss_contribution_brackets` DB table. Update without code deploy.

---

### PhilHealth (2024)

- Rate: **5%** of basic monthly salary
- Employee share: **2.5%**
- Employer share: **2.5%**
- Floor: ₱10,000 (minimum salary base)
- Ceiling: ₱100,000 (maximum salary base)

---

### Pag-IBIG (2024)

- Employee earning ≤ ₱1,500/month: 1% of monthly compensation
- Employee earning > ₱1,500/month: 2% of monthly compensation
- Maximum employee share: **₱100/month**
- Employer mandatory counterpart: 2%

---

### BIR TRAIN Law Tax Table (2023 onwards)

| Annual Taxable Income | Tax |
|---|---|
| ≤ ₱250,000 | 0% |
| ₱250,001 – ₱400,000 | 15% of excess over ₱250,000 |
| ₱400,001 – ₱800,000 | ₱22,500 + 20% of excess over ₱400,000 |
| ₱800,001 – ₱2,000,000 | ₱102,500 + 25% of excess over ₱800,000 |
| ₱2,000,001 – ₱8,000,000 | ₱402,500 + 30% of excess over ₱2,000,000 |
| Over ₱8,000,000 | ₱2,202,500 + 35% of excess over ₱8,000,000 |

> Store tax brackets in `bir_tax_brackets` DB table. Annualize monthly income for lookup.

---

## Appendix B — Key Business Rules

1. **Payroll periods are immutable once finalized.** No edits post-lock; corrections are made in the next period with documented adjustments.
2. **Attendance logs are immutable.** Corrections create a new correction record linked to the original log.
3. **Leave deductions happen on approval**, not on filing.
4. **Overtime must be pre-approved** (or flagged as pending on auto-detect) before it is included in payroll.
5. **13th Month Pay** is computed based on total basic salary received for the calendar year (Jan–Dec), not the contractual rate.
6. **Government contributions** use the compensation received in the payroll period, not the monthly basic rate, for proper bracket lookup.
7. **All resignation final pay** must include: unpaid salary, pro-rated 13th month, leave encashment (if eligible), and separation pay (if applicable per labor code).

---

*Last updated: 2026 · Maintained by: CW Devs*
