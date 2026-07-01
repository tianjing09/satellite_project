# # 1. 进入项目目录
# cd /path/to/satellite_project

# # 2. 创建上传目录
# mkdir -p /Users/jingtian/Documents/satellite_uploads

# # 3. 确保 C 源码在正确位置
# ls backend/c_src/
# # 应该看到 satellite.c 等文件

# # 4. 给启动脚本添加执行权限
# chmod +x start.sh stop.sh

# # 方式一：使用启动脚本
# ./start.sh

# # 方式二：手动操作
# docker-compose build
# docker-compose up -d

# # 查看日志（确保没有错误）
# docker-compose logs -f

# # 查看所有容器状态
# docker-compose ps

# # 应该看到 5 个容器都在运行
# # satellite-postgres    Up
# # satellite-redis       Up
# # satellite-backend     Up
# # satellite-worker      Up
# # satellite-frontend    Up

# 第四步：测试功能
# 访问前端：http://localhost:3000

# 访问 API 文档：http://localhost:8000/docs

# docker-compose logs backend | grep -i error

#!/bin/bash

# 启动所有服务
docker-compose up -d

# 等待服务启动
echo "Waiting for services to start..."
sleep 10

# 执行数据库迁移（如果需要）
docker exec -it satellite-backend alembic upgrade head

echo "✅ All services started!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000/docs"
echo "API Documentation: http://localhost:8000/docs"