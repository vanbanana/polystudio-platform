import { useCallback } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { Film } from 'lucide-react'
import { useAgentRuntime, type MediaItem } from './agentRuntime'
import { useThreadScoped } from './threadScope'
import StudioLayout from './StudioLayout'
import AgentThread from './AgentThread'
import VideoEditorPanel from './VideoEditorPanel'
import { AGENT_BY_VIEW } from './nav'
import './studio.css'

const AGENT = AGENT_BY_VIEW.video

const SUGGESTIONS = [
  '海浪拍打沙滩，夕阳西下，镜头缓慢推进',
  '一只猫在窗台上伸懒腰，阳光洒进房间',
  '城市延时摄影，车流如光带穿梭，夜景霓虹',
  '森林中晨雾弥漫，阳光透过树叶洒下',
]

const HINT = '你是一个短视频创作助手，请根据用户描述调用视频生成工具产出视频。'
const keyOfMedia = (m: MediaItem) => m.url

export default function VideoStudio() {
  const { items: videos, add, setActive } = useThreadScoped<MediaItem>(keyOfMedia)

  const onMedia = useCallback(
    (m: MediaItem) => {
      if (m.kind !== 'video') return
      add(m)
    },
    [add],
  )

  const runtime = useAgentRuntime({ canvasId: 'tp-video-studio', systemHint: HINT, onMedia })

  const stage = (
    <>
      <div className="cz-preview-head">
        <h3>剪辑器</h3>
        <span className="count">{videos.length} 段</span>
      </div>
      <div className="cz-preview-body ve-host">
        <VideoEditorPanel videos={videos} />
      </div>
    </>
  )

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <StudioLayout
        onThread={setActive}
        chatTitle="短视频 Agent"
        chatSub="描述镜头，Agent 多步编排产出视频片段"
        chatIcon={<Film size={17} />}
        preview={stage}
      >
        <AgentThread
          placeholder="例如：海浪拍打沙滩，夕阳西下，镜头缓慢推进…"
          suggestions={SUGGESTIONS}
          emptyTitle="描述你的镜头"
          emptyHint="视频生成耗时较长（约 1-3 分钟），左侧会实时显示 Agent 的工具调用过程。"
          modelLabel="视频生成 · Agent"
          agentName={AGENT.name}
          agentIcon={AGENT.icon}
          agentColor={AGENT.color}
        />
      </StudioLayout>
    </AssistantRuntimeProvider>
  )
}
