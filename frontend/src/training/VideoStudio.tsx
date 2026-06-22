import { useCallback, useState } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { Film } from 'lucide-react'
import { useAgentRuntime, type MediaItem } from './agentRuntime'
import AgentThread from './AgentThread'
import './studio.css'

const SUGGESTIONS = [
  '海浪拍打沙滩，夕阳西下，镜头缓慢推进',
  '一只猫在窗台上伸懒腰，阳光洒进房间',
  '城市延时摄影，车流如光带穿梭，夜景霓虹',
  '森林中晨雾弥漫，阳光透过树叶洒下',
]

const HINT = '你是一个短视频创作助手，请根据用户描述调用视频生成工具产出视频。'

export default function VideoStudio() {
  const [videos, setVideos] = useState<MediaItem[]>([])

  const onMedia = useCallback((m: MediaItem) => {
    if (m.kind !== 'video') return
    setVideos((prev) => (prev.some((p) => p.url === m.url) ? prev : [...prev, m]))
  }, [])

  const runtime = useAgentRuntime({ canvasId: 'tp-video-studio', systemHint: HINT, onMedia })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="tp-studio">
        <div className="tp-studio-panel">
          <div className="tp-studio-head">
            <div className="tp-studio-title">短视频创作</div>
            <div className="tp-studio-sub">描述画面或镜头，Agent 调用视频生成工具产出片段。可进一步要求“图生视频”“多段拼接”，体验多步编排。</div>
          </div>
          <AgentThread
            placeholder="例如：海浪拍打沙滩，夕阳西下，镜头缓慢推进…"
            suggestions={SUGGESTIONS}
            emptyTitle="描述你的镜头"
            emptyHint="视频生成耗时较长（约 1-3 分钟），左侧会实时显示 Agent 的工具调用过程。"
          />
        </div>

        <div className="tp-studio-stage">
          <div className="tp-stage-head">
            <h3>成片</h3>
            <span>{videos.length} 段</span>
          </div>
          {videos.length === 0 ? (
            <div className="tp-stage-empty">
              <Film size={38} strokeWidth={1.4} />
              <p>还没有视频，在左侧描述镜头开始生成</p>
            </div>
          ) : (
            <div className="tp-video-grid">
              {videos
                .slice()
                .reverse()
                .map((v) => (
                  <div key={v.url} className="tp-video-card">
                    <video src={v.url} controls preload="metadata" />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </AssistantRuntimeProvider>
  )
}
