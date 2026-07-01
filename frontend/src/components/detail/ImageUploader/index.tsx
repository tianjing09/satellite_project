import React, { useState } from 'react'
import { Upload, Button, message, Modal, Progress, Space, Typography, List, Tag } from 'antd'
import { 
  UploadOutlined, 
  InboxOutlined, 
  FileImageOutlined,
  DeleteOutlined,
  FileOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import imageApi from '../../../api/images'

const { Dragger } = Upload
const { Text } = Typography

interface ImageUploaderProps {
  taskId: string
  onUploadSuccess: () => void
}

interface FileItem {
  uid: string
  name: string
  size: number
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ taskId, onUploadSuccess }) => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [fileItems, setFileItems] = useState<FileItem[]>([])
  const [uploading, setUploading] = useState(false)

  // 处理上传
  const handleUpload = async () => {
    if (fileItems.length === 0) {
      message.warning('请先选择图片文件')
      return
    }

    setUploading(true)
    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    for (const item of fileItems) {
      if (item.status === 'success') continue
      
      try {
        // 更新状态为上传中
        setFileItems(prev => prev.map(f => 
          f.uid === item.uid ? { ...f, status: 'uploading', progress: 0 } : f
        ))
        
        // 模拟上传进度（实际 API 不支持进度回调）
        const progressInterval = setInterval(() => {
          setFileItems(prev => prev.map(f => {
            if (f.uid === item.uid && f.progress < 90) {
              return { ...f, progress: f.progress + 10 }
            }
            return f
          }))
        }, 200)

        const result = await imageApi.upload({
          file: item.file,
          task_id: taskId,
          user_id: '1',
        })
        
        clearInterval(progressInterval)
        
        // 更新状态为成功
        setFileItems(prev => prev.map(f => 
          f.uid === item.uid ? { ...f, status: 'success', progress: 100 } : f
        ))
        
        console.log('上传成功:', result)
        successCount++
        
      } catch (error: any) {
        const errorMsg = error?.response?.data?.message || error?.message || '上传失败'
        errors.push(`${item.name}: ${errorMsg}`)
        
        setFileItems(prev => prev.map(f => 
          f.uid === item.uid ? { ...f, status: 'error', progress: 0 } : f
        ))
        
        failCount++
        console.error('上传失败:', error)
      }
    }

    setUploading(false)
    
    if (successCount > 0) {
      message.success(`成功上传 ${successCount} 张图片${failCount > 0 ? `，${failCount} 张失败` : ''}`)
      if (failCount === 0) {
        // 全部成功，关闭弹窗
        setTimeout(() => {
          setIsModalVisible(false)
          setFileItems([])
          onUploadSuccess()
        }, 1000)
      }
    } else {
      message.error('所有图片上传失败')
      if (errors.length > 0) {
        Modal.error({
          title: '上传失败详情',
          content: (
            <div>
              {errors.map((msg, idx) => (
                <div key={idx} style={{ color: '#ff4d4f', marginBottom: 4 }}>• {msg}</div>
              ))}
            </div>
          ),
          width: 500,
        })
      }
    }
  }

  // 添加文件
  const handleBeforeUpload = (file: File) => {
    // 检查文件类型
    const isValidType = /\.(jpg|jpeg|png|tiff|fits)$/i.test(file.name)
    if (!isValidType) {
      message.error(`${file.name} 不是支持的图片格式`)
      return false
    }
    
    // 检查文件大小 (50MB)
    const isLt50M = file.size / 1024 / 1024 < 50
    if (!isLt50M) {
      message.error(`${file.name} 超过 50MB 限制`)
      return false
    }

    // 检查是否已存在
    if (fileItems.some(item => item.name === file.name)) {
      message.warning(`${file.name} 已在列表中`)
      return false
    }

    // 添加到列表
    const newItem: FileItem = {
      uid: `${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      file: file,
      progress: 0,
      status: 'pending',
    }
    
    setFileItems(prev => [...prev, newItem])
    
    return false // 阻止自动上传
  }

  // 移除文件
  const handleRemove = (uid: string) => {
    if (uploading) {
      message.warning('上传中无法移除文件')
      return
    }
    setFileItems(prev => prev.filter(item => item.uid !== uid))
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 获取状态显示
  const getStatusDisplay = (item: FileItem) => {
    switch (item.status) {
      case 'pending':
        return <Tag color="default">待上传</Tag>
      case 'uploading':
        return <Tag color="processing">上传中 {item.progress}%</Tag>
      case 'success':
        return <Tag color="success">✅ 完成</Tag>
      case 'error':
        return <Tag color="error">❌ 失败</Tag>
      default:
        return null
    }
  }

  return (
    <>
      <Button 
        type="primary"
        icon={<UploadOutlined />}
        onClick={() => setIsModalVisible(true)}
      >
        上传图片
      </Button>

      <Modal
        title={
          <Space>
            <FileImageOutlined />
            <span>上传图片</span>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
              支持 JPG, PNG, TIFF, FITS 格式
            </Text>
          </Space>
        }
        open={isModalVisible}
        onCancel={() => {
          if (!uploading) {
            setIsModalVisible(false)
            setFileItems([])
          }
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              if (!uploading) {
                setIsModalVisible(false)
                setFileItems([])
              }
            }}
            disabled={uploading}
          >
            取消
          </Button>,
          <Button 
            key="upload" 
            type="primary" 
            onClick={handleUpload}
            loading={uploading}
            disabled={fileItems.length === 0 || uploading}
          >
            {uploading ? '上传中...' : `上传 (${fileItems.filter(f => f.status !== 'success').length}/${fileItems.length})`}
          </Button>,
        ]}
        width={600}
      >
        <Dragger
          name="file"
          multiple={true}
          accept=".jpg,.jpeg,.png,.tiff,.fits"
          beforeUpload={handleBeforeUpload}
          showUploadList={false}
          style={{ marginBottom: 16 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽图片到此区域上传</p>
          <p className="ant-upload-hint">
            支持批量上传，单张图片不超过 50MB
          </p>
        </Dragger>

        {/* 文件列表 */}
        {fileItems.length > 0 && (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              已选择 {fileItems.length} 个文件
            </Text>
            {fileItems.map(item => (
              <div 
                key={item.uid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  marginBottom: 4,
                  background: '#fafafa',
                  borderRadius: 4,
                  border: '1px solid #f0f0f0',
                }}
              >
                <FileOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text ellipsis style={{ maxWidth: 180 }}>
                      {item.name}
                    </Text>
                    <Space size="small">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatFileSize(item.size)}
                      </Text>
                      {getStatusDisplay(item)}
                      {!uploading && item.status === 'pending' && (
                        <Button 
                          type="text" 
                          icon={<DeleteOutlined />} 
                          onClick={() => handleRemove(item.uid)}
                          size="small"
                          danger
                        />
                      )}
                    </Space>
                  </div>
                  {item.status === 'uploading' && (
                    <Progress 
                      percent={item.progress} 
                      size="small" 
                      status="active"
                      style={{ marginTop: 4 }}
                    />
                  )}
                  {item.status === 'error' && (
                    <Text type="danger" style={{ fontSize: 12 }}>上传失败，请重试</Text>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}

export default ImageUploader