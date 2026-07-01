import React from 'react'
import { Layout as AntLayout, Menu, theme, Avatar, Space, Typography, Badge } from 'antd'
import { 
  RocketOutlined, 
  PlusOutlined, 
  HomeOutlined,
  UserOutlined,
  BellOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Header, Content, Sider } = AntLayout
const { Title } = Typography

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  // 菜单项配置
  const menuItems = [
    {
      key: '/tasks',
      icon: <HomeOutlined />,
      label: '任务列表',
    },
    {
      key: '/tasks/create',
      icon: <PlusOutlined />,
      label: '创建任务',
    },
  ]

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* 顶部导航 */}
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 24px',
        background: '#001529',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <Space size="middle" align="center">
          <RocketOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <Title level={4} style={{ color: 'white', margin: 0 }}>
            卫星轨迹提取系统
          </Title>
        </Space>
        
        <Space size="large">
          <Badge dot>
            <BellOutlined style={{ fontSize: 20, color: 'white', cursor: 'pointer' }} />
          </Badge>
          <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
        </Space>
      </Header>

      <AntLayout>
        {/* 侧边栏 */}
        <Sider
          width={200}
          style={{
            background: colorBgContainer,
            borderRight: '1px solid #f0f0f0',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>

        {/* 主内容区 */}
        <AntLayout style={{ padding: '24px' }}>
          <Content
            style={{
              padding: 24,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </Content>
        </AntLayout>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout