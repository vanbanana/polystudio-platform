## skills-chat 实战指南

### 实验目的

- **目标**：在本地用 `skills-chat` 项目跑通「基于 Skills 的多轮智能体」，体验：
  - 如何加载公共 / 自定义 Skills（如 `xiaohongshu-copywriter`）。
  - 如何在命令行和 Jupyter Notebook 中进行交互对话。
  - 如何复用第三方 Skills 做实验。

### 项目目录结构（示例）

假设根目录为 `~/projects/skills-client`，与本次实验相关的核心结构示例：

```bash
skills-client/
  deer-flow/
    skills/                # 第三方公共 skills（frontend-design 等）
      public/
        frontend-design/
          SKILL.md
        ...
  skills-chat/
    skill_chat.py          # 本次实验的主入口
    skills/                # 本项目自带 skills 根目录
      public/              # 你可以放公有 skills
      custom/
        xiaohongshu-copywriter/
          SKILL.md
          references/
            xiaohongshu_tags.md
            xiaohongshu_features.md
            xiaohongshu_template.md
```

> 实际 tree 可以用 `tree -L 3 skills-chat` 自己生成；上面是精简示例。

### 环境准备（conda + Jupyter）

#### 1. 获取代码与进入目录

```bash
mkdir -p ~/projects
cd ~/projects
git clone <你的 skills-client 仓库地址>
cd skills-client/skills-chat
```

#### 2. 创建并激活 conda 环境

```bash
conda create -n skills-chat python=3.10 -y
conda activate skills-chat
```

#### 3. 安装依赖并注册 Jupyter kernel

```bash
# 如果有 requirements.txt
pip install -r requirements.txt

# 没有的话至少需要：
# pip install openai ipykernel python-dotenv

# 注册成一个 Jupyter kernel
pip install ipykernel
python -m ipykernel install --user --name skills-chat --display-name "Python (skills-chat)"
```

#### 4. 配置大模型与 Skills 目录

在 `skill_chat.py` 中确认：

```python
SKILLS_DIR = "skills"  # 本项目的 skills 根目录

MODEL = "Pro/MiniMaxAI/MiniMax-M2.5"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = "https://api.siliconflow.cn/v1"
```

并在 shell 中配置环境变量，例如：

```bash
export OPENAI_API_KEY="你的 Key"
```

### 在 Jupyter 中进行实验

#### 1. 创建实验用 notebooks 目录

```bash
cd ~/projects/skills-client/skills-chat
mkdir -p notebooks
```

#### 2. 启动 Jupyter 并选择 kernel

```bash
conda activate skills-chat
jupyter lab  # 或 jupyter notebook
```

在浏览器中新建 Notebook，kernel 选择 **“Python (skills-chat)”**。

#### 3. 在 Notebook 中启动对话循环

```python
%cd ~/projects/skills-client/skills-chat

from skill_chat import main

# 在 Notebook 的输出区域启动对话循环
main()
```

你可以在其它 cell 中用 Markdown 记录实验步骤、截图和结论。

### 创建自定义 Skills（以小红书文案为例）

#### 1. 目录结构

```bash
cd ~/projects/skills-client/skills-chat

mkdir -p skills/custom/xiaohongshu-copywriter/references
```

#### 2. 核心文件

- `skills/custom/xiaohongshu-copywriter/SKILL.md`
  - 顶部 YAML front-matter 至少包括：
    - `name`: `xiaohongshu-copywriter`
    - `description`: skill 的用途说明（例如「生成小红书风格种草文案」）。
  - 正文部分写清工作流：需要向用户询问哪些关键信息、如何调用 `references` 中的模板与标签等。
- `skills/custom/xiaohongshu-copywriter/references/` 下的辅助文件：
  - `xiaohongshu_tags.md`：常用标签、话题。
  - `xiaohongshu_features.md`：平台风格、用户偏好。
  - `xiaohongshu_template.md`：文案结构模板（开头抓人、场景描述、产品亮点、行动号召等）。

启动前确认 `SKILLS_DIR = "skills"`，这样自定义 skill 会被自动扫描并注入系统提示。

### 运行对话（命令行模式）

```bash
cd ~/projects/skills-client/skills-chat
conda activate skills-chat

python skill_chat.py
```

看到类似输出：

```text
Loaded N skills: ['xiaohongshu-copywriter', ...]
------------------------------------------------------------
Chat started. Type 'exit' or 'quit' to stop.
```

然后输入：

```text
You: 帮我写一篇小红书护肤精华的种草文案，目标人群是熬夜党女生
```

终端中你会看到：

- 友好的工具调用提示，例如：
  - `【技能系统】查看目录：skills/custom/xiaohongshu-copywriter`
  - `【技能系统】读取文件：skills/custom/xiaohongshu-copywriter/SKILL.md`
- 模型的自然语言说明与交互提问。
- 最终生成的小红书文案（标题 + 正文 + 话题标签等）。

### 使用第三方 Skills 做实验

`deer-flow/skills/public` 下已经提供了大量通用 Skills，例如：

- `frontend-design`
- `ppt-generation`
- `deep-research`
等。

你可以把其中某个 skill 软链接或复制到当前项目的 `skills/public` 下，例如：

```bash
cd ~/projects/skills-client/skills-chat

mkdir -p skills/public
ln -s ../deer-flow/skills/public/frontend-design skills/public/frontend-design
```

重新运行 `python skill_chat.py`，然后提问：

```text
You: 我想做一个足球联赛官网的首页设计
```

Agent 会自动加载 `frontend-design` skill，引导你梳理需求并产出页面信息架构和设计建议。

### 实验总结

- 通过清晰的 **目录结构**（`skills-chat` 代码 + `skills/public/custom` + 第三方 `deer-flow/skills`），实现了框架与领域技能的解耦。
- 借助 **conda + Jupyter**，既能在命令行高效测试，也能在 Notebook 中系统记录整个实验过程。
- 支持同时 **创建自定义 Skills**（如 `xiaohongshu-copywriter`）和 **复用第三方 Skills**（如 `frontend-design`），方便快速扩展不同场景。
- 通过终端中的 `【技能系统】查看目录 / 读取文件 / 执行命令` 提示，可以清晰观察 Agent 背后的技能加载与执行过程，便于调试和优化。

