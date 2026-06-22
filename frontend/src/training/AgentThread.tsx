import { FC } from 'react'
import ReactMarkdown from 'react-markdown'
import { ThreadPrimitive, ComposerPrimitive, MessagePrimitive } from '@assistant-ui/react'
import type { TextMessagePartComponent, ToolCallMessagePartComponent, ReasoningMessagePartComponent } from '@assistant-ui/react'
import { ArrowUp, Square, Brain, Wrench, Check } from 'lucide-react'
import './agent-thread.css'

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
  select_bgm: '匹配背景音乐',
  mix_audio_with_bgm: '混音',
  qwen_omni_understand: '多模态理解',
}

const TextPart: TextMessagePartComponent = ({ text }) => (
  <div className="at-md">
    <ReactMarkdown>{text}</ReactMarkdown>
  </div>
)

const ReasoningPart: ReasoningMessagePartComponent = ({ text }) => (
  <div className="at-reasoning">
    <Brain size={13} /> {text}
  </div>
)

const ToolFallback: ToolCallMessagePartComponent = ({ toolName, argsText, result, status }) => {
  const done = status?.type === 'complete' || result !== undefined
  const label = TOOL_LABELS[toolName] || toolName
  return (
    <details className="at-tool">
      <summary>
        <span className={`at-tool-icon ${done ? 'done' : ''}`}>{done ? <Check size={13} /> : <Wrench size={13} />}</span>
        <span className="at-tool-name">{label}</span>
        <span className="at-tool-status">{done ? '完成' : '执行中…'}</span>
      </summary>
      {argsText && argsText !== '{}' && (
        <pre className="at-tool-pre">{argsText}</pre>
      )}
    </details>
  )
}

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="at-msg at-msg-user">
    <div className="at-bubble">
      <MessagePrimitive.Parts />
    </div>
  </MessagePrimitive.Root>
)

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root className="at-msg at-msg-assistant">
    <div className="at-content">
      <MessagePrimitive.Parts
        components={{ Text: TextPart, Reasoning: ReasoningPart, tools: { Fallback: ToolFallback } }}
      />
    </div>
  </MessagePrimitive.Root>
)

type Props = {
  placeholder?: string
  suggestions?: string[]
  emptyTitle?: string
  emptyHint?: string
  centered?: boolean
}

export default function AgentThread({ placeholder, suggestions = [], emptyTitle, emptyHint, centered }: Props) {
  return (
    <ThreadPrimitive.Root className={`at-root ${centered ? 'centered' : ''}`}>
      <ThreadPrimitive.Viewport className="at-viewport">
        <ThreadPrimitive.Empty>
          <div className="at-empty">
            {emptyTitle && <h2>{emptyTitle}</h2>}
            {emptyHint && <p>{emptyHint}</p>}
            {suggestions.length > 0 && (
              <div className="at-suggestions">
                {suggestions.map((s) => (
                  <ThreadPrimitive.Suggestion key={s} prompt={s} method="replace" autoSend className="at-suggestion">
                    {s}
                  </ThreadPrimitive.Suggestion>
                ))}
              </div>
            )}
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />

        <div className="at-viewport-spacer" />
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Root className="at-composer">
        <ComposerPrimitive.Input className="at-input" placeholder={placeholder || '描述你的需求，Agent 会自动调用工具…'} rows={3} />
        <div className="at-composer-bar">
          <span className="at-composer-hint">Enter 发送 · Shift+Enter 换行</span>
          <ThreadPrimitive.If running={false}>
            <ComposerPrimitive.Send className="at-send">
              <ArrowUp size={17} />
            </ComposerPrimitive.Send>
          </ThreadPrimitive.If>
          <ThreadPrimitive.If running>
            <ComposerPrimitive.Cancel className="at-send at-cancel">
              <Square size={15} />
            </ComposerPrimitive.Cancel>
          </ThreadPrimitive.If>
        </div>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  )
}
