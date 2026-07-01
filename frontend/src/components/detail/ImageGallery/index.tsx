import React, { useState } from 'react'
import { Card, Tabs, Empty, Row, Col, Image, Space, Tag, Tooltip, Slider, Button, Badge, Typography } from 'antd'
import { 
  FileImageOutlined,
  FilterOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import type { Images, ImageGroup, ViewMode } from '../../../types'

const { Text } = Typography

interface ImageGalleryProps {
  images: Images
  loading?: boolean
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, loading = false }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('raw')
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)

  // 将图片分组（按原图ID）
  const groupImages = (): ImageGroup[] => {
    const groups: ImageGroup[] = []
    
    images.raw.forEach(raw => {
      const filtered = images.filtered.find(f => f.parent_id === raw.id) || null
      const enhanced = images.enhanced.find(e => e.parent_id === raw.id) || null
      
      groups.push({
        raw,
        filtered,
        enhanced,
        viewMode: 'raw',
        overlayOpacity: 0.5,
      })
    })
    
    return groups
  }

  const imageGroups = groupImages()

  // 渲染单个图片
  const renderImage = (group: ImageGroup, mode: ViewMode) => {
    const { raw, filtered, enhanced } = group
    
    switch (mode) {
      case 'raw':
        return (
          <Image
            src={raw.file_url}
            alt={raw.file_name}
            style={{ width: '100%', height: 200, objectFit: 'cover' }}
            preview={{
              src: raw.file_url,
            }}
          />
        )
      case 'filtered':
        if (!filtered) {
          return <Empty description="去恒星图未生成" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        }
        return (
          <Image
            src={filtered.file_url}
            alt={filtered.file_name}
            style={{ width: '100%', height: 200, objectFit: 'cover' }}
            preview={{
              src: filtered.file_url,
            }}
          />
        )
      case 'enhanced':
        if (!enhanced) {
          return <Empty description="增强图未生成" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        }
        return (
          <Image
            src={enhanced.file_url}
            alt={enhanced.file_name}
            style={{ width: '100%', height: 200, objectFit: 'cover' }}
            preview={{
              src: enhanced.file_url,
            }}
          />
        )
      case 'overlay':
        if (!filtered) {
          return <Empty description="需要去恒星图才能叠加" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        }
        return (
          <div style={{ position: 'relative', width: '100%', height: 200, overflow: 'hidden' }}>
            {/* 原图（底层） */}
            <img
              src={raw.file_url}
              alt="原始图片"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {/* 去恒星图（上层，带透明度） */}
            <img
              src={filtered.file_url}
              alt="去恒星叠加"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: overlayOpacity,
                pointerEvents: 'none',
              }}
            />
            {/* 叠加标签 */}
            <div style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
            }}>
              透明度: {Math.round(overlayOpacity * 100)}%
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // 获取图片状态标签
  const getStatusTag = (group: ImageGroup, mode: ViewMode) => {
    if (mode === 'raw') {
      return <Tag color="blue">原图</Tag>
    }
    if (mode === 'filtered') {
      return group.filtered ? <Tag color="green">已生成</Tag> : <Tag color="default">未生成</Tag>
    }
    if (mode === 'enhanced') {
      return group.enhanced ? <Tag color="purple">已生成</Tag> : <Tag color="default">未生成</Tag>
    }
    if (mode === 'overlay') {
      return group.filtered ? <Tag color="orange">叠加</Tag> : <Tag color="default">不可用</Tag>
    }
    return null
  }

  // 统计各类型图片数量
  const getCounts = () => {
    return {
      raw: images.raw.length,
      filtered: images.filtered.length,
      enhanced: images.enhanced.length,
      overlay: images.filtered.length,
    }
  }

  const counts = getCounts()

  // 渲染图片卡片
  const renderImageCard = (group: ImageGroup) => {
    const hasFiltered = !!group.filtered
    const hasEnhanced = !!group.enhanced

    return (
      <Col xs={24} sm={12} lg={8} xl={6} key={group.raw.id}>
        <Card
          hoverable
          cover={renderImage(group, viewMode)}
          style={{ marginBottom: 16 }}
          bodyStyle={{ padding: 12 }}
          actions={[
            <Tooltip title="查看原图" key="raw">
              <Button 
                type="text" 
                icon={<FileImageOutlined />} 
                onClick={() => setViewMode('raw')}
                disabled={viewMode === 'raw'}
              />
            </Tooltip>,
            <Tooltip title="查看去恒星图" key="filtered">
              <Button 
                type="text" 
                icon={<FilterOutlined />} 
                onClick={() => setViewMode('filtered')}
                disabled={!hasFiltered || viewMode === 'filtered'}
              />
            </Tooltip>,
            <Tooltip title="查看增强图" key="enhanced">
              <Button 
                type="text" 
                icon={<ThunderboltOutlined />} 
                onClick={() => setViewMode('enhanced')}
                disabled={!hasEnhanced || viewMode === 'enhanced'}
              />
            </Tooltip>,
            <Tooltip title="叠加对比" key="overlay">
              <Button 
                type="text" 
                icon={<AppstoreOutlined />} 
                onClick={() => setViewMode('overlay')}
                disabled={!hasFiltered || viewMode === 'overlay'}
              />
            </Tooltip>,
          ]}
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text ellipsis style={{ maxWidth: 120, fontSize: 13 }}>
                {group.raw.file_name}
              </Text>
              {getStatusTag(group, viewMode)}
            </div>
            
            {/* 透明度滑块（只在叠加模式显示） */}
            {viewMode === 'overlay' && hasFiltered && (
              <div style={{ marginTop: 4 }}>
                <Space size="small" style={{ width: '100%' }}>
                  <span style={{ fontSize: 12, color: '#999' }}>透明度</span>
                  <Slider
                    min={0}
                    max={100}
                    value={overlayOpacity * 100}
                    onChange={(value) => setOverlayOpacity(value / 100)}
                    style={{ flex: 1, margin: '0 8px' }}
                  />
                  <span style={{ fontSize: 12, color: '#999' }}>{Math.round(overlayOpacity * 100)}%</span>
                </Space>
              </div>
            )}
          </Space>
        </Card>
      </Col>
    )
  }

  // 空状态
  if (imageGroups.length === 0 && !loading) {
    return (
      <Card style={{ marginBottom: 24 }}>
        <Empty
          description="暂无图片，请点击右上角上传"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Badge count={counts.raw} offset={[10, 10]}>
            <Button icon={<FileImageOutlined />} disabled>
              原图 0
            </Button>
          </Badge>
        </Empty>
      </Card>
    )
  }

  return (
    <Card 
      title={
        <Space>
          <span>📸 图片处理结果</span>
          <Badge count={counts.raw} offset={[10, -5]}>
            <Tag icon={<FileImageOutlined />}>原图</Tag>
          </Badge>
          <Badge count={counts.filtered} offset={[10, -5]}>
            <Tag icon={<FilterOutlined />} color="green">去恒星</Tag>
          </Badge>
          <Badge count={counts.enhanced} offset={[10, -5]}>
            <Tag icon={<ThunderboltOutlined />} color="purple">增强</Tag>
          </Badge>
        </Space>
      }
      style={{ marginBottom: 24 }}
      extra={
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            共 {imageGroups.length} 组图片
          </Text>
        </Space>
      }
    >
      {/* 视图切换 */}
      <Tabs 
        activeKey={viewMode} 
        onChange={(key) => setViewMode(key as ViewMode)}
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'raw',
            label: <span><FileImageOutlined /> 原图 ({counts.raw})</span>,
          },
          {
            key: 'filtered',
            label: <span><FilterOutlined /> 去恒星 ({counts.filtered})</span>,
            disabled: counts.filtered === 0,
          },
          {
            key: 'enhanced',
            label: <span><ThunderboltOutlined /> 增强 ({counts.enhanced})</span>,
            disabled: counts.enhanced === 0,
          },
          {
            key: 'overlay',
            label: <span><AppstoreOutlined /> 叠加对比 ({counts.overlay})</span>,
            disabled: counts.overlay === 0,
          },
        ]}
      />

      {/* 图片网格 */}
      <Row gutter={[16, 16]}>
        {imageGroups.map(group => renderImageCard(group))}
      </Row>
    </Card>
  )
}

export default ImageGallery