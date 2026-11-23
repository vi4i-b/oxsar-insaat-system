import api from './axiosClient';
import type {
  AdminProfile,
  ApiResponse,
  LoginRequest,
  LoginResponseData,
} from '../types/api';

export const authService = {
  login(payload: LoginRequest): Promise<ApiResponse<LoginResponseData>> {
    return api.post('/login', payload);
  },

  me(): Promise<ApiResponse<AdminProfile>> {
    return api.get('/me');
  },
};
