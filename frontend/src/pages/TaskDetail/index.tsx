import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Spin, Empty, message, Modal, Tag } from 'antd'
import { useTaskPolling } from '../../hooks/useTaskPolling'
import TaskHeader from '../../components/detail/TaskHeader'
import ProgressSection from '../../components/detail/ProgressSection'
import ImageUploader from '../../components/detail/ImageUploader'
import ImageGallery from '../../components/detail/ImageGallery'
import ResultSection from '../../components/detail/ResultSection'
import taskApi from '../../api/tasks'

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(false)
  
  const {
    task,
    images,
    loading,
    isPolling,
    error,
    refresh,
    startPolling,
    stopPolling,
  } = useTaskPolling(taskId || '')

  // 上传成功后刷新
  const handleUploadSuccess = () => {
    refresh()
    message.success('图片上传成功，任务已更新')
  }

  // 开始处理
  const handleProcess = async () => {
    if (!taskId) return
    
    Modal.confirm({
      title: '确认开始提取',
      content: '确定要开始处理这个任务吗？处理过程中将无法上传图片。',
      okText: '确定开始',
      cancelText: '取消',
      onOk: async () => {
        setProcessing(true)
        try {
          const response = await taskApi.process(taskId)
          message.success(response.message || '任务已提交处理')
          await refresh()
          startPolling()
        } catch (err: any) {
          message.error(err?.response?.data?.message || '开始处理失败，请重试')
        } finally {
          setProcessing(false)
        }
      },
    })
  }

  // 刷新任务
  const handleRefresh = () => {
    refresh()
    if (task?.status === 'processing' && !isPolling) {
      startPolling()
    }
  }

  // 加载状态
  if (loading && !task) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" tip="加载任务详情中..." />
      </div>
    )
  }

  // 错误状态
  if (error || !task) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Empty
          description={error || '任务不存在'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <button 
            className="ant-btn ant-btn-primary" 
            onClick={() => navigate('/tasks')}
          >
            返回任务列表
          </button>
        </Empty>
      </div>
    )
  }

  return (
    <div>
      {/* 任务头部 */}
      <TaskHeader
        task={task}
        onRefresh={handleRefresh}
        onUpload={handleUploadSuccess}
        onProcess={handleProcess}
        processing={processing}
        uploadComponent={
          <ImageUploader 
            taskId={taskId || ''} 
            onUploadSuccess={handleUploadSuccess} 
          />
        }
      />

      {/* 轮询状态提示 */}
      {isPolling && (
        <div style={{ 
          marginBottom: 16, 
          padding: '8px 16px', 
          background: '#e6f7ff', 
          borderRadius: 4,
          border: '1px solid #91d5ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>
            <Spin size="small" style={{ marginRight: 8 }} />
            正在自动刷新任务状态...
          </span>
          <button 
            className="ant-btn ant-btn-link" 
            style={{ padding: 0 }}
            onClick={stopPolling}
          >
            停止刷新
          </button>
        </div>
      )}

      {/* 进度展示 */}
      <ProgressSection task={task} />

      {/* 图片画廊 */}
      <ImageGallery images={images} loading={loading} />

      {/* 结果展示 */}
      <ResultSection task={task} />
    </div>
  )
}

export default TaskDetail