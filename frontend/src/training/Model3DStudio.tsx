import { useCallback, useEffect, useState } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { Boxes } from 'lucide-react'
import Model3DViewer from '../components/Model3DViewer'
import { useAgentRuntime, type ModelItem } from './agentRuntime'
import AgentThread from './AgentThread'
import './studio.css'

const SUGGESTIONS = [
  '一个卡通风格的小房子，带烟囱和小窗户',
  '一把科幻风格的机械手枪',
  '一只可爱的低多边形小狐狸',
  '一个古典风格的花瓶，带雕花纹理',
]

const HINT = '你是一个 3D 资产生成助手，请根据用户描述调用 3D 模型生成工具生成可预览的模型。'

export default function Model3DStudio() {
  const [models, setModels] = useState<ModelItem[]>([])
  const [activeIdx, setActiveIdx] = useState(0)

  const onModel = useCallback((m: ModelItem) => {
    setModels((prev) => (prev.some((p) => p.modelUrl === m.modelUrl) ? prev : [...prev, m]))
  }, [])

  const runtime = useAgentRuntime({ canvasId: 'tp-model3d-studio', systemHint: HINT, onModel })

  useEffect(() => {
    if (models.length > 0) setActiveIdx(models.length - 1)
  }, [models.length])

  const active = models[activeIdx]

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="tp-studio">
        <div className="tp-studio-panel">
          <div className="tp-studio-head">
            <div className="tp-studio-title">3D 资产生成</div>
            <div className="tp-studio-sub">文本驱动生成 3D 模型，右侧可拖拽旋转预览，支持 OBJ / GLB 在线查看。</div>
          </div>
          <AgentThread
            placeholder="描述你想要的 3D 模型，例如：一只低多边形小狐狸…"
            suggestions={SUGGESTIONS}
            emptyTitle="描述你的模型"
            emptyHint="3D 生成通常需要数十秒，左侧会显示 Agent 的工具执行过程。"
          />
        </div>

        <div className="tp-studio-stage">
          <div className="tp-stage-head">
            <h3>3D 预览</h3>
            <span>{models.length} 个模型</span>
          </div>
          {!active ? (
            <div className="tp-stage-empty">
              <Boxes size={38} strokeWidth={1.4} />
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
    </AssistantRuntimeProvider>
  )
}
