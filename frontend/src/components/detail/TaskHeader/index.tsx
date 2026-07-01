import React from 'react'
import { 
  Space, 
  Tag, 
  Typography, 
  Button, 
  Progress, 
  Tooltip, 
  Statistic,
  Row,
  Col,
  Card
} from 'antd'
import { 
  ArrowLeftOutlined,
  UploadOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  FileImageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { Task } from '../../../types'
import { 
  getStatusColor, 
  getStatusText, 
  getStepText,
  formatTime 
} from '../../../utils/formatters'

const { Title, Text } = Typography

interface TaskHeaderProps {
  task: Task
  onRefresh: () => void
  onUpload: () => void
  onProcess: () => void
  processing: boolean
  uploadComponent?: React.ReactNode  // 新增可选属性
}

const TaskHeader: React.FC<TaskHeaderProps> = ({
  task,
  onRefresh,
  onUpload,
  onProcess,
  processing,
  uploadComponent,  // 接收 uploadComponent
}) => {
  const navigate = useNavigate()

  // 获取状态图标
  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
      case 'processing':
        return <LoadingOutlined style={{ color: '#faad14', fontSize: 20 }} />
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9', fontSize: 20 }} />
    }
  }

  // 判断按钮状态
  const canUpload = task.status === 'pending' || task.status === 'processing'
  const canProcess = task.status === 'pending' && task.total_images > 0
  const isProcessing = task.status === 'processing'
  const isCompleted = task.status === 'completed'
  const isFailed = task.status === 'failed'

  // 获取进度状态
  const getProgressStatus = () => {
    if (task.status === 'completed') return 'success'
    if (task.status === 'failed') return 'exception'
    return 'active'
  }

  return (
    <Card style={{ marginBottom: 24 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 返回按钮和标题 */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Space align="center" size="middle">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/tasks')}
            >
              返回列表
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {task.name}
            </Title>
            <Tag 
              icon={getStatusIcon()} 
              color={getStatusColor(task.status)}
              style={{ fontSize: 14, padding: '4px 12px' }}
            >
              {getStatusText(task.status)}
            </Tag>
            {isProcessing && (
              <Tag color="blue">步骤 {task.step}/5</Tag>
            )}
          </Space>
          
          <Space wrap>
            <Tooltip title="刷新任务状态">
              <Button 
                icon={<ReloadOutlined />} 
                onClick={onRefresh}
                loading={processing}
              >
                刷新
              </Button>
            </Tooltip>
            
            {canUpload && (
              <>
                {uploadComponent || (
                  <Button 
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={onUpload}
                    disabled={isProcessing}
                  >
                    上传图片
                  </Button>
                )}
              </>
            )}
            
            {canProcess && (
              <Button 
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={onProcess}
                loading={processing}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                开始提取
              </Button>
            )}
            
            {isFailed && (
              <Button 
                type="primary"
                icon={<ReloadOutlined />}
                onClick={onProcess}
                loading={processing}
              >
                重新处理
              </Button>
            )}
          </Space>
        </Space>

        {/* 任务统计信息 */}
        <Row gutter={[24, 16]} style={{ marginTop: 8 }}>
          <Col xs={12} sm={6}>
            <Statistic 
              title="任务ID" 
              value={task.id.substring(0, 8) + '...'}
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="图片数量" 
              value={task.total_images}
              prefix={<FileImageOutlined />}
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="成功识别" 
              value={task.success_count || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic 
              title="创建时间" 
              value={formatTime(task.created_at)}
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
        </Row>

        {/* 进度条 */}
        {(isProcessing || isCompleted || isFailed) && (
          <div style={{ marginTop: 8 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary">{getStepText(task.step)}</Text>
              <Text type="secondary">{task.progress}%</Text>
            </Space>
            <Progress 
              percent={task.progress} 
              status={getProgressStatus()}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
        )}

        {/* 错误信息 */}
        {isFailed && task.message && (
          <div style={{ 
            padding: 12, 
            background: '#fff2f0', 
            border: '1px solid #ffccc7',
            borderRadius: 4 
          }}>
            <Text type="danger">
              <CloseCircleOutlined /> 错误信息：{task.message}
            </Text>
          </div>
        )}
      </Space>
    </Card>
  )
}

export default TaskHeader