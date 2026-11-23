// ============================================================================
// "OXŞAR İNŞAAT" — MÜDÜR PORTALI (/admin) API CONTRACT TYPES (v1.0.0)
// 100% snake_case alignment with docs/API_CONTRACT.md
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  error_code: string;
  details: Record<string, string> | null;
}

// --- Enums ---
export type WorkerRole = 'ADMIN' | 'USTA' | 'FEHLE';
export type StaffRole = 'USTA' | 'FEHLE';

export type ProjectStatus =
  | 'GOZLEMEDE'
  | 'AKTIV'
  | 'DAYANDIRILIB'
  | 'TAMAMLANDI'
  | 'PASSIV';

export type SupplyType = 'MATERIALLI' | 'ISCILIK';

export type AuditTargetTable =
  | 'projects'
  | 'daily_logs'
  | 'advances'
  | 'workers'
  | 'project_materials';

// --- Pagination ---
export interface PaginationMeta {
  total_items: number;
  total_pages: number;
  current_page: number;
  limit: number;
}

// --- MODUL 1: Auth & Profile ---
export interface LoginRequest {
  phone: string;
  password: string;
}

export interface AdminUser {
  id: string;
  full_name: string;
  role: 'ADMIN';
  phone: string;
  is_active: boolean;
}

export interface LoginResponseData {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  admin: AdminUser;
}

export interface AdminCompanyInfo {
  name: string;
  field: string;
  timezone: string;
}

export interface AdminProfile extends AdminUser {
  company: AdminCompanyInfo;
}

// --- MODUL 2: Projects & Proposals ---
export interface ProjectFinancialSummary {
  total_revenue: number;
  total_material_cost: number;
  total_labor_cost: number;
  total_cost: number;
  estimated_profit: number;
  profit_margin_percent: number;
}

export interface ProjectListItem {
  id: string;
  name: string;
  address: string;
  client_name: string;
  client_phone: string;
  magic_token: string;
  status: ProjectStatus;
  pause_reason: string | null;
  supply_type: SupplyType;
  material_brand: string | null;
  price_per_m2: number;
  total_target_m2: number;
  total_completed_m2: number;
  progress_percent: number;
  total_amount: number;
  financial_summary: ProjectFinancialSummary;
  warranty_years: number;
  stages_count: number;
  active_workers_count: number;
  completed_at: string | null;
  created_at: string;
}

export interface ProjectsListResponseData {
  projects: ProjectListItem[];
  pagination: PaginationMeta;
}

export interface ProjectStage {
  id: string;
  work_type_id: string;
  work_type_name?: string;
  stage_name: string;
  target_m2: number;
  completed_m2: number;
  progress_percent?: number;
  is_completed?: boolean;
}

export interface ProjectMaterial {
  id: string;
  project_id?: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  added_at: string;
}

export interface DailyLogWorkerRef {
  id: string;
  full_name: string;
  phone: string;
}

export interface DailyLog {
  id: string;
  work_date: string;
  stage_id: string;
  stage_name: string;
  usta: DailyLogWorkerRef;
  helpers: DailyLogWorkerRef[];
  morning_time: string;
  morning_media_url: string;
  evening_time: string | null;
  evening_media_url: string | null;
  done_m2: number;
  material_note: string | null;
  is_below_norm: boolean;
  status: 'OPEN' | 'CLOSED';
}

export interface ProjectDetailProgress {
  total_target_m2: number;
  total_completed_m2: number;
  percentage: number;
  estimated_days_total: number;
  worked_days_so_far: number;
}

export interface ProjectDetailFinancials {
  agreed_amount: number;
  materials_cost: number;
  labor_cost: number;
  net_profit: number;
  profit_margin_percent: number;
}

export interface ProjectDetail {
  id: string;
  name: string;
  address: string;
  client_name: string;
  client_phone: string;
  magic_token: string;
  magic_link_url: string;
  status: ProjectStatus;
  pause_reason: string | null;
  supply_type: SupplyType;
  material_brand: string | null;
  price_per_m2: number;
  total_amount: number;
  warranty_years: number;
  otp_code: string;
  completed_at: string | null;
  created_at: string;
  progress: ProjectDetailProgress;
  financials: ProjectDetailFinancials;
  stages: ProjectStage[];
  materials: ProjectMaterial[];
  daily_logs: DailyLog[];
}

export interface CreateProjectStageInput {
  work_type_id: string;
  stage_name: string;
  target_m2: number;
}

export interface CreateProjectRequest {
  name: string;
  address: string;
  client_name: string;
  client_phone: string;
  supply_type: SupplyType;
  material_brand?: string | null;
  price_per_m2: number;
  warranty_years: number;
  stages: CreateProjectStageInput[];
}

export interface CreateProjectResponseData {
  id: string;
  name: string;
  address: string;
  client_name: string;
  client_phone: string;
  magic_token: string;
  magic_link_url: string;
  status: ProjectStatus;
  supply_type: SupplyType;
  material_brand: string | null;
  price_per_m2: number;
  total_amount: number;
  calculated_total_m2: number;
  estimated_working_days: number;
  warranty_years: number;
  otp_code: string;
  stages: ProjectStage[];
  created_at: string;
}

export interface UpdateProjectRequest {
  name: string;
  address: string;
  client_name: string;
  client_phone: string;
  supply_type: SupplyType;
  material_brand?: string | null;
  price_per_m2: number;
  warranty_years: number;
}

export interface ChangeProjectStatusRequest {
  status: ProjectStatus;
  pause_reason: string | null;
}

export interface DeleteProjectResponseData {
  id: string;
  deleted: boolean;
  archived?: boolean;
  status?: ProjectStatus;
}

// --- MODUL 3: Workers, Advances & Payroll ---
export interface WorkerCurrentPeriod {
  period_start: string;
  worked_days: number;
  gross_salary: number;
  total_advances: number;
  net_balance: number;
  last_worked_date: string | null;
}

export interface Worker {
  id: string;
  full_name: string;
  role: StaffRole;
  phone: string;
  daily_wage: number;
  is_active: boolean;
  current_period: WorkerCurrentPeriod;
}

export interface CreateWorkerRequest {
  full_name: string;
  role: StaffRole;
  phone: string;
  daily_wage: number;
  pin?: string | null;
}

export interface UpdateWorkerRequest {
  full_name: string;
  phone: string;
  daily_wage: number;
  pin?: string | null;
}

export interface CreateAdvanceRequest {
  worker_id: string;
  amount: number;
  given_date: string;
  note?: string;
}

export interface CreateAdvanceResponseData {
  id: string;
  worker_id: string;
  worker_name: string;
  amount: number;
  given_date: string;
  note: string | null;
  created_by: string;
  updated_worker_balance: {
    total_advances: number;
    net_balance: number;
  };
  created_at: string;
}

export interface WorkerAdvanceItem {
  id: string;
  amount: number;
  given_date: string;
  note: string | null;
  created_by_name: string;
  created_at: string;
}

export interface WorkerAdvancesHistoryData {
  worker: {
    id: string;
    full_name: string;
    role: StaffRole;
  };
  total_advances_sum: number;
  advances: WorkerAdvanceItem[];
}

export interface SettleWorkerRequest {
  period_start: string;
  period_end: string;
  note?: string;
}

export interface SettleWorkerResponseData {
  settlement_id: string;
  worker_id: string;
  worker_name: string;
  period_start: string;
  period_end: string;
  worked_days: number;
  daily_wage: number;
  gross_salary: number;
  total_advances: number;
  net_paid: number;
  paid_at: string;
  new_period_opened_at: string;
}

export interface SalarySettlementItem {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_role: StaffRole;
  period_start: string;
  period_end: string;
  worked_days: number;
  gross_salary: number;
  total_advances: number;
  net_paid: number;
  paid_at: string;
}

// --- MODUL 4: Work Types ---
export interface WorkType {
  id: string;
  name: string;
  daily_norm_m2: number;
  default_price_m2: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkTypeRequest {
  name: string;
  daily_norm_m2: number;
  default_price_m2: number;
}

// --- MODUL 5: Project Materials ---
export interface ProjectMaterialsResponseData {
  project_id: string;
  project_name: string;
  total_material_cost_sum: number;
  materials: ProjectMaterial[];
}

export interface CreateMaterialRequest {
  item_name: string;
  quantity: number;
  unit_cost: number;
}

export interface CreateMaterialResponseData extends ProjectMaterial {
  project_id: string;
  new_project_material_total: number;
}

// --- MODUL 6: Analytics & Audit Logs ---
export interface AnalyticsKpis {
  active_projects_count: number;
  pending_proposals_count: number;
  paused_projects_count: number;
  completed_projects_count: number;
  total_active_workers: number;
  total_revenue: number;
  total_material_cost: number;
  total_labor_cost: number;
  total_expenses: number;
  net_profit: number;
  average_profit_margin_percent: number;
}

export interface AnalyticsProjectComparison {
  project_id: string;
  name: string;
  status: ProjectStatus;
  total_amount: number;
  material_cost: number;
  labor_cost: number;
  net_profit: number;
  profit_margin_percent: number;
  progress_percent: number;
}

export interface AnalyticsSummaryData {
  kpis: AnalyticsKpis;
  projects_comparison: AnalyticsProjectComparison[];
}

export interface AuditLogItem {
  id: string;
  actor: {
    id: string;
    full_name: string;
    role: WorkerRole;
  };
  action: string;
  target_table: AuditTargetTable | string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogsResponseData {
  logs: AuditLogItem[];
  pagination: PaginationMeta;
}

export interface PatchDailyLogRequest {
  done_m2: number;
  material_note?: string;
  is_below_norm?: boolean;
  admin_correction_reason: string;
}

export interface PatchDailyLogResponseData {
  id: string;
  project_id: string;
  stage_id: string;
  previous_done_m2: number;
  new_done_m2: number;
  admin_correction_reason: string;
  recalculated_stage: {
    id: string;
    completed_m2: number;
    target_m2: number;
    progress_percent: number;
  };
  recalculated_project: {
    total_completed_m2: number;
    progress_percent: number;
  };
  updated_at: string;
}
