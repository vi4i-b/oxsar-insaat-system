import ustaApi from './ustaAxiosClient';
import type { ApiResponse } from '../types/api';
import type {
  CompleteProjectOtpResponseData,
  EveningCheckOutResponseData,
  MorningCheckInResponseData,
  UstaActiveProject,
  UstaHelperOption,
  UstaLoginRequest,
  UstaLoginResponseData,
  UstaProfile,
  UstaTodayLogsData,
  UstaWalletData,
} from '../types/usta';

export const ustaService = {
  login(payload: UstaLoginRequest): Promise<ApiResponse<UstaLoginResponseData>> {
    return ustaApi.post('/login', payload);
  },

  me(): Promise<ApiResponse<UstaProfile>> {
    return ustaApi.get('/me');
  },

  getActiveProjects(): Promise<ApiResponse<UstaActiveProject[]>> {
    return ustaApi.get('/projects');
  },

  getHelpers(): Promise<ApiResponse<UstaHelperOption[]>> {
    return ustaApi.get('/helpers');
  },

  getTodayLogs(): Promise<ApiResponse<UstaTodayLogsData>> {
    return ustaApi.get('/daily-logs/today');
  },

  morningCheckIn(params: {
    project_id: string;
    helper_ids: string[];
    media: File;
  }): Promise<ApiResponse<MorningCheckInResponseData>> {
    const formData = new FormData();
    formData.append('project_id', params.project_id);
    formData.append('helper_ids', JSON.stringify(params.helper_ids));
    formData.append('media', params.media);
    return ustaApi.post('/daily-logs/morning', formData);
  },

  eveningCheckOut(
    logId: string,
    params: {
      stage_id: string;
      done_m2: number;
      material_note?: string;
      media: File;
    }
  ): Promise<ApiResponse<EveningCheckOutResponseData>> {
    const formData = new FormData();
    formData.append('stage_id', params.stage_id);
    formData.append('done_m2', String(params.done_m2));
    if (params.material_note?.trim()) {
      formData.append('material_note', params.material_note.trim());
    }
    formData.append('media', params.media);
    return ustaApi.post(`/daily-logs/${logId}/evening`, formData);
  },

  completeProjectWithOtp(
    projectId: string,
    otp_code: string
  ): Promise<ApiResponse<CompleteProjectOtpResponseData>> {
    return ustaApi.post(`/projects/${projectId}/complete-otp`, { otp_code });
  },

  getWallet(): Promise<ApiResponse<UstaWalletData>> {
    return ustaApi.get('/wallet');
  },
};
