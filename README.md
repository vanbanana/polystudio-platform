# 多模态智能体开发实训平台（PolyStudio Training Platform）

一个面向**教学/实训**的多模态 Agent 平台：在原 PolyStudio「对话式画布」内核之上，把同一个全能 Agent
按能力拆成多个**专门、清爽的工作台**（文生图 / 3D 资产 / 短视频 / 播客 / Qwen3 对话），用于课堂演示与学生上手。
同时附带一个**完全独立、可随时启停的「模拟厂商 API」服务**，让全链路在不调用付费 API 的前提下跑通，便于验证显示与功能。

> 本仓库是从原 PolyStudio 改造出的**独立平台**，与原项目区分开来。
> 原项目/课程的资料已**整体归档**到 [`docs/90-原始项目与课程资料/`](docs/90-原始项目与课程资料/)（仅作历史参考，**可能与当前实现不一致**）。
> 描述**当前平台**的权威文档在 [`docs/00-平台文档/`](docs/00-平台文档/)。

---

## 它由三部分组成

| 组件 | 目录 | 端口 | 说明 |
|---|---|---|---|
| **后端 Agent** | `backend/` | `8000` | FastAPI + LangGraph `create_react_agent`，**一个全能 Agent** 注册全部工具，统一走 `POST /api/chat` 的 SSE 流式接口；静态托管产物于 `/storage`。**未改动原有 Agent 逻辑。** |
| **前端实训 UI** | `frontend/` | `3000`（dev） | React + Vite + TypeScript，对话/工具调用/思考链/输入框全部用 [`@assistant-ui/react`](https://www.assistant-ui.com/)。新增 `src/training/` 一套教学工作台，复用同一个 `/api/chat`。 |
| **模拟厂商 API** | `mock-api/` | `8900` | 独立 FastAPI 服务，**按官方文档字段**复刻火山 Seedream/Seedance、腾讯混元 3D、阿里 DashScope Qwen-TTS/Omni 的请求/响应，返回本地公开测试素材。一键启停，不影响主项目。详见 [`mock-api/README.md`](mock-api/README.md)。 |

**核心设计**：5 个工作台**共用同一个全能 Agent**，前端只是按工作台定制 UI + 注入不同 `systemHint`，
都路由到同一个 `/api/chat`。所以验证一个工作台 = 验证了共享的 Agent 基础设施。

---

## 快速开始（用 mock 模式跑通全链路）

需要：Python 3.9+、Node.js 18+、一个 OpenAI 兼容的便宜 LLM（如 DeepSeek，用来做 Agent 决策）。

```bash
# 1) 启动模拟厂商 API（独立服务，:8900）
cd mock-api && ./start.sh

# 2) 配置后端：把各厂商 base_url 指向 mock，LLM 接真实便宜模型
cd ../backend && cp env.example .env
#   编辑 .env（见下方「mock 模式 .env 示例」）

# 3) 启动后端（:8000）
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m app.main          # 或 ./start.sh

# 4) 启动前端（:3000，dev）
cd ../frontend && npm install && npm run dev
```

打开 `http://localhost:3000` → 左侧选 Agent → **点一次**建议词即发送（详见下方「使用注意」）。

### mock 模式 `.env` 示例（`backend/.env`，已被 .gitignore 忽略）

```env
# 对话：真实 LLM（哪个工具该被调用必须由真模型决定，这是"真实链路"的关键）
LLM_PROVIDER=siliconflow
OPENAI_API_KEY=sk-xxxx                  # 你的 DeepSeek key
OPENAI_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-v4-flash

# 其余厂商：全部指向本地 mock 服务
VOLCANO_BASE_URL=http://localhost:8900/api/v3
TENCENT_AI3D_BASE_URL=http://localhost:8900
DASHSCOPE_BASE_URL=http://localhost:8900

# 用真实 HTTP 链路（后端照常"请求→解析→下载落地 /storage"），而非环境变量假数据绕过
MOCK_MODE=false
```

切回真实 API：把上面各 `*_BASE_URL` / key 改回官方值即可，mock 服务随时关掉。

---

## 全链路数据流（一次"文生图"为例）

```
用户在工作台点建议词
  └─ assistant-ui 把消息交给 useAgentRuntime（frontend/src/training/agentRuntime.ts）
       └─ POST /api/chat  (SSE)                         [真实 HTTP]
            └─ 后端 create_react_agent + 真实 LLM 决策："该调 generate_volcano_image"
                 └─ 工具 POST http://localhost:8900/api/v3/images/generations   [真实 HTTP → mock]
                      └─ mock 返回 { data:[{url: http://localhost:8900/files/images/...}] }
                 └─ 后端 requests.get(url) 下载图片落地 backend/storage/images/   [真实下载]
            └─ SSE 回推事件：delta(文本) / skill_matched / tool_call / tool_result(含 image_url)
       └─ agentRuntime 解析 tool_result → onMedia({kind:'image', url}) → 右侧画廊渲染
```

只有**最末端的付费厂商**被换成了 mock；后端、SSE、下载、前端显示**全是真的**。

---

## 文档（`docs/`）

> ⚠️ 文档分两类：**`00-平台文档/` 是当前平台的权威文档**；`90-原始项目与课程资料/` 是原项目/课程的历史归档，**可能与当前实现不符**，阅读时请以前者为准。详见 [`docs/README.md`](docs/README.md)。

**当前平台（权威，对齐当前代码）—— [`docs/00-平台文档/`](docs/00-平台文档/)**
- **[交接文档](docs/00-平台文档/交接文档.md)** — 当前状态、如何把三套服务跑起来、端口/分支/环境、已知问题、如何接手继续开发。
- **[开发文档](docs/00-平台文档/开发文档.md)** — 细颗粒度：目录结构、后端 Agent/工具、前端实训模块、SSE 协议、mock-api 端点、如何新增能力/新增 mock。
- **[接口文档](docs/00-平台文档/接口文档.md)** — 后端 REST + SSE + WebSocket 全部端点、mock-api 各端点完整请求/响应 JSON 示例、工具返回字段→前端渲染映射。

**原始项目与课程资料（历史参考，可能过时）—— [`docs/90-原始项目与课程资料/`](docs/90-原始项目与课程资料/)**
- `04-平文/` — 原 PolyStudio 平台文档与 FRAMEWORK 说明（描述旧单画布版本）。
- `01-学手/`、`02-项实/`、`05-补资/` — 原课程实训手册与补充资料。

## 使用注意（踩坑提示）

- 工作台空态的**建议词气泡是 `autoSend`**：**点一次就已发送**。生成中那个位置会变成「停止」按钮，**不要再点第二次**，否则会取消（abort）本次请求（后端其实仍会跑完）。
- 接真实 LLM 时，出结果约 **8–90 秒**（取决于模型与是否有思考链）；视频/3D 是异步任务，会多等几秒轮询。
- 数字人（虚拟主播，第五章）**暂未开放**（需本地 GPU + ComfyUI 工作流）。

## 不做模拟的部分

对话（Agent 决策）**不模拟**，必须接真实 LLM——因为"该调哪个工具、传什么参数、何时停"正是要验证的智能体核心能力。
