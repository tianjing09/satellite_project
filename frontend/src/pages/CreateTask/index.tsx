import React from 'react'
import { Typography, Card, Form, Input, Button, Space, message, Alert } from 'antd'
import { ArrowLeftOutlined, RocketOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import taskApi from '../../api/tasks'
import type { CreateTaskRequest } from '../../types'

const { Title, Text } = Typography

interface FormValues {
  name: string
  telescope_id?: string
}

const CreateTask: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (values: FormValues) => {
    setLoading(true)
    setError(null)
    
    try {
      const requestData: CreateTaskRequest = {
        name: values.name,
        telescope_id: values.telescope_id || undefined,
      }
      
      const response = await taskApi.create(requestData)
      
      message.success({
        content: '任务创建成功！即将跳转到任务详情页',
        duration: 2,
      })
      
      // 跳转到任务详情页
      setTimeout(() => {
        navigate(`/tasks/${response.task_id}`)
      }, 500)
      
    } catch (err: any) {
      console.error('创建任务失败:', err)
      setError(err?.response?.data?.message || '创建任务失败，请检查后端服务是否正常运行')
      message.error('创建任务失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Space style={{ marginBottom: 24 }} align="center">
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/tasks')}
        >
          返回列表
        </Button>
        <Title level={3} style={{ margin: 0 }}>创建新任务</Title>
      </Space>

      <Card 
        style={{ maxWidth: 600 }}
        title={
          <Space>
            <RocketOutlined style={{ color: '#1890ff' }} />
            <Text strong>任务配置</Text>
          </Space>
        }
      >
        {error && (
          <Alert
            message="创建失败"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            onClose={() => setError(null)}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          requiredMark={false}
        >
          <Form.Item
            label="任务名称"
            name="name"
            rules={[
              { required: true, message: '请输入任务名称' },
              { max: 100, message: '任务名称不能超过100个字符' },
            ]}
            tooltip="给这个观测任务起一个名字，方便后续识别"
          >
            <Input 
              placeholder="请输入任务名称，如：2026-06-26 观测任务"
              size="large"
              maxLength={100}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="望远镜ID"
            name="telescope_id"
            tooltip="可选，用于标识使用的望远镜设备"
          >
            <Input 
              placeholder="请输入望远镜ID，如：TEL-001"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Space size="middle" style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                onClick={() => navigate('/tasks')}
                size="large"
              >
                取消
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                size="large"
                icon={<RocketOutlined />}
              >
                创建任务
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 提示：创建任务后，您可以上传望远镜拍摄的图片，然后开始提取卫星轨迹。
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default CreateTask