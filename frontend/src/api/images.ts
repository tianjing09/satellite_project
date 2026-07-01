import apiClient from './client'
import type { UploadImageResponse, UploadImageRequest } from '../types'

/**
 * 图片 API
 */
export const imageApi = {
  /**
   * 上传图片
   */
  upload: async (data: UploadImageRequest): Promise<UploadImageResponse> => {
    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('task_id', data.task_id)
    formData.append('user_id', data.user_id)

    const response = await apiClient.post<UploadImageResponse>('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * 获取图片URL（直接访问）
   */
  getImageUrl: (taskId: string, type: 'raw' | 'filtered' | 'enhanced', filename: string): string => {
    // 使用 Vite 代理，直接访问 /uploads 路径
    return `/uploads/tasks/${taskId}/${type}/${filename}`
  },
}

export default imageApi