import React from 'react'
import { Card, Tag, Space, Typography, Progress, Button, Dropdown, message, Modal } from 'antd'
import { 
  DeleteOutlined, 
  MoreOutlined, 
  EyeOutlined,
  ClockCircleOutlined,
  FileImageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { Task } from '../../../types'
import { formatTime, getStatusColor, getStatusText, getStepText } from '../../../utils/formatters'
import { useTaskStore } from '../../../store/taskStore'

const { Text, Title } = Typography

interface TaskCardProps {
  task: Task
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const navigate = useNavigate()
  const deleteTask = useTaskStore((state) => state.deleteTask)
  const [deleting, setDeleting] = React.useState(false)

  // 获取状态标签
  const getStatusTag = () => {
    const color = getStatusColor(task.status)
    const text = getStatusText(task.status)
    const icon = task.status === 'completed' ? <CheckCircleOutlined /> :
                 task.status === 'processing' ? <LoadingOutlined /> :
                 task.status === 'failed' ? <CloseCircleOutlined /> :
                 <ClockCircleOutlined />
    
    return <Tag icon={icon} color={color}>{text}</Tag>
  }

  // 获取进度显示
  const getProgressDisplay = () => {
    if (task.status === 'pending') {
      return <Text type="secondary">等待上传图片</Text>
    }
    if (task.status === 'processing') {
      return (
        <div>
          <Progress percent={task.progress} size="small" />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getStepText(task.step)}
          </Text>
        </div>
      )
    }
    if (task.status === 'completed') {
      return (
        <div>
          <Progress percent={100} size="small" status="success" />
          <Text type="secondary" style={{ fontSize: 12 }}>
            识别到 {task.result?.tracks?.length || 0} 个目标
          </Text>
        </div>
      )
    }
    if (task.status === 'failed') {
      return (
        <div>
          <Progress percent={task.progress} size="small" status="exception" />
          <Text type="danger" style={{ fontSize: 12 }}>
            {task.message || '处理失败'}
          </Text>
        </div>
      )
    }
    return null
  }

  // 删除任务
  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除任务 "${task.name}" 吗？此操作不可恢复。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true)
        try {
          await deleteTask(task.id)
          message.success('任务删除成功')
        } catch (error) {
          message.error('删除失败，请重试')
        } finally {
          setDeleting(false)
        }
      },
    })
  }

  // 下拉菜单项
  const menuItems = [
    {
      key: 'view',
      label: '查看详情',
      icon: <EyeOutlined />,
      onClick: () => navigate(`/tasks/${task.id}`),
    },
    {
      key: 'delete',
      label: '删除任务',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDelete,
    },
  ]

  return (
    <Card
      hoverable
      style={{ marginBottom: 16 }}
      actions={[
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => navigate(`/tasks/${task.id}`)}
        >
          查看详情
        </Button>,
        <Dropdown menu={{ items: menuItems }} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined />} loading={deleting} />
        </Dropdown>,
      ]}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space size="middle" align="center">
              <Title level={5} style={{ margin: 0 }}>
                {task.name}
              </Title>
              {getStatusTag()}
            </Space>
            
            <Space size="large">
              <Space>
                <FileImageOutlined />
                <Text type="secondary">{task.total_images} 张图片</Text>
              </Space>
              <Text type="secondary">
                创建于 {formatTime(task.created_at)}
              </Text>
              {task.success_count > 0 && (
                <Tag color="green">成功识别 {task.success_count} 个目标</Tag>
              )}
            </Space>
          </Space>
        </div>

        <div style={{ minWidth: 200, marginLeft: 24 }}>
          {getProgressDisplay()}
        </div>
      </div>
    </Card>
  )
}

export default TaskCard