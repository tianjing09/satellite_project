import React, { useState } from 'react'
import { Table, Tag, Button, Space, Typography, Tooltip, Modal } from 'antd'
import { 
  EyeOutlined, 
  GlobalOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Track } from '../../../../types'

const { Text } = Typography

interface TrackTableProps {
  tracks: Track[]
  onTrackSelect: (track: Track) => void
}

const TrackTable: React.FC<TrackTableProps> = ({ tracks, onTrackSelect }) => {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success'
    if (confidence >= 0.6) return 'warning'
    return 'error'
  }

  // 获取置信度标签
  const getConfidenceTag = (confidence: number) => {
    const level = confidence >= 0.8 ? '高' : confidence >= 0.6 ? '中' : '低'
    return (
      <Tag color={getConfidenceColor(confidence)}>
        {Math.round(confidence * 100)}% ({level})
      </Tag>
    )
  }

  // 表格列配置
  const columns: ColumnsType<Track> = [
    {
      title: '#',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'NORAD ID',
      dataIndex: 'norad_id',
      key: 'norad_id',
      width: 120,
      render: (id: number) => (
        <Text code>{id}</Text>
      ),
    },
    {
      title: '卫星名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <GlobalOutlined style={{ color: '#1890ff' }} />
          <Text strong>{name || '未知卫星'}</Text>
        </Space>
      ),
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 150,
      render: (confidence: number) => getConfidenceTag(confidence),
    },
    {
      title: '轨迹点数',
      dataIndex: 'points',
      key: 'points',
      width: 120,
      render: (points: [number, number][]) => (
        <Tag color="blue">{points.length} 个点</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedTrack(record)
              setDetailVisible(true)
            }}
          >
            查看详情
          </Button>
          <Button 
                type="primary" 
                size="small"
                onClick={() => {
                console.log('定位到地图:', record)
                onTrackSelect(record)
                }}
            >
            定位到地图
          </Button>
        </Space>
      ),
    },
  ]

  // 轨迹详情模态框
  const renderDetailModal = () => {
    if (!selectedTrack) return null

    return (
      <Modal
        title={
          <Space>
            <GlobalOutlined />
            <span>轨迹详情 - {selectedTrack.name || '未知卫星'}</span>
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="locate" 
            type="primary"
            onClick={() => {
              onTrackSelect(selectedTrack)
              setDetailVisible(false)
            }}
          >
            定位到地图
          </Button>,
        ]}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong>NORAD ID: </Text>
              <Text code>{selectedTrack.norad_id}</Text>
            </div>
            <div>
              <Text strong>卫星名称: </Text>
              <Text>{selectedTrack.name || '未知卫星'}</Text>
            </div>
            <div>
              <Text strong>置信度: </Text>
              {getConfidenceTag(selectedTrack.confidence)}
            </div>
            <div>
              <Text strong>轨迹点数: </Text>
              <Tag color="blue">{selectedTrack.points.length} 个点</Tag>
            </div>
          </Space>
        </div>

        <div style={{ 
          padding: 12, 
          background: '#f5f5f5', 
          borderRadius: 4,
          maxHeight: 200,
          overflow: 'auto'
        }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            轨迹坐标列表：
          </Text>
          {selectedTrack.points.map((point, index) => (
            <div key={index} style={{ fontSize: 13, padding: '2px 0' }}>
              <Text type="secondary">点 {index + 1}:</Text>
              <Text code style={{ marginLeft: 8 }}>
                经度 {point[0].toFixed(4)}°, 纬度 {point[1].toFixed(4)}°
              </Text>
            </div>
          ))}
        </div>
      </Modal>
    )
  }

  return (
    <div>
      <Table
        columns={columns}
        dataSource={tracks}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条轨迹`,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        locale={{
          emptyText: '暂无识别结果',
        }}
      />
      {renderDetailModal()}
    </div>
  )
}

export default TrackTable