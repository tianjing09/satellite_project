/**
 * 轮询配置
 */
export interface PollingConfig {
  intervals: Array<{
    count: number
    delay: number
  }>
}

/**
 * 默认轮询策略：
 * - 前3次：每秒1次
 * - 接着10次：每2秒1次
 * - 之后：每3秒1次
 */
export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  intervals: [
    { count: 3, delay: 1000 },
    { count: 10, delay: 2000 },
    { count: Infinity, delay: 3000 },
  ],
}

/**
 * 轮询管理器
 */
export class PollingManager {
  private timer: number | null = null  // 修改：使用 number 类型
  private currentIntervalIndex = 0
  private currentCount = 0
  private isRunning = false
  private config: PollingConfig

  constructor(config: PollingConfig = DEFAULT_POLLING_CONFIG) {
    this.config = config
  }

  /**
   * 获取当前轮询间隔
   */
  private getCurrentDelay(): number {
    const interval = this.config.intervals[this.currentIntervalIndex]
    if (!interval) {
      return this.config.intervals[this.config.intervals.length - 1].delay
    }
    return interval.delay
  }

  /**
   * 检查是否需要切换到下一个间隔
   */
  private checkNextInterval(): void {
    const interval = this.config.intervals[this.currentIntervalIndex]
    if (!interval) return

    this.currentCount++
    
    if (this.currentCount >= interval.count && this.currentIntervalIndex < this.config.intervals.length - 1) {
      this.currentIntervalIndex++
      this.currentCount = 0
    }
  }

  /**
   * 开始轮询
   */
  start(callback: () => Promise<void> | void): void {
    if (this.isRunning) {
      console.warn('轮询已在运行中')
      return
    }

    this.isRunning = true
    this.currentIntervalIndex = 0
    this.currentCount = 0

    const poll = async () => {
      if (!this.isRunning) return

      try {
        await callback()
      } catch (error) {
        console.error('轮询执行失败:', error)
      }

      if (!this.isRunning) return

      this.checkNextInterval()
      const delay = this.getCurrentDelay()
      
      this.timer = setTimeout(poll, delay) as unknown as number  // 修改：类型转换
    }

    // 立即执行第一次
    poll()
  }

  /**
   * 停止轮询
   */
  stop(): void {
    this.isRunning = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.currentIntervalIndex = 0
    this.currentCount = 0
  }

  /**
   * 重置轮询（重新开始计数）
   */
  reset(): void {
    this.currentIntervalIndex = 0
    this.currentCount = 0
  }

  /**
   * 获取轮询状态
   */
  getStatus(): { isRunning: boolean; intervalIndex: number; count: number } {
    return {
      isRunning: this.isRunning,
      intervalIndex: this.currentIntervalIndex,
      count: this.currentCount,
    }
  }
}