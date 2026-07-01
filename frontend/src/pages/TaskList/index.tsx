import React, { useEffect, useState, useMemo } from 'react'
import { 
  Typography, 
  Button, 
  Space, 
  Input, 
  Pagination, 
  Empty, 
  Spin,
  Select,
  Card,
  Tag,
} from 'antd'
import { 
  PlusOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '../../store/taskStore'
import TaskCard from '../../components/tasks/TaskCard'
import { debounce } from 'lodash-es'

const { Title, Text } = Typography
const { Search } = Input
const { Option } = Select

const TaskList: React.FC = () => {
  const navigate = useNavigate()
  const {
    tasks,
    total,
    loading,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    fetchTasks,
  } = useTaskStore()

  // 本地筛选状态
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [filteredTasks, setFilteredTasks] = useState(tasks)
  const [currentPageTasks, setCurrentPageTasks] = useState(tasks)

  // 加载任务列表
  useEffect(() => {
    fetchTasks()
  }, [])

  // 当 tasks 变化时，重新筛选
  useEffect(() => {
    filterTasks()
  }, [tasks, searchKeyword, statusFilter])

  // 本地筛选函数
  const filterTasks = () => {
    let result = [...tasks]

    // 按状态筛选
    if (statusFilter !== 'all') {
      result = result.filter(task => task.status === statusFilter)
    }

    // 按名称搜索（不区分大小写）
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase()
      result = result.filter(task => 
        task.name.toLowerCase().includes(keyword)
      )
    }

    setFilteredTasks(result)
    
    // 重置到第一页
    setCurrentPage(1)
  }

  // 获取当前页的数据
  const getCurrentPageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredTasks.slice(start, end)
  }, [filteredTasks, currentPage, pageSize])

  // 搜索（防抖）
  const handleSearch = debounce((value: string) => {
    setSearchKeyword(value)
  }, 300)

  // 清空搜索
  const handleClearSearch = () => {
    setSearchKeyword('')
  }

  // 状态筛选变化
  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
  }

  // 分页变化
  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page)
    if (size !== pageSize) {
      setPageSize(size)
    }
  }

  // 刷新列表（重新从服务器获取）
  const handleRefresh = () => {
    fetchTasks()
    setSearchKeyword('')
    setStatusFilter('all')
  }

  // 获取状态统计
  const getStatusCount = (status: string) => {
    if (status === 'all') return tasks.length
    return tasks.filter(task => task.status === status).length
  }

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'default',
      processing: 'warning',
      completed: 'success',
      failed: 'error',
    }
    return colorMap[status] || 'default'
  }

  // 获取状态显示文本
  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      pending: '待上传',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
    }
    return textMap[status] || status
  }

  return (
    <div>
      {/* 头部 */}
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 24 }} wrap>
        <Title level={3} style={{ margin: 0 }}>
          任务列表
          <Text type="secondary" style={{ fontSize: 14, marginLeft: 12 }}>
            共 {tasks.length} 个任务
          </Text>
          {filteredTasks.length !== tasks.length && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              筛选后: {filteredTasks.length} 个
            </Tag>
          )}
        </Title>
        <Space wrap>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/tasks/create')}
          >
            创建新任务
          </Button>
        </Space>
      </Space>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%' }} wrap size="middle">
          <Search
            placeholder="按任务名称搜索..."
            allowClear
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            onClear={handleClearSearch}
            style={{ width: 280 }}
            enterButton={<SearchOutlined />}
            value={searchKeyword}
          />
          
          <Select
            value={statusFilter}
            onChange={handleStatusChange}
            style={{ width: 180 }}
            placeholder="筛选状态"
            suffixIcon={<FilterOutlined />}
          >
            <Option value="all">
              全部状态 ({getStatusCount('all')})
            </Option>
            <Option value="pending">
              <span>⏳ 待上传 ({getStatusCount('pending')})</span>
            </Option>
            <Option value="processing">
              <span>🔄 处理中 ({getStatusCount('processing')})</span>
            </Option>
            <Option value="completed">
              <span>✅ 已完成 ({getStatusCount('completed')})</span>
            </Option>
            <Option value="failed">
              <span>❌ 失败 ({getStatusCount('failed')})</span>
            </Option>
          </Select>

          {/* 显示当前筛选条件 */}
          {(searchKeyword || statusFilter !== 'all') && (
            <Space size="small">
              <Text type="secondary">当前筛选:</Text>
              {statusFilter !== 'all' && (
                <Tag 
                  color={getStatusColor(statusFilter)}
                  closable
                  onClose={() => setStatusFilter('all')}
                >
                  {getStatusText(statusFilter)}
                </Tag>
              )}
              {searchKeyword && (
                <Tag 
                  closable
                  onClose={handleClearSearch}
                >
                  搜索: "{searchKeyword}"
                </Tag>
              )}
            </Space>
          )}
          
          <Text type="secondary" style={{ marginLeft: 'auto' }}>
            显示 {getCurrentPageData.length} / {filteredTasks.length} 个任务
          </Text>
        </Space>
      </Card>

      {/* 任务列表 */}
      <Spin spinning={loading}>
        {filteredTasks.length > 0 ? (
          <div>
            {getCurrentPageData.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            
            {/* 分页 */}
            <div style={{ textAlign: 'right', marginTop: 24 }}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={filteredTasks.length}
                onChange={handlePageChange}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 个任务`}
                pageSizeOptions={['5', '10', '20', '50']}
              />
            </div>
          </div>
        ) : (
          <Empty
            description={
              tasks.length === 0 
                ? '暂无任务，点击右上角创建新任务' 
                : '没有匹配的任务，请调整筛选条件'
            }
            style={{ padding: '60px 0' }}
          >
            {tasks.length === 0 ? (
              <Button type="primary" onClick={() => navigate('/tasks/create')}>
                创建第一个任务
              </Button>
            ) : (
              <Button onClick={() => {
                setSearchKeyword('')
                setStatusFilter('all')
              }}>
                清除所有筛选条件
              </Button>
            )}
          </Empty>
        )}
      </Spin>
    </div>
  )
}

export default TaskList