import { useEffect, useState } from 'react'
import { Boxes } from 'lucide-react'
import Model3DViewer from '../components/Model3DViewer'
import { useAgentChat } from './useAgentChat'
import { AgentActivity, Composer, ExampleChips } from './parts'
import './studio.css'

const EXAMPLES = [
  '一个卡通风格的小房子，带烟囱和小窗户',
  '一把科幻风格的机械手枪',
  '一只可爱的低多边形小狐狸',
  '一个古典风格的花瓶，带雕花纹理',
]

const HINT = '你是一个 3D 资产生成助手，请根据用户描述调用 3D 模型生成工具生成可预览的模型。'

export default function Model3DStudio() {
  const { messages, models, isLoading, send, stop } = useAgentChat('tp-model3d-studio')
  const [input, setInput] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    if (models.length > 0) setActiveIdx(models.length - 1)
  }, [models.length])

  const handleSend = () => {
    if (!input.trim()) return
    send(input, { systemHint: HINT })
    setInput('')
  }

  const active = models[activeIdx]

  return (
    <div className="tp-studio">
      <div className="tp-studio-panel">
        <div className="tp-studio-head">
          <div className="tp-studio-title">3D 资产生成 Agent</div>
          <div className="tp-studio-sub">
            文本驱动生成 3D 模型，右侧可拖拽旋转预览。生成后支持 OBJ / GLB 在线查看。
          </div>
        </div>

        <div className="tp-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={stop}
            loading={isLoading}
            placeholder='描述你想要的 3D 模型，例如：一只低多边形小狐狸…'
          />
          <div>
            <span className="tp-label">示例</span>
            <ExampleChips items={EXAMPLES} onPick={(v) => setInput(v)} />
          </div>
        </div>

        <div className="tp-card">
          <span className="tp-label">Agent 执行过程</span>
          <AgentActivity messages={messages} emptyHint="3D 生成通常需要数十秒，请耐心等待工具执行完成。" />
        </div>
      </div>

      <div className="tp-studio-stage">
        <div className="tp-stage-head">
          <h3>3D 预览</h3>
          <span>{models.length} 个模型</span>
        </div>
        {!active ? (
          <div className="tp-stage-empty">
            <Boxes size={42} />
            <p>还没有模型，在左侧描述并生成</p>
          </div>
        ) : (
          <>
            <div className="tp-model-stage">
              <Model3DViewer
                key={active.modelUrl}
                modelUrl={active.modelUrl}
                format={active.format}
                mtlUrl={active.mtlUrl}
                textureUrl={active.textureUrl}
              />
            </div>
            {models.length > 1 && (
              <div className="tp-model-thumbs">
                {models.map((m, i) => (
                  <button
                    key={m.modelUrl}
                    className={`tp-model-thumb ${i === activeIdx ? 'active' : ''}`}
                    onClick={() => setActiveIdx(i)}
                  >
                    模型 {i + 1} · {m.format.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
