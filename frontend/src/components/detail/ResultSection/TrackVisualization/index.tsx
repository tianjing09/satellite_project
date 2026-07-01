import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { Track } from '../../../../types'

interface TrackVisualizationProps {
  tracks: Track[]
  selectedTrack?: Track | null
  height?: number
}

const TrackVisualization: React.FC<TrackVisualizationProps> = ({
  tracks,
  selectedTrack,
  height = 450,
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  // 生成不同颜色
  const getColor = (index: number) => {
    const colors = [
      '#1890ff', '#52c41a', '#faad14', '#ff4d4f', 
      '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
      '#2f54eb', '#a0d911',
    ]
    return colors[index % colors.length]
  }

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return

    // 确保容器有尺寸
    const chart = echarts.init(chartRef.current)
    chartInstanceRef.current = chart

    const handleResize = () => {
      chart.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [])

  // 更新图表数据
  useEffect(() => {
    if (!chartInstanceRef.current) return

    const chart = chartInstanceRef.current

    // 如果没有任何轨迹数据，显示空状态
    if (!tracks || tracks.length === 0) {
      chart.setOption({
        title: {
          text: '暂无轨迹数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 16,
          },
        },
      })
      return
    }

    // 准备数据 - 使用简单的散点图，不用3D
    const seriesData = tracks.map((track, index) => {
      const color = getColor(index)
      const isSelected = selectedTrack?.id === track.id

      // 将经纬度转换为散点数据
      const data = track.points.map((point) => {
        return {
          name: track.name || `卫星 ${track.norad_id}`,
          value: [point[0], point[1]],
        }
      })

      return {
        name: track.name || `卫星 ${track.norad_id}`,
        type: 'scatter',
        data: data,
        symbolSize: isSelected ? 20 : 10,
        itemStyle: {
          color: color,
          opacity: isSelected ? 1 : 0.6,
          borderColor: isSelected ? '#fff' : 'transparent',
          borderWidth: isSelected ? 3 : 0,
          shadowBlur: isSelected ? 10 : 0,
          shadowColor: isSelected ? 'rgba(255,255,255,0.5)' : 'transparent',
        },
        emphasis: {
          itemStyle: {
            opacity: 1,
            shadowBlur: 10,
            shadowColor: 'rgba(255,255,255,0.3)',
          },
        },
        label: {
          show: isSelected,
          formatter: (params: any) => {
            return params.data.name || ''
          },
          position: 'top',
          fontSize: 14,
          color: '#fff',
          textShadowColor: 'rgba(0,0,0,0.8)',
          textShadowBlur: 4,
        },
        // 连接轨迹点形成线
        markLine: {
          silent: true,
          data: [
            {
              type: 'line',
              // 使用所有点
            }
          ],
          lineStyle: {
            color: color,
            width: 2,
            opacity: isSelected ? 1 : 0.5,
          },
        },
        // 使用 markLine 连接所有点
        markLineData: track.points.map((point) => [point[0], point[1]]),
      }
    })

    // 为每个轨迹添加连线（单独处理）
    const lineSeries = tracks.map((track, index) => {
      const color = getColor(index)
      const isSelected = selectedTrack?.id === track.id
      const points = track.points.map((point) => [point[0], point[1]])

      return {
        name: track.name || `卫星 ${track.norad_id}`,
        type: 'line',
        data: points,
        lineStyle: {
          color: color,
          width: isSelected ? 3 : 2,
          opacity: isSelected ? 1 : 0.5,
        },
        itemStyle: {
          color: color,
        },
        symbol: 'circle',
        symbolSize: isSelected ? 12 : 6,
        smooth: true,
        emphasis: {
          lineStyle: {
            width: 4,
          },
        },
      }
    })

    // ECharts 配置 - 使用简单的地理坐标
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (!params.data) return ''
          const name = params.data.name || '未知卫星'
          const value = params.data.value || params.data
          return `
            <div style="padding: 8px;">
              <strong>${name}</strong><br/>
              经度: ${value[0].toFixed(4)}°<br/>
              纬度: ${value[1].toFixed(4)}°
            </div>
          `
        },
      },
      legend: {
        data: tracks.map(t => t.name || `卫星 ${t.norad_id}`),
        textStyle: {
          color: '#333',
        },
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 8,
        padding: [8, 12],
        bottom: 10,
        left: 'center',
        z: 100,
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '15%',
        top: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '经度',
        nameLocation: 'center',
        nameGap: 20,
        nameTextStyle: {
          color: '#666',
        },
        axisLine: {
          lineStyle: {
            color: '#ccc',
          },
        },
        axisLabel: {
          color: '#666',
          formatter: (value: number) => value.toFixed(1) + '°',
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0,0,0,0.05)',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: '纬度',
        nameLocation: 'center',
        nameGap: 30,
        nameTextStyle: {
          color: '#666',
        },
        axisLine: {
          lineStyle: {
            color: '#ccc',
          },
        },
        axisLabel: {
          color: '#666',
          formatter: (value: number) => value.toFixed(1) + '°',
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0,0,0,0.05)',
          },
        },
      },
      series: [
        ...lineSeries,
        // 散点图显示点
        ...tracks.map((track, index) => {
          const color = getColor(index)
          const isSelected = selectedTrack?.id === track.id
          return {
            name: track.name || `卫星 ${track.norad_id}`,
            type: 'scatter',
            data: track.points.map((point) => ({
              name: track.name || `卫星 ${track.norad_id}`,
              value: [point[0], point[1]],
            })),
            symbolSize: isSelected ? 16 : 8,
            itemStyle: {
              color: color,
              opacity: isSelected ? 1 : 0.8,
              borderColor: isSelected ? '#fff' : 'transparent',
              borderWidth: isSelected ? 2 : 0,
            },
            emphasis: {
              itemStyle: {
                opacity: 1,
                shadowBlur: 10,
                shadowColor: 'rgba(0,0,0,0.3)',
              },
            },
            label: {
              show: isSelected,
              formatter: (params: any) => {
                return params.data.name || ''
              },
              position: 'top',
              fontSize: 12,
              color: '#333',
              fontWeight: 'bold',
              textShadowColor: 'rgba(255,255,255,0.8)',
              textShadowBlur: 4,
            },
            zlevel: 1,
          }
        }),
      ],
      backgroundColor: '#f5f7fa',
    }

    chart.setOption(option, true)
    
    // 调整大小
    setTimeout(() => {
      chart.resize()
    }, 100)

  }, [tracks, selectedTrack])

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: height,
        background: '#f5f7fa',
        borderRadius: 8,
        border: '1px solid #e8e8e8',
        position: 'relative',
        zIndex: 1,
      }}
    />
  )
}

export default TrackVisualization