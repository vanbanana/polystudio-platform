# 🧠 Subagent Chat — 多智能体对话系统

Orchestrator 理解用户意图、拆解任务，自动调度专门化 Subagent，整合输出给出完整回答。全程委托链路实时可见。

---

## 目录结构

```
subagent-client/
├── .env                   # API 配置（Key、Base URL、模型名）
├── .env.example           # 环境变量模板
├── requirements.txt       # 项目依赖（openai / gradio / python-dotenv）
│
├── agents.py              # Subagent 角色定义（researcher/coder/writer/analyst）与执行函数
├── gradio_app.py          # 完整应用：Gradio UI + Orchestrator 主逻辑
│
├── step1_subagent.py      # 练习一：直接调用单个 Subagent，理解最小执行单元
├── step2_pipeline.py      # 练习二：手动串联两个 Subagent，理解流水线与 self-contained 原则
├── step3_orchestrator.py  # 练习三：Orchestrator 通过 Function Calling 自动调度，理解 Agentic Loop
│
└── SUBAGENT_PATTERNS.md   # Subagent 模式详解：定义、五种模式、完整实践教程
```

---

## 环境准备

**1. 安装依赖**

```bash
pip install -r requirements.txt
```

**2. 配置环境变量**

```bash
cp .env.example .env
```

打开 `.env` 填入：

```ini
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.siliconflow.cn/v1   # 或 https://api.openai.com/v1
ORCHESTRATOR_MODEL=Qwen/Qwen2.5-72B-Instruct
SUBAGENT_MODEL=Qwen/Qwen2.5-72B-Instruct
```

---

## 单个脚本测试

三个脚本依次递进，建议按顺序新建并运行，每一步对应一个核心概念。

---

### 第一步：理解 Subagent 本质

新建文件 `step1_subagent.py`：

```python
import os
from dotenv import load_dotenv
import openai

load_dotenv()

client = openai.OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
)
MODEL = os.getenv("MODEL", "gpt-4o")

AGENTS = {
    "researcher": "你是一名专业研究员，擅长信息研究和知识查询。用中文回答，保持严谨客观。",
    "coder":      "你是一名高级软件工程师，擅长编写高质量代码。用中文解释思路，代码保持英文注释。",
    "writer":     "你是一名专业内容创作者，擅长文本创作和文档撰写。用简体中文创作，语句流畅自然。",
    "analyst":    "你是一名专业分析师，擅长数据分析和逻辑推理。用中文输出，重点突出、层次清晰。",
}

def run_subagent(agent_name: str, task: str) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": AGENTS[agent_name]},
            {"role": "user",   "content": task},
        ],
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    task = "请解释什么是 Python 的 GIL（全局解释器锁），以及它对并发编程的影响。"
    print("=" * 60)
    print(f"调用 Agent：researcher")
    print(f"任务：{task}")
    print("=" * 60)
    result = run_subagent("researcher", task)
    print(result)
```

运行：

```bash
python step1_subagent.py
```

Subagent 本质就是一次带专属 `system_prompt` 的 LLM 调用，没有其他任何神秘之处。

---

### 第二步：理解流水线模式

新建文件 `step2_pipeline.py`：

```python
import os
from dotenv import load_dotenv
import openai

load_dotenv()

client = openai.OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
)
MODEL = os.getenv("MODEL", "gpt-4o")

AGENTS = {
    "researcher": "你是一名专业研究员。提供准确、结构化的信息，用标题和列表组织输出，便于后续使用。",
    "writer":     "你是一名专业内容创作者。根据提供的资料，创作一篇完整、流畅的博客文章。",
}

def run_subagent(agent_name: str, task: str) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": AGENTS[agent_name]},
            {"role": "user",   "content": task},
        ],
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    topic = "Python 异步编程（asyncio）的核心概念与使用场景"

    print("▶ Step 1：researcher 研究中...")
    step1_result = run_subagent(
        "researcher",
        f"请深入研究以下主题，输出结构化知识点：\n\n{topic}",
    )
    print(f"\n[researcher 输出（{len(step1_result)} 字）]")
    print(step1_result)
    print("\n" + "─" * 60)

    print("\n▶ Step 2：writer 写作中...")
    step2_result = run_subagent(
        "writer",
        f"""请基于以下研究资料，写一篇面向 Python 开发者的技术博客。
要求：标题吸引人，包含引言/正文/总结，有代码示例，约 600 字。

【研究资料】
{step1_result}
""",
    )
    print(f"\n[writer 输出（{len(step2_result)} 字）]")
    print(step2_result)
```

运行：

```bash
python step2_pipeline.py
```

关键点：`step2_result` 的任务里完整嵌入了 `step1_result`。writer 看不到 researcher 的对话历史，所以上下文必须显式传入——这就是 **Self-contained Task 原则**。

---

### 第三步：理解完整 Agentic Loop

新建文件 `step3_orchestrator.py`：

```python
import json
import os
from dotenv import load_dotenv
import openai

load_dotenv()

client = openai.OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
)
MODEL = os.getenv("MODEL", "gpt-4o")

AGENTS = {
    "researcher": "你是一名专业研究员。提供准确、结构化的信息，明确区分事实与推断。",
    "coder":      "你是一名高级软件工程师。编写高质量、可运行的代码，附清晰注释。",
    "writer":     "你是一名专业内容创作者。创作完整、流畅的文章，语言自然。",
    "analyst":    "你是一名专业分析师。构建清晰逻辑框架，提供结构化分析报告。",
}

ORCHESTRATOR_SYSTEM = """
你是一名 Orchestrator AI，负责协调专门化 Subagent 完成用户请求。
复杂任务拆解为子任务，依次调度合适的 Subagent，整合输出给出完整回复。
可用 Subagent：researcher / coder / writer / analyst
⚠️ 每次调用时 task 字段必须完整自包含（Subagent 看不到对话历史）。
语言：始终用简体中文。
"""

TOOLS = [{
    "type": "function",
    "function": {
        "name": "delegate_to_agent",
        "description": "将子任务委托给专门化 Subagent 执行，返回该 Agent 的完整输出文本。",
        "parameters": {
            "type": "object",
            "properties": {
                "agent": {"type": "string", "enum": ["researcher", "coder", "writer", "analyst"]},
                "task":  {"type": "string", "description": "完整任务描述，必须自包含"},
                "reason":{"type": "string", "description": "调用此 Agent 的一句话理由"},
            },
            "required": ["agent", "task", "reason"],
        },
    },
}]

def run_subagent(agent_name: str, task: str) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": AGENTS[agent_name]},
            {"role": "user",   "content": task},
        ],
    )
    return response.choices[0].message.content

def run_orchestrator(user_message: str) -> str:
    messages = [{"role": "user", "content": user_message}]
    turn = 0
    while True:
        turn += 1
        print(f"\n── Orchestrator 第 {turn} 轮 ──")
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": ORCHESTRATOR_SYSTEM}] + messages,
            tools=TOOLS,
        )
        msg = response.choices[0].message
        if not msg.tool_calls:
            print("   → 无工具调用，输出最终回复")
            return msg.content
        messages.append(msg)
        tool_results = []
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            print(f"   → 委托 [{args['agent']}]：{args['reason']}")
            result = run_subagent(args["agent"], args["task"])
            print(f"     完成，返回 {len(result)} 字符")
            tool_results.append({"role": "tool", "tool_call_id": tc.id, "content": result})
        messages.extend(tool_results)

if __name__ == "__main__":
    user_input = "帮我研究一下 Rust 的内存安全机制，然后写一篇面向 Python 开发者的科普文章"
    print("=" * 60)
    print(f"用户：{user_input}")
    print("=" * 60)
    answer = run_orchestrator(user_input)
    print("\n" + "=" * 60)
    print("最终回复：")
    print("=" * 60)
    print(answer)
```

运行：

```bash
python step3_orchestrator.py
```

Orchestrator 通过 Function Calling 自动决定调哪个 Agent、传什么任务，将结果反馈给自身继续推理，循环直到任务完成。这就是 **Agentic Loop**。

---

## 完整应用（Gradio）

```bash
python gradio_app.py
```

浏览器打开 http://localhost:7861，体验完整的多智能体对话系统。

界面分三列：左侧为可用 Agent 列表，中间为对话区，右侧为 Agent 活动日志（实时展示每次调度过程）。

---

## 可用 Subagent

| Agent | 职责 |
|-------|------|
| 🔍 researcher | 信息研究、知识查询、事实核验 |
| 💻 coder | 代码编写、调试、技术方案设计 |
| ✍️ writer | 文本创作、内容润色、文档撰写 |
| 📊 analyst | 数据分析、逻辑推理、问题拆解 |

---

## 延伸阅读

→ [SUBAGENT_PATTERNS.md](./SUBAGENT_PATTERNS.md) — Subagent 的定义、五种模式详解及完整实践教程
