import api from './axiosClient';
import type {
  ApiResponse,
  ChangeProjectStatusRequest,
  CreateProjectRequest,
  CreateProjectResponseData,
  DeleteProjectResponseData,
  ProjectDetail,
  ProjectStatus,
  ProjectsListResponseData,
  UpdateProjectRequest,
} from '../types/api';

export interface GetProjectsParams {
  status?: ProjectStatus | '';
  search?: string;
  page?: number;
  limit?: number;
}

export const projectsService = {
  list(params?: GetProjectsParams): Promise<ApiResponse<ProjectsListResponseData>> {
    const cleanParams: Record<string, string | number> = {};
    if (params?.status) cleanParams.status = params.status;
    if (params?.search?.trim()) cleanParams.search = params.search.trim();
    if (params?.page) cleanParams.page = params.page;
    if (params?.limit) cleanParams.limit = params.limit;
    return api.get('/projects', { params: cleanParams });
  },

  getById(id: string): Promise<ApiResponse<ProjectDetail>> {
    return api.get(`/projects/${id}`);
  },

  create(payload: CreateProjectRequest): Promise<ApiResponse<CreateProjectResponseData>> {
    return api.post('/projects', payload);
  },

  update(
    id: string,
    payload: UpdateProjectRequest
  ): Promise<
    ApiResponse<{
      id: string;
      name: string;
      address: string;
      price_per_m2: number;
      total_amount: number;
      warranty_years: number;
      updated_at: string;
    }>
  > {
    return api.put(`/projects/${id}`, payload);
  },

  changeStatus(
    id: string,
    payload: ChangeProjectStatusRequest
  ): Promise<
    ApiResponse<{
      id: string;
      name: string;
      status: ProjectStatus;
      pause_reason: string | null;
      updated_at: string;
    }>
  > {
    return api.patch(`/projects/${id}/status`, payload);
  },

  deleteOrArchive(id: string): Promise<ApiResponse<DeleteProjectResponseData>> {
    return api.delete(`/projects/${id}`);
  },
};
