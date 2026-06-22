import { useState } from 'react'
import { Film } from 'lucide-react'
import { useAgentChat } from './useAgentChat'
import { AgentActivity, Composer, ExampleChips } from './parts'
import './studio.css'

const EXAMPLES = [
  '生成一段 5 秒的视频：海浪拍打沙滩，夕阳西下，镜头缓慢推进',
  '一只猫在窗台上伸懒腰，阳光洒进房间，温馨治愈',
  '城市延时摄影，车流如光带穿梭，夜景霓虹',
]

const HINT = '你是一个短视频创作助手，请根据用户描述调用视频生成工具产出视频。'

export default function VideoStudio() {
  const { messages, videos, isLoading, send, stop } = useAgentChat('tp-video-studio')
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    send(input, { systemHint: HINT })
    setInput('')
  }

  return (
    <div className="tp-studio">
      <div className="tp-studio-panel">
        <div className="tp-studio-head">
          <div className="tp-studio-title">短视频创作 Agent</div>
          <div className="tp-studio-sub">
            描述画面或镜头，Agent 调用视频生成工具产出片段。可进一步要求“图生视频”“多段拼接”，体验多步编排。
          </div>
        </div>

        <div className="tp-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={stop}
            loading={isLoading}
            placeholder='例如：海浪拍打沙滩，夕阳西下，镜头缓慢推进…'
          />
          <div>
            <span className="tp-label">示例</span>
            <ExampleChips items={EXAMPLES} onPick={(v) => setInput(v)} />
          </div>
        </div>

        <div className="tp-card">
          <span className="tp-label">Agent 执行过程</span>
          <AgentActivity messages={messages} emptyHint="视频生成耗时较长（约 1-3 分钟），这里会实时显示工具调用进度。" />
        </div>
      </div>

      <div className="tp-studio-stage">
        <div className="tp-stage-head">
          <h3>成片</h3>
          <span>{videos.length} 段</span>
        </div>
        {videos.length === 0 ? (
          <div className="tp-stage-empty">
            <Film size={42} />
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
  )
}
