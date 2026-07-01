import { useState, useEffect, useRef, useCallback } from 'react'
import { message } from 'antd'
import { PollingManager, DEFAULT_POLLING_CONFIG } from '../utils/polling'
import taskApi from '../api/tasks'
import type { Task, Images } from '../types'

interface UseTaskPollingReturn {
  task: Task | null
  images: Images
  loading: boolean
  isPolling: boolean
  error: string | null
  startPolling: () => void
  stopPolling: () => void
  refresh: () => Promise<void>
}

export const useTaskPolling = (taskId: string): UseTaskPollingReturn => {
  const [task, setTask] = useState<Task | null>(null)
  const [images, setImages] = useState<Images>({ raw: [], filtered: [], enhanced: [] })
  const [loading, setLoading] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const pollingManagerRef = useRef<PollingManager | null>(null)
  const isMountedRef = useRef(true)

  // 获取任务详情
  const fetchTaskDetail = useCallback(async () => {
    if (!taskId || !isMountedRef.current) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await taskApi.detail(taskId)
      
      if (!isMountedRef.current) return
      
      setTask(response.task)
      setImages(response.images)
      
      // 检查任务是否完成或失败
      if (response.task.status === 'completed') {
        message.success('🎉 任务处理完成！')
        stopPolling()
      } else if (response.task.status === 'failed') {
        message.error(`❌ 任务处理失败：${response.task.message || '未知错误'}`)
        stopPolling()
      }
      
    } catch (err: any) {
      if (!isMountedRef.current) return
      const errorMsg = err?.response?.data?.message || '获取任务详情失败'
      setError(errorMsg)
      console.error('获取任务详情失败:', err)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [taskId])

  // 开始轮询
  const startPolling = useCallback(() => {
    if (pollingManagerRef.current?.getStatus().isRunning) {
      console.log('轮询已在运行中')
      return
    }

    if (!taskId) {
      console.warn('缺少 taskId，无法开始轮询')
      return
    }

    // 停止旧的轮询
    if (pollingManagerRef.current) {
      pollingManagerRef.current.stop()
    }

    // 创建新的轮询管理器
    pollingManagerRef.current = new PollingManager(DEFAULT_POLLING_CONFIG)
    
    setIsPolling(true)
    
    pollingManagerRef.current.start(async () => {
      if (!isMountedRef.current) return
      await fetchTaskDetail()
    })
  }, [taskId, fetchTaskDetail])

  // 停止轮询
  const stopPolling = useCallback(() => {
    if (pollingManagerRef.current) {
      pollingManagerRef.current.stop()
    }
    setIsPolling(false)
  }, [])

  // 刷新（手动）
  const refresh = useCallback(async () => {
    // 重置轮询计数
    if (pollingManagerRef.current) {
      pollingManagerRef.current.reset()
    }
    await fetchTaskDetail()
  }, [fetchTaskDetail])

  // 初始化
  useEffect(() => {
    isMountedRef.current = true
    
    // 先获取一次数据
    fetchTaskDetail().then(() => {
      // 如果任务正在处理中，自动开始轮询
      if (task?.status === 'processing') {
        startPolling()
      }
    })

    return () => {
      isMountedRef.current = false
      stopPolling()
    }
  }, [taskId])

  // 监听任务状态变化，自动开始/停止轮询
  useEffect(() => {
    if (task?.status === 'processing' && !isPolling) {
      startPolling()
    }
    if ((task?.status === 'completed' || task?.status === 'failed') && isPolling) {
      stopPolling()
    }
  }, [task, isPolling, startPolling, stopPolling])

  return {
    task,
    images,
    loading,
    isPolling,
    error,
    startPolling,
    stopPolling,
    refresh,
  }
}