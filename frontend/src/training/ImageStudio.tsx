import { useState } from 'react'
import { ImageIcon, X, Download } from 'lucide-react'
import { useAgentChat } from './useAgentChat'
import { AgentActivity, Composer, ExampleChips } from './parts'
import './studio.css'

const EXAMPLES = [
  '一只穿着宇航服的柴犬，漂浮在星空中，电影级光影，超写实',
  '国潮风格的新年插画，红金配色，喜庆热闹，扁平矢量',
  '赛博朋克城市夜景，霓虹灯雨夜街道，4K 高清',
  '极简主义产品海报，一瓶香水放在大理石台面上，柔和自然光',
]

const HINT = '你是一个专业的文生图助手，请根据用户描述调用图片生成工具产出高质量图片。'

export default function ImageStudio() {
  const { messages, images, isLoading, send, stop } = useAgentChat('tp-image-studio')
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const handleSend = () => {
    if (!input.trim()) return
    send(input, { systemHint: HINT })
    setInput('')
  }

  return (
    <div className="tp-studio">
      <div className="tp-studio-panel">
        <div className="tp-studio-head">
          <div className="tp-studio-title">文生图 Agent</div>
          <div className="tp-studio-sub">
            用自然语言描述画面，Agent 自动调用文生图模型生成图片。试着改写提示词，观察出图差异。
          </div>
        </div>

        <div className="tp-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={stop}
            loading={isLoading}
            placeholder='例如：一只穿着宇航服的柴犬，漂浮在星空中…'
          />
          <div>
            <span className="tp-label">提示词示例</span>
            <ExampleChips items={EXAMPLES} onPick={(v) => setInput(v)} />
          </div>
        </div>

        <div className="tp-card">
          <span className="tp-label">Agent 执行过程</span>
          <AgentActivity messages={messages} emptyHint="发送提示词后，这里会显示 Agent 的工具调用过程。" />
        </div>
      </div>

      <div className="tp-studio-stage">
        <div className="tp-stage-head">
          <h3>生成结果</h3>
          <span>{images.length} 张</span>
        </div>
        {images.length === 0 ? (
          <div className="tp-stage-empty">
            <ImageIcon size={42} />
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
    </div>
  )
}
