import { KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Square, Sparkles } from 'lucide-react'
import { AgentMessage } from './useAgentChat'

const TOOL_LABELS: Record<string, string> = {
  generate_volcano_image: '生成图片',
  edit_volcano_image: '编辑图片',
  generate_3d_model: '生成 3D 模型',
  generate_volcano_video: '生成视频',
  concatenate_videos: '拼接视频',
  detect_face: '人脸检测',
  generate_virtual_anchor: '虚拟人合成',
  qwen_voice_design: '音色设计',
  qwen_voice_cloning: '音色复刻',
  concatenate_audio: '拼接音频',
  select_bgm: '匹配 BGM',
  mix_audio_with_bgm: '混音',
  qwen_omni_understand: '多模态理解',
}

function toolLabel(name: string) {
  return TOOL_LABELS[name] || name
}

// Agent 执行过程可视化：把模型回复文本与工具调用步骤展示出来（教学用，让学生看清编排）
export function AgentActivity({ messages, emptyHint }: { messages: AgentMessage[]; emptyHint: string }) {
  const visible = messages.filter(
    (m) => m.content.trim() || m.toolCalls.length > 0 || m.skillMatched,
  )
  if (visible.length === 0) {
    return <div className="tp-empty" style={{ padding: '32px 0' }}>{emptyHint}</div>
  }
  return (
    <div className="tp-activity">
      {visible.map((m, i) => (
        <div key={i} className={`tp-activity-row ${m.role}`}>
          {m.role === 'user' ? (
            <div className="tp-activity-user">{m.content}</div>
          ) : (
            <div className="tp-activity-assistant">
              {m.skillMatched && (
                <div className="tp-tool-pill">
                  <Sparkles size={12} /> 命中技能 · {m.skillMatched}
                </div>
              )}
              {m.toolCalls.map((tc) => (
                <div key={tc.id} className={`tp-tool-pill ${tc.status === 'done' ? 'done' : ''}`}>
                  <span className="dot" /> {toolLabel(tc.name)}
                  {tc.status === 'executing' ? ' · 执行中…' : ' · 完成'}
                </div>
              ))}
              {m.content.trim() && (
                <div className="tp-md">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

type ComposerProps = {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onStop?: () => void
  loading: boolean
  placeholder?: string
}

export function Composer({ value, onChange, onSend, onStop, loading, placeholder }: ComposerProps) {
  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSend()
    }
  }
  return (
    <div className="tp-composer">
      <textarea
        className="tp-textarea"
        rows={4}
        value={value}
        placeholder={placeholder || '描述你的需求，Agent 会自动选择并调用工具…'}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
      />
      <div className="tp-composer-actions">
        <span className="tp-composer-hint">Ctrl / ⌘ + Enter 发送</span>
        {loading && onStop ? (
          <button className="tp-btn tp-btn-ghost" onClick={onStop}>
            <Square size={15} /> 停止
          </button>
        ) : (
          <button className="tp-btn tp-btn-primary" disabled={loading || !value.trim()} onClick={onSend}>
            <Send size={15} /> {loading ? '生成中…' : '发送'}
          </button>
        )}
      </div>
    </div>
  )
}

export function ExampleChips({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="tp-examples">
      {items.map((t) => (
        <button key={t} className="tp-example-chip" onClick={() => onPick(t)}>
          {t}
        </button>
      ))}
    </div>
  )
}
