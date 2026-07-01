FROM python:3.13-slim

WORKDIR /app

# 安装系统依赖（包含所有需要的开发库）
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libc-dev \
    libpthread-stubs0-dev \  
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制并编译 C 源码
COPY c_src/ ./c_src/
RUN cd c_src && \
    gcc -shared -fPIC -o libsatellite.so *.c -lpthread -lm && \
    cp libsatellite.so /usr/lib/ && \
    rm -rf /app/c_src

# 复制应用代码
COPY app/ ./app/

# 创建上传目录
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]