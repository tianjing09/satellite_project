import apiClient from './client'
import type {
  Task,
  TaskListResponse,
  TaskDetailResponse,
  CreateTaskRequest,
  CreateTaskResponse,
  ProcessTaskResponse,
  TaskListParams,
} from '../types'

/**
 * 任务 API
 */
export const taskApi = {
  /**
   * 获取任务列表
   */
  list: async (params?: TaskListParams): Promise<TaskListResponse> => {
    const response = await apiClient.get<TaskListResponse>('/tasks', { params })
    return response.data
  },

  /**
   * 获取任务详情
   */
  detail: async (taskId: string): Promise<TaskDetailResponse> => {
    const response = await apiClient.get<TaskDetailResponse>(`/tasks/${taskId}`)
    return response.data
  },

  /**
   * 创建任务
   */
  create: async (data: CreateTaskRequest): Promise<CreateTaskResponse> => {
    const response = await apiClient.post<CreateTaskResponse>('/tasks', data)
    return response.data
  },

  /**
   * 开始处理任务
   */
  process: async (taskId: string): Promise<ProcessTaskResponse> => {
    const response = await apiClient.post<ProcessTaskResponse>(`/tasks/${taskId}/process`)
    return response.data
  },

  /**
   * 删除任务
   */
  delete: async (taskId: string): Promise<void> => {
    await apiClient.delete(`/tasks/${taskId}`)
  },
}

export default taskApi