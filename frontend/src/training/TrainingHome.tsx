import { ArrowRight, ImageIcon, Boxes, Film, Mic, MessageSquare, Bot } from 'lucide-react'
import { TrainingView } from './StudioShell'
import './TrainingHome.css'

type Props = {
  onEnter: (view: TrainingView) => void
}

const PROJECTS: {
  view: TrainingView | null
  chapter: string
  title: string
  desc: string
  tags: string[]
  icon: typeof ImageIcon
  ready: boolean
}[] = [
  {
    view: 'image',
    chapter: '第二章',
    title: '文生图 Agent',
    desc: '用自然语言驱动 Agent 调用文生图模型，理解提示词工程与工具调用，体验商业级生图工作台。',
    tags: ['提示词工程', '工具调用', 'Seedream / Qwen-Image'],
    icon: ImageIcon,
    ready: true,
  },
  {
    view: 'model3d',
    chapter: '第三章',
    title: '智能 3D 资产生成 Agent',
    desc: '文本或图片驱动生成 3D 模型，在线预览 OBJ / GLB，理解文生 3D 与空间内容创作的工具接入。',
    tags: ['文生 3D', '图生 3D', '腾讯混元 3D'],
    icon: Boxes,
    ready: true,
  },
  {
    view: 'video',
    chapter: '第四章',
    title: '短视频创作 Agent',
    desc: '从创意到分镜再到成片，体验多模态串联编排，理解 Agent 如何把多步工具组织成一条创作流水线。',
    tags: ['多步编排', '图生视频', '分镜画布'],
    icon: Film,
    ready: true,
  },
  {
    view: 'podcast',
    chapter: '第六章',
    title: '智能播客 Agent',
    desc: '脚本创作 → 音色设计 → 语音合成 → 混音输出，学习语音合成与音频内容生成的完整工作流。',
    tags: ['Qwen-TTS', '音色设计', '音频混音'],
    icon: Mic,
    ready: true,
  },
  {
    view: 'chat',
    chapter: '第九章',
    title: 'Qwen3 本地化对话',
    desc: '以在线 AI 网站的形态对话，理解原生全模态 Agent 与开源模型私有化部署的应用开发。',
    tags: ['私有化部署', 'vLLM', '全模态对话'],
    icon: MessageSquare,
    ready: true,
  },
  {
    view: null,
    chapter: '第五章',
    title: '虚拟主播生成系统',
    desc: '基于 ComfyUI + InfiniteTalk 的口型同步数字人。需本地 GPU 与工作流配置，本期实训暂未开放。',
    tags: ['ComfyUI', '数字人'],
    icon: Bot,
    ready: false,
  },
]

const POINTS = [
  { no: '01', title: '看得懂', desc: '完整的参考实现作为标准答案，配套讲义拆解 Agent 架构与编排逻辑。' },
  { no: '02', title: '改得动', desc: '在现成工程上做有梯度的动手任务：换模型、加工具、调编排、写 Skill。' },
  { no: '03', title: '能落地', desc: '覆盖云 API 接入与开源模型私有化部署，对接真实多模态 Agent 开发岗位。' },
]

export default function TrainingHome({ onEnter }: Props) {
  return (
    <div className="tp-home">
      <header className="tp-hero">
        <div className="tp-kicker">企业级实训课程</div>
        <h1 className="tp-hero-title">多模态智能体开发实训平台</h1>
        <p className="tp-hero-desc">
          以多模态融合为核心、Agent 自主决策为目标、实战落地为导向。在一个真实可运行的多模态 Agent
          工程上，逐个项目动手实训，掌握从工具调用、多模态编排到工程化部署的核心技能。
        </p>
        <div className="tp-hero-actions">
          <button className="tp-btn tp-btn-primary" onClick={() => onEnter('image')}>
            开始第一个项目 <ArrowRight size={16} />
          </button>
          <button className="tp-btn tp-btn-ghost" onClick={() => onEnter('chat')}>
            体验 Qwen3 对话
          </button>
        </div>
        <dl className="tp-hero-stats">
          <div>
            <dt>7</dt>
            <dd>实训项目</dd>
          </div>
          <div>
            <dt>5</dt>
            <dd>多模态能力</dd>
          </div>
          <div>
            <dt>1</dt>
            <dd>统一 Agent 内核</dd>
          </div>
        </dl>
      </header>

      <section className="tp-section">
        <div className="tp-section-head">
          <h2>为什么这样学</h2>
          <p>平台已搭好，学生不是“用户”而是“开发学徒”——在标准答案上拆解与改造。</p>
        </div>
        <div className="tp-points">
          {POINTS.map((p) => (
            <div className="tp-point" key={p.no}>
              <span className="tp-point-no">{p.no}</span>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="tp-section">
        <div className="tp-section-head">
          <h2>实训项目</h2>
          <p>每个项目对应一章课程，点击进入对应的专门工作台。</p>
        </div>
        <ol className="tp-syllabus">
          {PROJECTS.map((p) => (
            <li key={p.title}>
              <button
                className={`tp-row ${p.ready ? '' : 'disabled'}`}
                onClick={() => p.ready && p.view && onEnter(p.view)}
                disabled={!p.ready}
              >
                <span className="tp-row-chapter">{p.chapter}</span>
                <div className="tp-row-main">
                  <div className="tp-row-titleline">
                    <p.icon size={17} strokeWidth={1.8} />
                    <h3>{p.title}</h3>
                    {!p.ready && <span className="tp-row-flag">即将上线</span>}
                  </div>
                  <p className="tp-row-desc">{p.desc}</p>
                  <div className="tp-row-tags">
                    {p.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
                {p.ready && (
                  <span className="tp-row-go">
                    <ArrowRight size={18} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      </section>

      <footer className="tp-foot">
        多模态智能体开发实训平台 · 共用同一个全能多模态 Agent 内核，按能力拆分为独立教学工作台
      </footer>
    </div>
  )
}
