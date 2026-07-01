import React from 'react'
import { Button, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import type { Track } from '../../../../types'

interface ExportCSVProps {
  tracks: Track[]
  taskName: string
}

const ExportCSV: React.FC<ExportCSVProps> = ({ tracks, taskName }) => {
  const handleExport = () => {
    if (tracks.length === 0) {
      message.warning('没有可导出的轨迹数据')
      return
    }

    try {
      // 构建 CSV 数据
      const headers = ['NORAD ID', '卫星名称', '经度', '纬度', '置信度']
      const rows: string[][] = []

      tracks.forEach(track => {
        track.points.forEach((point) => {
          rows.push([
            String(track.norad_id),
            track.name || '未知卫星',
            point[0].toFixed(6),
            point[1].toFixed(6),
            String(Math.round(track.confidence * 100) + '%'),
          ])
        })
      })

      // 构建 CSV 内容
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n')

      // 添加 BOM 以支持 UTF-8
      const blob = new Blob(['\uFEFF' + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      })

      // 创建下载链接
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `轨迹数据_${taskName}_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      message.success(`成功导出 ${rows.length} 条轨迹数据`)
    } catch (error) {
      console.error('导出失败:', error)
      message.error('导出失败，请重试')
    }
  }

  return (
    <Button 
      icon={<DownloadOutlined />}
      onClick={handleExport}
      disabled={tracks.length === 0}
    >
      导出 CSV
    </Button>
  )
}

export default ExportCSV