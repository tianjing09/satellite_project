import React, { useState } from 'react'
import { Card, Space, Typography, Alert, Row, Col, Empty, Tag } from 'antd'
import { CheckCircleOutlined, TrophyOutlined } from '@ant-design/icons'
import type { Task } from '../../../types'
import TrackTable from './TrackTable'
import TrackVisualization from './TrackVisualization'
import ExportCSV from './ExportCSV'

const { Title, Text } = Typography

interface ResultSectionProps {
  task: Task
}

const ResultSection: React.FC<ResultSectionProps> = ({ task }) => {
  const [selectedTrack, setSelectedTrack] = useState<any>(null)

  // 如果任务未完成或没有结果，不显示
  if (task.status !== 'completed' || !task.result) {
    return null
  }

  const { tracks } = task.result
  const hasTracks = tracks && tracks.length > 0

  // 处理轨迹选择
  const handleTrackSelect = (track: any) => {
    console.log('选中轨迹:', track)
    setSelectedTrack(track)
  }

  return (
    <Card 
      title={
        <Space>
          <TrophyOutlined style={{ color: '#faad14' }} />
          <span>🏆 轨迹识别结果</span>
          <Tag color="success">共识别到 {tracks?.length || 0} 个目标</Tag>
        </Space>
      }
      extra={
        <Space>
          <ExportCSV tracks={tracks || []} taskName={task.name} />
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      {hasTracks ? (
        <div>
          <Alert
            message="识别成功"
            description={
              <div>
                成功从 {task.total_images} 张图片中识别出 {tracks.length} 个卫星目标。
                点击下方表格中的 "定位到地图" 可在地图上查看轨迹。
              </div>
            }
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 16 }}
          />

          <Row gutter={[16, 16]}>
            {/* 左侧：表格 */}
            <Col xs={24} lg={12}>
              <div style={{ 
                background: '#fff', 
                borderRadius: 8,
                border: '1px solid #f0f0f0',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 2,
              }}>
                <TrackTable 
                  tracks={tracks} 
                  onTrackSelect={handleTrackSelect}
                />
              </div>
            </Col>

            {/* 右侧：地图（固定） */}
            <Col xs={24} lg={12}>
                <div
                    style={{
                    position: 'sticky',
                    top: 80,
                    zIndex: 10,
                    }}
                >
                    {/* 地图标题 - 也在 sticky 内 */}
                    <div style={{ 
                    padding: '8px 12px', 
                    background: '#fafafa', 
                    borderRadius: '8px 8px 0 0',
                    border: '1px solid #f0f0f0',
                    borderBottom: 'none',
                    }}>
                    <Text strong>🌍 轨迹可视化</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        (点击表格中的 "定位到地图" 可高亮显示)
                    </Text>
                    {selectedTrack && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                        当前选中: {selectedTrack.name || `卫星 ${selectedTrack.norad_id}`}
                        </Tag>
                    )}
                    </div>

                    {/* 地图 */}
                    <div style={{
                    background: '#fff',
                    borderRadius: '0 0 8px 8px',
                    border: '1px solid #e8e8e8',
                    borderTop: 'none',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}>
                    <TrackVisualization 
                        tracks={tracks} 
                        selectedTrack={selectedTrack}
                        height={500}
                    />
                    </div>
                </div>
            </Col>
          </Row>
        </div>
      ) : (
        <Empty 
          description="未识别到任何卫星目标"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Text type="secondary">
            任务已完成，但未检测到卫星轨迹。可能原因：
            <br />• 图片中没有卫星轨迹
            <br />• 图片质量不佳
            <br />• 需要调整算法参数
          </Text>
        </Empty>
      )}
    </Card>
  )
}

export default ResultSection