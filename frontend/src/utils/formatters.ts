import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

// 扩展 dayjs 插件
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/**
 * 格式化时间
 */
export const formatTime = (date: string | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '-'
  return dayjs(date).format(format)
}

/**
 * 相对时间（如：3分钟前）
 */
export const formatRelativeTime = (date: string | Date) => {
  if (!date) return '-'
  return dayjs(date).fromNow()
}

/**
 * 获取状态对应的颜色
 */
export const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    pending: 'default',
    processing: 'warning',
    completed: 'success',
    failed: 'error',
  }
  return colorMap[status] || 'default'
}

/**
 * 获取状态对应的文本
 */
export const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待上传',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  }
  return textMap[status] || status
}

/**
 * 获取步骤对应的文本
 */
export const getStepText = (step: number) => {
  const stepMap: Record<number, string> = {
    0: '⏳ 等待开始',
    1: '🌟 步骤1: 去除恒星背景',
    2: '🔍 步骤2: 提取候选移动光点',
    3: '🔗 步骤3: 跨图片轨迹关联',
    4: '🧹 步骤4: 过滤误检与噪声',
    5: '📊 步骤5: 生成卫星轨迹',
  }
  return stepMap[step] || '未知步骤'
}

/**
 * 获取步骤对应的图标
 */
export const getStepIcon = (step: number, currentStep: number) => {
  if (step < currentStep) return '✅'
  if (step === currentStep) return '🔄'
  return '⏳'
}

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 截断文本
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}