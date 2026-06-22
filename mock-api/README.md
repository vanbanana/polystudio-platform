# PolyStudio Mock Provider API

独立、可随时启停的「模拟厂商 API」服务。它复刻各家外部模型厂商**官方接口的请求/响应字段**
（火山 Seedream 文生图/改图、火山 Seedance 视频、腾讯混元生 3D、阿里 DashScope Qwen-TTS / Qwen-Omni），
但所有产物都指向本服务托管的**真实下载素材**（公开图片 / 公开 GLB 模型 / 测试视频 / 公开音源）。

目的：让 PolyStudio 后端工具走「真实 HTTP 请求 → 解析响应 → 下载落地 `/storage`」的**完整链路**，
从而验证前端显示与原项目功能是否对齐——而**不真正调用付费 API**。

> 对话（Agent 决策）不在此模拟：直接接真实便宜 LLM（如 DeepSeek，OpenAI 兼容），因为「调哪个工具」
> 必须由真实大模型决定，这正是要验证的「真实链路」的关键。

本服务与主项目**完全独立**：独立目录、独立 venv、独立端口（默认 `8900`），一条命令启停，不影响后端（`8000`）。

## 启动 / 停止

```bash
cd mock-api
./start.sh        # 首次会自动创建 .venv 并安装依赖，随后后台启动于 :8900
./stop.sh         # 停止

# 健康检查 / 查看已加载的素材与端点清单
curl http://localhost:8900/__mock/info
```

环境变量（均可选）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `MOCK_API_PORT` | `8900` | 监听端口 |
| `MOCK_API_PUBLIC_URL` | `http://localhost:8900` | 返回给后端的可下载地址前缀 |
| `MOCK_ASSETS_DIR` | `./assets` | 素材目录 |
| `MOCK_TASK_DELAY` | `6` | 异步任务（视频/3D）从 `running`→`succeeded` 的秒数 |

## 让后端接入本服务

只改 `backend/.env`（已被 .gitignore 忽略，不进仓库），把各厂商 base_url 指向本服务，key 填任意假值；
对话单独接真实 LLM：

```env
# 对话：真实 LLM（示例 DeepSeek，OpenAI 兼容）
LLM_PROVIDER=siliconflow
OPENAI_API_KEY=sk-xxxx
OPENAI_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-v4-flash

# 其余厂商：全部指向本 mock 服务
VOLCANO_BASE_URL=http://localhost:8900/api/v3
TENCENT_AI3D_BASE_URL=http://localhost:8900
DASHSCOPE_BASE_URL=http://localhost:8900

# 用真实 HTTP 链路而非环境变量绕过
MOCK_MODE=false
```

想切回真实 API 时，把 `.env` 里的 base_url / key 改回去即可，本服务可随时关掉。

## 模拟的端点（字段对齐官方文档与后端工具契约）

| 厂商 / 能力 | 端点 | 模式 | 关键返回字段 |
|---|---|---|---|
| 火山 Seedream 文生图/改图 | `POST /api/v3/images/generations` | 同步 | `data[].url` |
| 火山 Seedance 视频 | `POST /api/v3/contents/generations/tasks`（提交）<br>`GET …/tasks/{id}`（轮询） | 异步 | `id` → `status`、`content.video_url` |
| 腾讯混元生 3D | `POST /v1/ai3d/submit`（提交）<br>`POST /v1/ai3d/query`（轮询） | 异步 | `Response.JobId` → `Response.Status`、`ResultFile3Ds[].Url/PreviewImageUrl` |
| DashScope Qwen-TTS 音色设计/复刻 | `POST /api/v1/services/audio/tts/customization` | 同步 | `output.voice` |
| DashScope 语音合成 | `POST /api/v1/services/aigc/multimodal-generation/generation` | 同步 | `output.audio.url` |
| DashScope Qwen-Omni 理解 | `POST /compatible-mode/v1/chat/completions` | 同步/流式 | OpenAI 兼容 `choices[].message/delta` |

异步任务用内存任务表 + 经过时长判断模拟「提交→轮询」：提交后约 `MOCK_TASK_DELAY` 秒内返回
`running`/`RUN`，之后返回 `succeeded`/`DONE`。每次生成会**轮换**一个素材，方便测试「多图/多模型/多视频/多播客」的累积展示。

## 测试素材

存放于 `assets/`（`images` / `videos` / `models` / `audio` / `previews`），均为公开、无需鉴权的测试文件。
`previews/*.png` 为各 GLB 模型的预览图（脚本用 Pillow 生成）。来源与重新下载方式见
[`download_assets.sh`](./download_assets.sh)。

## 目录结构

```
mock-api/
├── server.py            # FastAPI 服务：复刻各厂商端点
├── start.sh / stop.sh   # 启停脚本（独立 venv，后台运行）
├── requirements.txt
├── download_assets.sh   # 重新下载/记录素材来源（assets/ 已随仓库提供）
└── assets/              # 本地托管的测试素材
    ├── images/  videos/  models/  audio/  previews/
```
