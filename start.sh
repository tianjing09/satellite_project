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