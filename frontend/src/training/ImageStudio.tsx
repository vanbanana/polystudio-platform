import { useCallback, useState } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { ImageIcon, X, Download } from 'lucide-react'
import { useAgentRuntime, type MediaItem } from './agentRuntime'
import AgentThread from './AgentThread'
import './studio.css'

const SUGGESTIONS = [
  '一只穿着宇航服的柴犬，漂浮在星空中，电影级光影',
  '国潮风格的新年插画，红金配色，喜庆热闹',
  '赛博朋克城市夜景，霓虹灯雨夜街道',
  '极简主义产品海报，香水放在大理石台面上',
]

const HINT = '你是一个专业的文生图助手，请根据用户描述调用图片生成工具产出高质量图片。'

export default function ImageStudio() {
  const [images, setImages] = useState<MediaItem[]>([])
  const [preview, setPreview] = useState<string | null>(null)

  const onMedia = useCallback((m: MediaItem) => {
    if (m.kind !== 'image') return
    setImages((prev) => (prev.some((p) => p.url === m.url) ? prev : [...prev, m]))
  }, [])

  const runtime = useAgentRuntime({ canvasId: 'tp-image-studio', systemHint: HINT, onMedia })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="tp-studio">
        <div className="tp-studio-panel">
          <div className="tp-studio-head">
            <div className="tp-studio-title">文生图</div>
            <div className="tp-studio-sub">用自然语言描述画面，Agent 自动调用文生图模型生成图片。试着改写提示词，观察出图差异。</div>
          </div>
          <AgentThread
            placeholder="例如：一只穿着宇航服的柴犬，漂浮在星空中…"
            suggestions={SUGGESTIONS}
            emptyTitle="描述你想要的画面"
            emptyHint="Agent 会自动选择图片生成工具。点下方示例快速开始。"
          />
        </div>

        <div className="tp-studio-stage">
          <div className="tp-stage-head">
            <h3>生成结果</h3>
            <span>{images.length} 张</span>
          </div>
          {images.length === 0 ? (
            <div className="tp-stage-empty">
              <ImageIcon size={38} strokeWidth={1.4} />
              <p>还没有作品，在左侧输入提示词开始生成</p>
            </div>
          ) : (
            <div className="tp-gallery">
              {images
                .slice()
                .reverse()
                .map((img) => (
                  <figure key={img.url} className="tp-gallery-item" onClick={() => setPreview(img.url)}>
                    <img src={img.url} alt={img.prompt || ''} loading="lazy" />
                  </figure>
                ))}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="tp-lightbox" onClick={() => setPreview(null)}>
          <button className="tp-lightbox-close">
            <X size={22} />
          </button>
          <img src={preview} alt="" onClick={(e) => e.stopPropagation()} />
          <a className="tp-btn tp-btn-ghost tp-lightbox-dl" href={preview} download onClick={(e) => e.stopPropagation()}>
            <Download size={15} /> 下载
          </a>
        </div>
      )}
    </AssistantRuntimeProvider>
  )
}
