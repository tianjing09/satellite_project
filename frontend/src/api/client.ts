import axios, { 
  type AxiosInstance, 
  type AxiosRequestConfig, 
  type AxiosResponse,
  type AxiosError 
} from 'axios'
import { message } from 'antd'

// 定义响应数据结构
export interface ApiResponse<T = any> {
  data: T
  message?: string
  status?: number
}

// 创建 Axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',  // 使用 Vite 代理，实际请求会转发到 http://localhost:8000
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    
    // 打印请求信息（开发环境）
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params)
    }
    
    return config
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 打印响应信息（开发环境）
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.url}`, response.data)
    }
    
    // 如果后端返回的数据结构有统一格式，可以在这里处理
    // 例如：如果后端返回 { code: 0, data: {...}, message: 'success' }
    // 可以在这里统一处理
    return response
  },
  (error: AxiosError) => {
    // 统一错误处理
    console.error('[API Response Error]', error)
    
    if (error.response) {
      // 服务器返回了错误状态码
      const { status, data } = error.response as any
      
      // 根据状态码显示不同的错误消息
      switch (status) {
        case 400:
          message.error(data?.message || '请求参数错误')
          break
        case 404:
          message.error(data?.message || '资源不存在')
          break
        case 500:
          message.error(data?.message || '服务器内部错误')
          break
        default:
          message.error(data?.message || `请求失败 (${status})`)
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      message.error('网络连接失败，请检查服务器是否正常运行')
    } else {
      // 请求配置出错
      message.error('请求配置错误：' + error.message)
    }
    
    return Promise.reject(error)
  }
)

export default apiClient