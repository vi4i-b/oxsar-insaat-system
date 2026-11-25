// ============================================================================
// "OXŞAR İNŞAAT" — İŞÇİ (USTA) MOBİL PORTALI (/usta) API TYPES (v1.0.0)
// 100% snake_case alignment with docs/USTA_API_CONTRACT.md & schema.prisma
// ============================================================================

import type { StaffRole, SupplyType, WorkerCurrentPeriod } from './api';

export interface UstaProfile {
  id: string;
  full_name: string;
  role: 'USTA';
  phone: string;
  daily_wage: number;
  is_active: boolean;
}

export interface UstaLoginRequest {
  phone: string;
  pin: string;
}

export interface UstaLoginResponseData {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  usta: UstaProfile;
}

export interface UstaProjectStage {
  id: string;
  work_type_id: string;
  work_type_name: string;
  daily_norm_m2: number;
  stage_name: string;
  target_m2: number;
  completed_m2: number;
  remaining_m2: number;
  progress_percent: number;
  is_completed: boolean;
}

export interface UstaActiveProject {
  id: string;
  name: string;
  address: string;
  client_name?: string;
  supply_type: SupplyType;
  material_brand: string | null;
  total_target_m2: number;
  total_completed_m2: number;
  progress_percent: number;
  is_ready_for_otp: boolean;
  stages: UstaProjectStage[];
}

export interface UstaHelperOption {
  id: string;
  full_name: string;
  role: StaffRole;
  phone: string;
}

export interface UstaShiftLog {
  id: string;
  project_id: string;
  project_name: string;
  project_address?: string;
  work_date: string;
  morning_time: string;
  morning_media_url: string;
  evening_time?: string | null;
  evening_media_url?: string | null;
  stage_id?: string | null;
  stage_name?: string | null;
  done_m2?: number;
  material_note?: string | null;
  is_below_norm?: boolean;
  helpers: Array<{
    id: string;
    full_name: string;
    role?: StaffRole;
  }>;
  status: 'OPEN' | 'CLOSED';
}

export interface UstaTodayLogsData {
  today_date: string;
  open_log: UstaShiftLog | null;
  closed_logs_today: UstaShiftLog[];
}

export interface MorningCheckInResponseData {
  id: string;
  project_id: string;
  project_name: string;
  work_date: string;
  morning_time: string;
  morning_media_url: string;
  helper_ids: string[];
  status: 'OPEN';
}

export interface EveningCheckOutResponseData {
  id: string;
  status: 'CLOSED';
  evening_time: string;
  evening_media_url: string;
  done_m2: number;
  is_below_norm: boolean;
  stage_progress: {
    id: string;
    completed_m2: number;
    target_m2: number;
    progress_percent: number;
  };
  project_progress: {
    total_completed_m2: number;
    total_target_m2: number;
    progress_percent: number;
    is_ready_for_otp: boolean;
  };
}

export interface CompleteProjectOtpResponseData {
  project_id: string;
  status: 'TAMAMLANDI';
  completed_at: string;
}

export interface UstaWalletAdvance {
  id: string;
  amount: number;
  given_date: string;
  note: string | null;
  created_at: string;
}

export interface UstaWalletRecentLog {
  id: string;
  work_date: string;
  project_name: string;
  stage_name: string;
  done_m2: number;
  morning_time: string;
  evening_time: string | null;
  status: 'OPEN' | 'CLOSED';
  is_below_norm: boolean;
}

export interface UstaWalletSettlement {
  id: string;
  period_start: string;
  period_end: string;
  worked_days: number;
  gross_salary: number;
  total_advances: number;
  net_paid: number;
  paid_at: string;
}

export interface UstaWalletData {
  worker: {
    id: string;
    full_name: string;
    role: 'USTA';
    phone: string;
    daily_wage: number;
  };
  current_period: WorkerCurrentPeriod;
  advances: UstaWalletAdvance[];
  recent_logs: UstaWalletRecentLog[];
  settlements: UstaWalletSettlement[];
}
