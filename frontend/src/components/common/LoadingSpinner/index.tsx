import React from 'react'
import { Spin, Space } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

interface LoadingSpinnerProps {
  tip?: string
  size?: 'small' | 'default' | 'large'
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  tip = '加载中...', 
  size = 'default' 
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />

  return (
    <Space direction="vertical" align="center" style={{ width: '100%', padding: '40px 0' }}>
      <Spin indicator={antIcon} size={size} tip={tip} />
    </Space>
  )
}

export default LoadingSpinner