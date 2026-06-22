# Gradio Mini Agent

> AI Agent 基础的 Client 端。 三个模块分别对应三种主流 Agent 模式，每个模块都是一个完整、可运行的最小示例，聚焦于"如何用 Gradio + OpenAI API 把 Agent 能力接入到一个真实界面里"。

基于 Gradio 的轻量 AI Agent 演示项目，包含三个独立模块，分别展示Skills client、MCP client、多 Subagent 协作三种 AI 工作模式。

---

## 模块概览

| 模块 | 目录 | 核心特性 |
|------|------|----------|
| **Skill Chat** | `skills-chat/` | 技能感知 · Progressive Loading · 热加载 |
| **MCP Client** | `MCP-client/` | MCP Server 动态接入 · 工具列表管理 |
| **Subagent Chat** | `subagent-client/` | Orchestrator + 多 Agent 协作 |

---

## 模块详解

### 🤖 Skill Chat — 技能感知 AI 助手

![Skill Chat 界面](assets/skills-client界面截图.png)

**工作方式：** AI 维护一份轻量技能索引（名称 + 描述），当用户意图与某个技能匹配时，自动通过 `read_file` / `ls` / `bash` 工具按需读取该技能的完整内容与脚本，再按技能定义的工作流拆解任务、逐步执行。全程工具调用实时可见，支持多轮连续对话。

**核心机制 — Progressive Loading：**
1. 启动时仅将技能的 `name + description` 注入 System Prompt（轻量元数据）
2. 用户意图匹配后，AI 主动调用 `read_file` 加载对应 `SKILL.md` 完整内容
3. 按需进一步加载 `scripts/`、`references/` 等子资源

**界面布局：**
- 左侧：项目文件树（实时浏览目录结构）
- 中间：对话区（流式输出，工具调用可折叠展示）
- 右侧：技能列表（点击展开描述，支持热加载）

**启动：**
```bash
cd skills-chat
cp .env.example .env   # 填写 API Key
pip install -r requirements.txt
python gradio_app.py
# 访问 http://localhost:7860
```

---

### 🔧 MCP Client — Model Context Protocol AI 助手

![MCP Client 界面](assets/mcp-client界面截图.png)

**工作方式：** 通过 MCP（Model Context Protocol）协议动态接入外部工具服务，AI 根据用户请求自动选择并调用对应 MCP Server 提供的工具。内置天气查询、时间获取、计算等示例工具。

**核心特性：**
- 支持同时连接多个 MCP Server（stdio / SSE 两种传输方式）
- 工具列表从 Server 动态获取，无需硬编码
- 界面内直接编辑 `mcp_config.json`，保存后自动重连

**界面布局：**
- 左侧：MCP Servers 状态（在线/离线 · 工具数量）
- 中间：对话区（工具调用过程实时展示）
- 右侧：工具管理（列表 / 配置编辑 / 单工具测试）

**启动：**
```bash
cd MCP-client
cp .env.example .env   # 填写 API Key 和 WEATHER_KEY
pip install -r requirements.txt
python gradio_app.py
# 访问 http://localhost:7860
```

---

### 🧠 Subagent Chat — 多智能体对话系统

![Subagent Chat 界面](assets/subagent-client界面截图.png)

**工作方式：** Orchestrator 分析用户意图，将任务拆解后委托给专门化 Subagent（🔍 研究员 · 💻 工程师 · ✍️ 写手 · 📊 分析师），整合输出后给出完整回答。全程委托链路实时可见。

**核心特性：**
- Orchestrator 负责意图理解与任务拆解
- 各 Subagent 专注单一领域，并行或串行执行
- Agent 活动日志实时展示每个 Agent 的工作内容
- 支持逐步迭代演示（step1 → step2 → step3）

**界面布局：**
- 左侧：可用 Agents 列表（名称 + 职责描述）
- 中间：对话区（Orchestrator 调度过程可见）
- 右侧：Agent 活动日志（各 Agent 执行摘要）

**启动：**
```bash
cd subagent-client
cp .env.example .env   # 填写 API Key
pip install -r requirements.txt
python gradio_app.py
# 访问 http://localhost:7862
```

---

## 目录结构

```
gradio-mini-agent/
├── assets/                        # 截图等静态资源
├── skills-chat/                   # Skill Chat 模块
│   ├── gradio_app.py
│   ├── utils.py
│   ├── skills/
│   │   ├── public/                # 公共技能
│   │   └── custom/                # 自定义技能
│   ├── requirements.txt
│   └── .env.example
├── MCP-client/                    # MCP Client 模块
│   ├── gradio_app.py
│   ├── mcp_ops.py
│   ├── weather_server.py
│   ├── example_server.py
│   ├── mcp_config.json
│   ├── requirements.txt
│   └── .env.example
└── subagent-client/               # Subagent Chat 模块
    ├── gradio_app.py
    ├── agents.py
    ├── step1_subagent.py
    ├── step2_pipeline.py
    ├── step3_orchestrator.py
    ├── requirements.txt
    └── .env.example
```

---

## 环境要求

- Python 3.10+
- 各模块独立安装依赖（见各目录 `requirements.txt`）
- 需要 OpenAI 兼容 API（支持 SiliconFlow、OpenAI 等）

### API 配置

每个模块目录下均有 `.env.example`，复制为 `.env` 并填写：

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.siliconflow.cn/v1
MODEL=Pro/MiniMaxAI/MiniMax-M2.5
```

> MCP-client 额外需要配置 `WEATHER_KEY`（[和风天气](https://dev.qweather.com/)免费 API）
