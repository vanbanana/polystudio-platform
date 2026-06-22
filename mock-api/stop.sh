#!/usr/bin/env bash
# 停止「模拟厂商 API」服务
set -euo pipefail
cd "$(dirname "$0")"

if [ -f mock-api.pid ]; then
  PID="$(cat mock-api.pid)"
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "已停止 Mock API (PID $PID)。"
  else
    echo "进程未在运行。"
  fi
  rm -f mock-api.pid
else
  # 兜底：按端口杀进程
  PORT="${MOCK_API_PORT:-8900}"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" 2>/dev/null || true
  fi
  echo "未找到 pid 文件，已尝试按端口清理。"
fi
