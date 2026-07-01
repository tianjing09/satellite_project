import React from 'react'
import { Card, Steps, Space, Typography, Progress, Tag } from 'antd'
import { 
  CheckCircleOutlined, 
  LoadingOutlined, 
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import type { Task } from '../../../types'
import { getStepText } from '../../../utils/formatters'

const { Text } = Typography

interface ProgressSectionProps {
  task: Task
}

// 在组件顶部添加样式
const styles = {
  processingStep: {
    animation: 'pulse 1.5s ease-in-out infinite',
  },
}

const ProgressSection: React.FC<ProgressSectionProps> = ({ task }) => {
  // 如果任务不是处理中或已完成，不显示进度
  if (task.status === 'pending') {
    return null
  }

  // 步骤配置
  const steps = [
    { 
      title: '去除恒星背景', 
      description: 'Step 1',
      step: 1,
    },
    { 
      title: '提取候选移动光点', 
      description: 'Step 2',
      step: 2,
    },
    { 
      title: '跨图片轨迹关联', 
      description: 'Step 3',
      step: 3,
    },
    { 
      title: '过滤误检与噪声', 
      description: 'Step 4',
      step: 4,
    },
    { 
      title: '生成卫星轨迹', 
      description: 'Step 5',
      step: 5,
    },
  ]

  // 获取步骤状态
  const getStepStatus = (stepNumber: number) => {
    if (task.status === 'completed') {
      return 'finish'
    }
    if (task.status === 'failed') {
      // 如果失败，当前步骤为 error，之前的为 finish，之后的为 wait
      if (stepNumber < task.step) return 'finish'
      if (stepNumber === task.step) return 'error'
      return 'wait'
    }
    // processing 状态
    if (stepNumber < task.step) return 'finish'
    if (stepNumber === task.step) return 'process'
    return 'wait'
  }

  // 获取步骤图标
  const getStepIcon = (stepNumber: number) => {
    const status = getStepStatus(stepNumber)
    switch (status) {
      case 'finish':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'process':
        return <LoadingOutlined style={{ color: '#1890ff' }} />
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />
    }
  }

  // 获取步骤描述
  const getStepDescription = (stepNumber: number) => {
    const status = getStepStatus(stepNumber)
    const statusMap = {
      finish: '✅ 已完成',
      process: '⏳ 处理中...',
      error: '❌ 失败',
      wait: '⏰ 等待中',
    }
    return statusMap[status] || '等待中'
  }

  // 计算完成进度
  const getCompletedSteps = () => {
    if (task.status === 'completed') return 5
    if (task.status === 'failed') return task.step - 1
    return task.step - 1
  }

  const completedSteps = getCompletedSteps()
  const totalSteps = 5

  return (
    <Card 
      title="📊 处理进度" 
      style={{ marginBottom: 24 }}
      extra={
        <Space>
          <Tag color={task.status === 'completed' ? 'success' : 'processing'}>
            {task.status === 'completed' ? '已完成' : `${task.progress}%`}
          </Tag>
        </Space>
      }
    >
      {/* 总体进度条 */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type="secondary">
            {task.status === 'completed' 
              ? '所有步骤已完成' 
              : task.status === 'failed'
              ? `处理失败 (步骤 ${task.step}/5)`
              : `正在处理步骤 ${task.step}/5`
            }
          </Text>
          <Text strong>
            {task.status === 'completed' ? '100%' : `${task.progress}%`}
          </Text>
        </Space>
        <Progress 
          percent={task.status === 'completed' ? 100 : task.progress}
          status={
            task.status === 'completed' ? 'success' : 
            task.status === 'failed' ? 'exception' : 'active'
          }
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
      </div>

      {/* 步骤列表 */}
      <div style={{ marginTop: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 16 }}>
          步骤详情
        </Text>
        <Steps
          direction="vertical"
          current={task.step - 1}
          status={
            task.status === 'completed' ? 'finish' : 
            task.status === 'failed' ? 'error' : 'process'
          }
          items={steps.map((step, index) => ({
            title: (
              <Space>
                <span>{step.title}</span>
                {task.status === 'processing' && task.step === step.step && (
                  <Tag color="processing" style={{ marginLeft: 8 }}>
                    进行中
                  </Tag>
                )}
                {task.status === 'completed' && (
                  <Tag color="success" style={{ marginLeft: 8 }}>
                    已完成
                  </Tag>
                )}
                {task.status === 'failed' && task.step === step.step && (
                  <Tag color="error" style={{ marginLeft: 8 }}>
                    失败
                  </Tag>
                )}
              </Space>
            ),
            description: (
              <Space direction="vertical" size="small">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {getStepDescription(step.step)}
                </Text>
                {task.status === 'processing' && task.step === step.step && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ⏱️ 预计还需要一些时间...
                  </Text>
                )}
                {task.status === 'completed' && step.step === 5 && (
                  <Text type="success" style={{ fontSize: 12 }}>
                    🎉 所有步骤已完成！
                  </Text>
                )}
              </Space>
            ),
            icon: getStepIcon(step.step),
            status: getStepStatus(step.step),
          }))}
        />
      </div>

      {/* 处理时间统计（可选） */}
      {task.status === 'completed' && task.updated_at && (
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          background: '#f6ffed', 
          borderRadius: 4,
          border: '1px solid #b7eb8f'
        }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ✅ 任务处理完成于 {task.updated_at}
          </Text>
        </div>
      )}

      {task.status === 'failed' && task.message && (
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          background: '#fff2f0', 
          borderRadius: 4,
          border: '1px solid #ffccc7'
        }}>
          <Text type="danger" style={{ fontSize: 12 }}>
            ❌ 错误详情：{task.message}
          </Text>
        </div>
      )}
    </Card>
  )
}

export default ProgressSection