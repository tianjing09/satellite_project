// cd frontend
// npm run dev
// docker build --no-cache -t test-frontend ./frontend
// docker-compose build --no-cache
// docker-compose ps
// # 5. 构建并启动
// docker-compose build --no-cache
// docker-compose up -d

// # 6. 查看状态
// docker-compose ps
// docker-compose logs -f

// cd /Users/jingtian/Desktop/satellite_project

// # 停止并移除前端容器
// docker-compose stop frontend
// docker-compose rm -f frontend

// # 重新构建（应用新的 nginx.conf）
// docker-compose build --no-cache frontend

// # 启动
// docker-compose up -d frontend

// # 查看日志
// docker-compose logs frontend

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import './index.css'  // 新增：导入全局样式
import { themeConfig } from './styles/theme'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider 
      locale={zhCN} 
      theme={themeConfig}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)