import api from './axiosClient';
import type {
  AnalyticsSummaryData,
  ApiResponse,
  AuditLogsResponseData,
  PatchDailyLogRequest,
  PatchDailyLogResponseData,
} from '../types/api';

export const analyticsService = {
  getSummary(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<AnalyticsSummaryData>> {
    const cleanParams: Record<string, string> = {};
    if (params?.start_date) cleanParams.start_date = params.start_date;
    if (params?.end_date) cleanParams.end_date = params.end_date;
    return api.get('/analytics/summary', { params: cleanParams });
  },

  getAuditLogs(params?: {
    target_table?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<AuditLogsResponseData>> {
    const cleanParams: Record<string, string | number> = {};
    if (params?.target_table) cleanParams.target_table = params.target_table;
    if (params?.page) cleanParams.page = params.page;
    if (params?.limit) cleanParams.limit = params.limit;
    return api.get('/audit-logs', { params: cleanParams });
  },

  overrideDailyLog(
    id: string,
    payload: PatchDailyLogRequest
  ): Promise<ApiResponse<PatchDailyLogResponseData>> {
    return api.patch(`/daily-logs/${id}`, payload);
  },
};
