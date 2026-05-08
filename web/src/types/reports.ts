// Phase 7 — Reports & Analytics types
// Responses from /reports/* endpoints (services/Reports/ReportsService.php).

export interface ExecutiveSummary {
  headcount: {
    total: number;
    active: number;
    new_hires_mtd: number;
    separations_mtd: number;
  };
  pending_leaves: number;
  open_requisitions: number;
  reviews_in_progress: number;
  payroll_runs_mtd: number;
  generated_at: string;
}

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface EmployeeReport {
  by_department: Array<{ department: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
  by_gender: Array<{ gender: string; count: number }>;
  trend: Array<{ month: string; hires: number; separations: number }>;
  turnover_rate_annualized: number;
  date_range: DateRange;
}

export interface AttendanceReport {
  daily: Array<{
    date: string;
    present: number;
    late: number;
    undertime: number;
    overtime_hours: number;
  }>;
  totals: {
    days_covered: number;
    total_late: number;
    total_undertime: number;
    total_overtime_hours: number;
  };
  date_range: DateRange;
}

export interface LeaveReport {
  by_type: Array<{ leave_type: string; requests: number; total_days: number }>;
  by_status: Array<{ status: string; count: number }>;
  date_range: DateRange;
}

export interface PayrollRegisterReport {
  rows: Array<{
    employee_number: string | null;
    employee_name: string;
    gross_earnings: number;
    total_deductions: number;
    net_pay: number;
  }>;
  totals: {
    count: number;
    gross_earnings: number;
    total_deductions: number;
    net_pay: number;
  };
  date_range: DateRange;
}

export interface RecruitmentReport {
  by_stage: Array<{ stage: string; count: number }>;
  by_source: Array<{ source: string; count: number }>;
  open_postings: number;
  hired_count: number;
  avg_time_to_hire_days: number;
  date_range: DateRange;
}

export interface PerformanceReport {
  by_status: Array<{ status: string; count: number }>;
  score_distribution: Array<{ score_bucket: number; count: number }>;
  top_performers: Array<{
    employee_number: string | null;
    employee_name: string;
    overall_score: number;
  }>;
}

export type ReportType =
  | 'employees'
  | 'attendance'
  | 'leaves'
  | 'payroll-register'
  | 'recruitment'
  | 'performance';
