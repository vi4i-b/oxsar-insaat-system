import api from './axiosClient';
import type { ApiResponse, WorkType, WorkTypeRequest } from '../types/api';

export const workTypesService = {
  list(): Promise<ApiResponse<WorkType[]>> {
    return api.get('/work-types');
  },

  create(payload: WorkTypeRequest): Promise<ApiResponse<WorkType>> {
    return api.post('/work-types', payload);
  },

  update(id: string, payload: WorkTypeRequest): Promise<ApiResponse<WorkType>> {
    return api.put(`/work-types/${id}`, payload);
  },
};
