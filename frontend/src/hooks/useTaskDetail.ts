import { useState, useEffect } from 'react'
import { message } from 'antd'
import taskApi from '../api/tasks'
import type { Task, Images } from '../types'

interface UseTaskDetailReturn {
  task: Task | null
  images: Images
  loading: boolean
  error: string | null
  fetchTaskDetail: () => Promise<void>
}

export const useTaskDetail = (taskId: string): UseTaskDetailReturn => {
  const [task, setTask] = useState<Task | null>(null)
  const [images, setImages] = useState<Images>({ raw: [], filtered: [], enhanced: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTaskDetail = async () => {
    if (!taskId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await taskApi.detail(taskId)
      setTask(response.task)
      setImages(response.images)
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || '获取任务详情失败'
      setError(errorMsg)
      message.error(errorMsg)
      console.error('获取任务详情失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail()
    }
  }, [taskId])

  return {
    task,
    images,
    loading,
    error,
    fetchTaskDetail,
  }
}