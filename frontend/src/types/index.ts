// ============ 任务相关 ============
export interface Task {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  step: number  // 0-5
  progress: number  // 0-100
  total_images: number
  success_count: number
  created_at: string
  updated_at: string
  result?: TaskResult | null
  message?: string  // 错误信息
}

export interface TaskResult {
  total_images: number
  success_count: number
  tracks: Track[]
}

export interface Track {
  id: number
  norad_id: number
  name: string
  confidence: number
  points: [number, number][]  // [经度, 纬度]
}

// ============ 图片相关 ============
export interface Image {
  id: string
  file_name: string
  file_url: string
  type: 'raw' | 'filtered' | 'enhanced'
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  parent_id: string | null
  file_size?: number
}

export interface Images {
  raw: Image[]
  filtered: Image[]
  enhanced: Image[]
}

// ============ API 请求/响应 ============
export interface CreateTaskRequest {
  name: string
  telescope_id?: string
}

export interface CreateTaskResponse {
  task_id: string
  name: string
  status: string
  task_dir: string
  total_images: number
  message: string
}

export interface UploadImageRequest {
  file: File
  task_id: string
  user_id: string
}

export interface UploadImageResponse {
  image_id: string
  file_name: string
  file_url: string
  file_size: number
  task_id: string
  message: string
}

export interface ProcessTaskResponse {
  task_id: string
  status: string
  message: string
}

export interface TaskDetailResponse {
  task: Task
  images: Images
}

export interface TaskListResponse {
  total: number
  tasks: Task[]
}

export interface TaskListParams {
  limit?: number
  offset?: number
}

// ============ 图片组（用于前端展示） ============
export interface ImageGroup {
  raw: Image
  filtered: Image | null
  enhanced: Image | null
  viewMode: 'raw' | 'filtered' | 'enhanced' | 'overlay'
  overlayOpacity: number  // 0-1
}

// ============ 轮询配置 ============
export interface PollingConfig {
  intervals: Array<{
    count: number
    delay: number
  }>
}

// ============ 状态枚举 ============
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type ImageType = 'raw' | 'filtered' | 'enhanced'
export type ImageStatus = 'uploaded' | 'processing' | 'completed' | 'failed'
export type ViewMode = 'raw' | 'filtered' | 'enhanced' | 'overlay'