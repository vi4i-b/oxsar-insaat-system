import api from './axiosClient';
import type {
  ApiResponse,
  CreateAdvanceRequest,
  CreateAdvanceResponseData,
  CreateWorkerRequest,
  SalarySettlementItem,
  SettleWorkerRequest,
  SettleWorkerResponseData,
  StaffRole,
  UpdateWorkerRequest,
  Worker,
  WorkerAdvancesHistoryData,
} from '../types/api';

export interface GetWorkersParams {
  role?: StaffRole | '';
  is_active?: boolean | '';
}

export const workersService = {
  list(params?: GetWorkersParams): Promise<ApiResponse<Worker[]>> {
    const cleanParams: Record<string, string | boolean> = {};
    if (params?.role) cleanParams.role = params.role;
    if (params?.is_active !== '' && params?.is_active !== undefined) {
      cleanParams.is_active = params.is_active;
    }
    return api.get('/workers', { params: cleanParams });
  },

  create(payload: CreateWorkerRequest): Promise<ApiResponse<Worker>> {
    return api.post('/workers', payload);
  },

  update(id: string, payload: UpdateWorkerRequest): Promise<ApiResponse<Worker>> {
    return api.put(`/workers/${id}`, payload);
  },

  toggleActive(
    id: string
  ): Promise<
    ApiResponse<{
      id: string;
      full_name: string;
      is_active: boolean;
      updated_at: string;
    }>
  > {
    return api.patch(`/workers/${id}/toggle-active`);
  },

  createAdvance(
    payload: CreateAdvanceRequest
  ): Promise<ApiResponse<CreateAdvanceResponseData>> {
    return api.post('/advances', payload);
  },

  getWorkerAdvances(
    id: string,
    params?: { from_date?: string; to_date?: string }
  ): Promise<ApiResponse<WorkerAdvancesHistoryData>> {
    const cleanParams: Record<string, string> = {};
    if (params?.from_date) cleanParams.from_date = params.from_date;
    if (params?.to_date) cleanParams.to_date = params.to_date;
    return api.get(`/workers/${id}/advances`, { params: cleanParams });
  },

  settlePayroll(
    id: string,
    payload: SettleWorkerRequest
  ): Promise<ApiResponse<SettleWorkerResponseData>> {
    return api.post(`/workers/${id}/settle`, payload);
  },

  getSettlements(params?: {
    worker_id?: string;
    month?: string;
  }): Promise<ApiResponse<SalarySettlementItem[]>> {
    const cleanParams: Record<string, string> = {};
    if (params?.worker_id) cleanParams.worker_id = params.worker_id;
    if (params?.month) cleanParams.month = params.month;
    return api.get('/salary-settlements', { params: cleanParams });
  },
};
