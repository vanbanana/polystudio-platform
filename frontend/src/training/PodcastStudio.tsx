import { useState } from 'react'
import { Mic } from 'lucide-react'
import { useAgentChat } from './useAgentChat'
import { AgentActivity, Composer, ExampleChips } from './parts'
import './studio.css'

const EXAMPLES = [
  '生成一段 1 分钟的科技播客开场白，主持人是亲切的女声',
  '做一段双人对话播客：主持人和 AI 专家聊大模型，各自不同音色',
  '用沉稳的男声朗读一段关于咖啡文化的播客脚本',
]

const HINT = '你是一个智能播客助手，请按脚本创作→音色设计→语音合成的流程调用语音工具生成音频。'

export default function PodcastStudio() {
  const { messages, audios, isLoading, send, stop } = useAgentChat('tp-podcast-studio')
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
          <div className="tp-studio-title">智能播客 Agent</div>
          <div className="tp-studio-sub">
            描述播客主题与音色，Agent 完成脚本创作、音色设计与语音合成。试着指定多个角色的不同音色。
          </div>
        </div>

        <div className="tp-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={stop}
            loading={isLoading}
            placeholder='例如：生成一段科技播客开场白，主持人是亲切的女声…'
          />
          <div>
            <span className="tp-label">示例</span>
            <ExampleChips items={EXAMPLES} onPick={(v) => setInput(v)} />
          </div>
        </div>

        <div className="tp-card">
          <span className="tp-label">Agent 执行过程</span>
          <AgentActivity messages={messages} emptyHint="发送后这里会显示脚本生成、音色设计、语音合成等步骤。" />
        </div>
      </div>

      <div className="tp-studio-stage">
        <div className="tp-stage-head">
          <h3>音频成品</h3>
          <span>{audios.length} 条</span>
        </div>
        {audios.length === 0 ? (
          <div className="tp-stage-empty">
            <Mic size={42} />
            <p>还没有音频，在左侧描述播客主题开始生成</p>
          </div>
        ) : (
          <div className="tp-audio-list">
            {audios
              .slice()
              .reverse()
              .map((a, i) => (
                <div key={a.url} className="tp-audio-card">
                  <div className="meta">片段 {audios.length - i}</div>
                  <audio src={a.url} controls preload="metadata" />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
