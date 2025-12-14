#!/bin/bash
# 停车场管理系统启动脚本
# 同时启动 HTTP 和 HTTPS 开发服务器

set -e

cd "$(dirname "$0")/.."

echo "🚀 启动停车场管理系统..."

# 检查是否安装了依赖
if ! command -v uv &> /dev/null; then
    echo "❌ 错误: 未找到 uv，请先安装 uv"
    exit 1
fi

# 同步依赖
echo "📦 同步依赖..."
uv sync

# 停止可能正在运行的服务
echo "🛑 停止旧服务..."
pkill -f "manage.py runserver" 2>/dev/null || true
pkill -f "manage.py runserver_plus" 2>/dev/null || true
sleep 1

# 启动 HTTP 服务器 (端口 8000)
echo "🌐 启动 HTTP 服务器 (端口 8000)..."
uv run python manage.py runserver 0.0.0.0:8000 &
HTTP_PID=$!

# 启动 HTTPS 服务器 (端口 8443)
echo "🔒 启动 HTTPS 服务器 (端口 8443)..."
uv run python manage.py runserver_plus --cert-file /tmp/cert.pem 0.0.0.0:8443 &
HTTPS_PID=$!

sleep 2

echo ""
echo "✅ 服务器启动成功！"
echo ""
echo "📍 访问地址："
echo "   HTTP:  http://127.0.0.1:8000/"
echo "   HTTPS: https://127.0.0.1:8443/"
echo ""
echo "⚠️  注意: HTTPS 使用自签名证书，浏览器可能提示不安全，请选择"继续访问""
echo ""
echo "按 Ctrl+C 停止所有服务器"

# 等待子进程
wait $HTTP_PID $HTTPS_PID

