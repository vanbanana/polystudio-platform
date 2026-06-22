#!/usr/bin/env bash
# 启动独立的「模拟厂商 API」服务（与主项目完全独立，可随时启停）
set -euo pipefail
cd "$(dirname "$0")"

PORT="${MOCK_API_PORT:-8900}"
PY="./.venv/bin/python"

if [ ! -x "$PY" ]; then
  echo "未找到虚拟环境，正在创建并安装依赖..."
  python3 -m venv .venv
  ./.venv/bin/pip install -q --upgrade pip
  ./.venv/bin/pip install -q -r requirements.txt
fi

if [ -f mock-api.pid ] && kill -0 "$(cat mock-api.pid)" 2>/dev/null; then
  echo "Mock API 已在运行 (PID $(cat mock-api.pid))，端口 $PORT。先执行 ./stop.sh 再启动。"
  exit 0
fi

echo "启动 Mock Provider API → http://localhost:${PORT}"
MOCK_API_PORT="$PORT" nohup "$PY" server.py > mock-api.log 2>&1 &
echo $! > mock-api.pid
sleep 1
echo "已启动 (PID $(cat mock-api.pid))。日志：mock-api/mock-api.log"
echo "健康检查： curl http://localhost:${PORT}/__mock/info"
