import { useCallback } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { Mic } from 'lucide-react'
import { useAgentRuntime, type MediaItem } from './agentRuntime'
import { useThreadScoped } from './threadScope'
import StudioLayout from './StudioLayout'
import AgentThread from './AgentThread'
import PodcastPlayer from './PodcastPlayer'
import { AGENT_BY_VIEW } from './nav'
import './studio.css'

const AGENT = AGENT_BY_VIEW.podcast

const SUGGESTIONS = [
  '生成一段 1 分钟的科技播客开场白，主持人是亲切的女声',
  '做一段双人对话播客：主持人和 AI 专家聊大模型，各自不同音色',
  '用沉稳的男声朗读一段关于咖啡文化的播客脚本',
  '生成一段轻松的早间播客，配一段舒缓的背景音乐',
]

const HINT = '你是一个智能播客助手，请按脚本创作→音色设计→语音合成的流程调用语音工具生成音频。'
const keyOfMedia = (m: MediaItem) => m.url

export default function PodcastStudio() {
  const { items: audios, add, setActive } = useThreadScoped<MediaItem>(keyOfMedia)

  const onMedia = useCallback(
    (m: MediaItem) => {
      if (m.kind !== 'audio') return
      add(m)
    },
    [add],
  )

  const runtime = useAgentRuntime({ canvasId: 'tp-podcast-studio', systemHint: HINT, onMedia })

  const stage = (
    <>
      <div className="cz-preview-head">
        <h3>播客单集</h3>
        <span className="count">{audios.length} 集</span>
      </div>
      <div className="cz-preview-body">
        {audios.length === 0 ? (
          <div className="tp-stage-empty">
            <Mic size={38} strokeWidth={1.4} />
            <p>还没有音频，在左侧对话里描述播客主题开始生成</p>
          </div>
        ) : (
          <div className="tp-audio-list">
            {audios
              .slice()
              .reverse()
              .map((a, i) => (
                <PodcastPlayer key={a.url} src={a.url} title={a.prompt} label={`第 ${audios.length - i} 集`} />
              ))}
          </div>
        )}
      </div>
    </>
  )

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <StudioLayout
        onThread={setActive}
        chatTitle="播客 Agent"
        chatSub="脚本创作 → 音色设计 → 语音合成"
        chatIcon={<Mic size={17} />}
        preview={stage}
      >
        <AgentThread
          placeholder="例如：生成一段科技播客开场白，主持人是亲切的女声…"
          suggestions={SUGGESTIONS}
          emptyTitle="描述你的播客"
          emptyHint="左侧会依次显示脚本生成、音色设计、语音合成等步骤。"
          modelLabel="语音合成 · Agent"
          agentName={AGENT.name}
          agentIcon={AGENT.icon}
          agentColor={AGENT.color}
        />
      </StudioLayout>
    </AssistantRuntimeProvider>
  )
}
