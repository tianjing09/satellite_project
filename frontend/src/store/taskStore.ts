import { create } from 'zustand'
import type { Task, TaskListParams } from '../types'
import taskApi from '../api/tasks'

interface TaskState {
  tasks: Task[]
  total: number
  loading: boolean
  currentPage: number
  pageSize: number
  searchKeyword: string
  
  // Actions
  setTasks: (tasks: Task[], total: number) => void
  setLoading: (loading: boolean) => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  setSearchKeyword: (keyword: string) => void
  fetchTasks: (params?: TaskListParams) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  total: 0,
  loading: false,
  currentPage: 1,
  pageSize: 10,
  searchKeyword: '',

  setTasks: (tasks, total) => set({ tasks, total }),
  setLoading: (loading) => set({ loading }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  fetchTasks: async (params) => {
    const state = get()
    set({ loading: true })
    
    try {
      const response = await taskApi.list({
        limit: params?.limit || state.pageSize,
        offset: params?.offset || (state.currentPage - 1) * state.pageSize,
        ...params,
      })
      
      set({ 
        tasks: response.tasks, 
        total: response.total,
        loading: false 
      })
    } catch (error) {
      console.error('获取任务列表失败:', error)
      set({ loading: false, tasks: [], total: 0 })
    }
  },

  deleteTask: async (taskId) => {
    try {
      await taskApi.delete(taskId)
      // 删除成功后重新获取列表
      await get().fetchTasks()
    } catch (error) {
      console.error('删除任务失败:', error)
      throw error
    }
  },
}))