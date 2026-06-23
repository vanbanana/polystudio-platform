import { useCallback, useState } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { ImageIcon, X, Download } from 'lucide-react'
import { useAgentRuntime, type MediaItem } from './agentRuntime'
import { useThreadScoped } from './threadScope'
import StudioLayout from './StudioLayout'
import AgentThread from './AgentThread'
import { AGENT_BY_VIEW } from './nav'
import './studio.css'

const AGENT = AGENT_BY_VIEW.image

const SUGGESTIONS = [
  '一只穿着宇航服的柴犬，漂浮在星空中，电影级光影',
  '国潮风格的新年插画，红金配色，喜庆热闹',
  '赛博朋克城市夜景，霓虹灯雨夜街道',
  '极简主义产品海报，香水放在大理石台面上',
]

const HINT = '你是一个专业的文生图助手，请根据用户描述调用图片生成工具产出高质量图片。'
const keyOfMedia = (m: MediaItem) => m.url

export default function ImageStudio() {
  const [preview, setPreview] = useState<string | null>(null)
  const { items: images, add, setActive } = useThreadScoped<MediaItem>(keyOfMedia)

  const onMedia = useCallback(
    (m: MediaItem) => {
      if (m.kind !== 'image') return
      add(m)
    },
    [add],
  )

  const runtime = useAgentRuntime({ canvasId: 'tp-image-studio', systemHint: HINT, onMedia })

  const gallery = (
    <>
      <div className="cz-preview-head">
        <h3>生成结果</h3>
        <span className="count">{images.length} 张</span>
      </div>
      <div className="cz-preview-body">
        {images.length === 0 ? (
          <div className="tp-stage-empty">
            <ImageIcon size={38} strokeWidth={1.4} />
            <p>还没有作品，在左侧对话里输入提示词开始生成</p>
          </div>
        ) : (
          <div className="tp-gallery">
            {images
              .slice()
              .reverse()
              .map((img) => (
                <figure key={img.url} className="tp-gallery-item" onClick={() => setPreview(img.url)}>
                  <img src={img.url} alt={img.prompt || ''} loading="lazy" />
                  {img.prompt && <figcaption>{img.prompt}</figcaption>}
                </figure>
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
        chatTitle="文生图 Agent"
        chatSub="用自然语言描述画面，Agent 自动调用文生图模型"
        chatIcon={<ImageIcon size={17} />}
        preview={gallery}
      >
        <AgentThread
          placeholder="例如：一只穿着宇航服的柴犬，漂浮在星空中…"
          suggestions={SUGGESTIONS}
          emptyTitle="描述你想要的画面"
          emptyHint="Agent 会自动选择图片生成工具。点下方示例快速开始。"
          modelLabel="文生图 · Agent"
          agentName={AGENT.name}
          agentIcon={AGENT.icon}
          agentColor={AGENT.color}
        />
      </StudioLayout>

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
