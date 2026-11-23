import api from './axiosClient';
import type {
  ApiResponse,
  CreateMaterialRequest,
  CreateMaterialResponseData,
  ProjectMaterialsResponseData,
} from '../types/api';

export const materialsService = {
  listByProject(
    projectId: string
  ): Promise<ApiResponse<ProjectMaterialsResponseData>> {
    return api.get(`/projects/${projectId}/materials`);
  },

  add(
    projectId: string,
    payload: CreateMaterialRequest
  ): Promise<ApiResponse<CreateMaterialResponseData>> {
    return api.post(`/projects/${projectId}/materials`, payload);
  },

  remove(
    id: string
  ): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
    return api.delete(`/materials/${id}`);
  },
};
