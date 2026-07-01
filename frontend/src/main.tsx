// cd frontend
// npm run dev
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