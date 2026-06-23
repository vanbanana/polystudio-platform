import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { MessageSquare } from 'lucide-react'
import { useAgentRuntime } from './agentRuntime'
import StudioLayout from './StudioLayout'
import AgentThread from './AgentThread'
import { AGENT_BY_VIEW } from './nav'
import './studio.css'

const AGENT = AGENT_BY_VIEW.chat

const SUGGESTIONS = [
  '用通俗的话解释一下什么是大语言模型',
  '帮我写一个 Python 快速排序，并讲解思路',
  '比较一下 RAG 和微调的适用场景',
  '给我一份本地部署 Qwen3 的步骤清单',
]

export default function ChatStudio() {
  const runtime = useAgentRuntime({ canvasId: 'tp-chat-studio' })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <StudioLayout chatTitle="Qwen3 Agent" chatSub="本地化全模态对话" chatIcon={<MessageSquare size={17} />}>
        <AgentThread
          centered
          placeholder="给 Qwen3 发消息…"
          suggestions={SUGGESTIONS}
          emptyTitle="Qwen3 对话"
          emptyHint="模仿在线 AI 网站的对话界面，背后是同一套全能 Agent。本地化部署后可把云端模型替换为本地 Qwen3。"
          modelLabel="Qwen3 · 本地化"
          agentName={AGENT.name}
          agentIcon={AGENT.icon}
          agentColor={AGENT.color}
        />
      </StudioLayout>
    </AssistantRuntimeProvider>
  )
}
