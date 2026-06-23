import { FC, createContext, useContext, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ThreadPrimitive, ComposerPrimitive, MessagePrimitive } from '@assistant-ui/react'
import type { TextMessagePartComponent, ToolCallMessagePartComponent, ReasoningMessagePartComponent } from '@assistant-ui/react'
import { ArrowUp, Square, Brain, Check, Sparkle, X, Download, Loader2 } from 'lucide-react'
import ModelThumbnail from './ModelThumbnail'
import './agent-thread.css'

const LightboxContext = createContext<(url: string) => void>(() => {})
const useLightbox = () => useContext(LightboxContext)

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

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

const Dots: FC = () => (
  <span className="at-dots" aria-hidden>
    <i />
    <i />
    <i />
  </span>
)

const ReasoningPart: ReasoningMessagePartComponent = ({ text }) => (
  <div className="at-reasoning">
    <Brain size={13} className="at-reasoning-icon" /> <span>{text}</span>
  </div>
)

// 把工具产出的媒体（图/视频/音频/3D 预览）直接渲染进对话气泡，居中显示，点击图片放大。
const ToolMedia: FC<{ result: unknown }> = ({ result }) => {
  const openLightbox = useLightbox()
  const obj = typeof result === 'string' ? safeParse(result) : result
  if (!obj || typeof obj !== 'object') return null
  const r = obj as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null)
  const imageUrl = str(r.image_url)
  const videoUrl = str(r.video_url) || str(r.video_path)
  const audioUrl = str(r.audio_url)
  const modelUrl = str(r.model_url)
  const modelFormat = (str(r.format) || 'glb') as 'obj' | 'glb'
  const mtlUrl = str(r.mtl_url) || undefined
  const prompt = str(r.prompt) || undefined
  if (!imageUrl && !videoUrl && !audioUrl && !modelUrl) return null

  return (
    <div className="at-media">
      {imageUrl && (
        <figure className="at-media-fig">
          <img src={imageUrl} alt={prompt || ''} loading="lazy" onClick={() => openLightbox(imageUrl)} />
          {prompt && <figcaption>{prompt}</figcaption>}
        </figure>
      )}
      {videoUrl && (
        <figure className="at-media-fig">
          <video src={videoUrl} controls preload="metadata" />
          {prompt && <figcaption>{prompt}</figcaption>}
        </figure>
      )}
      {audioUrl && (
        <figure className="at-media-fig at-media-audio">
          <audio src={audioUrl} controls />
          {prompt && <figcaption>{prompt}</figcaption>}
        </figure>
      )}
      {modelUrl && (
        <figure className="at-media-fig">
          <ModelThumbnail modelUrl={modelUrl} format={modelFormat} mtlUrl={mtlUrl} />
          {prompt && <figcaption className="at-model-thumb-cap">{prompt}</figcaption>}
          <figcaption>
            3D 模型 ·{' '}
            <a href={modelUrl} target="_blank" rel="noreferrer">
              下载模型
            </a>
          </figcaption>
        </figure>
      )}
    </div>
  )
}

const ToolFallback: ToolCallMessagePartComponent = ({ toolName, argsText, result, status }) => {
  const done = status?.type === 'complete' || result !== undefined
  const label = TOOL_LABELS[toolName] || toolName
  const hasArgs = Boolean(argsText && argsText !== '{}')
  // 执行中默认展开，让用户看到完整的工具调用参数；完成后允许折叠。
  const [open, setOpen] = useState(true)
  return (
    <div className="at-tool-wrap">
      <details
        className={`at-tool ${done ? 'done' : 'running'}`}
        open={open}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>
          <span className={`at-tool-icon ${done ? 'done' : 'running'}`}>
            {done ? <Check size={13} /> : <Loader2 size={13} className="at-spin" />}
          </span>
          <span className="at-tool-name">{label}</span>
          <span className={`at-tool-status ${done ? '' : 'running'}`}>
            {done ? '完成' : (
              <>
                调用中<Dots />
              </>
            )}
          </span>
        </summary>
        {hasArgs && (
          <div className="at-tool-body">
            <div className="at-tool-arglabel">调用参数</div>
            <pre className="at-tool-pre">{argsText}</pre>
          </div>
        )}
      </details>
      <ToolMedia result={result} />
    </div>
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
      {/* 首个内容到达前（真实生成 8–90s）显示思考加载态，避免界面看起来卡住 */}
      <ThreadPrimitive.If running>
        <MessagePrimitive.If last hasContent={false}>
          <div className="at-thinking">
            <Brain size={14} className="at-thinking-icon" />
            <span>Agent 正在思考</span>
            <Dots />
          </div>
        </MessagePrimitive.If>
      </ThreadPrimitive.If>
    </div>
  </MessagePrimitive.Root>
)

type Props = {
  placeholder?: string
  suggestions?: string[]
  emptyTitle?: string
  emptyHint?: string
  centered?: boolean
  modelLabel?: string
}

export default function AgentThread({ placeholder, suggestions = [], emptyTitle, emptyHint, centered, modelLabel = '全能 Agent' }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  return (
    <LightboxContext.Provider value={setLightbox}>
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
        <ComposerPrimitive.Input
          className="at-input"
          placeholder={placeholder || '描述你的需求，Agent 会自动调用工具…'}
          rows={1}
          autoFocus
        />
        <div className="at-composer-bar">
          <span className="at-model">
            <Sparkle size={13} />
            {modelLabel}
          </span>
          <span className="at-composer-hint">Enter 发送 · Shift+Enter 换行</span>
          <ThreadPrimitive.If running={false}>
            <ComposerPrimitive.Send className="at-send" aria-label="发送">
              <ArrowUp size={18} />
            </ComposerPrimitive.Send>
          </ThreadPrimitive.If>
          <ThreadPrimitive.If running>
            <ComposerPrimitive.Cancel className="at-send at-cancel" aria-label="停止">
              <Square size={15} fill="currentColor" />
            </ComposerPrimitive.Cancel>
          </ThreadPrimitive.If>
        </div>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>

    {lightbox && (
      <div className="tp-lightbox" onClick={() => setLightbox(null)}>
        <button className="tp-lightbox-close" aria-label="关闭">
          <X size={22} />
        </button>
        <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
        <a className="tp-btn tp-btn-ghost tp-lightbox-dl" href={lightbox} download onClick={(e) => e.stopPropagation()}>
          <Download size={15} /> 下载
        </a>
      </div>
    )}
    </LightboxContext.Provider>
  )
}
