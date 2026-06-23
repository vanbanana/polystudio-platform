import { createContext, useContext, ReactNode } from 'react'
import { Image as ImageIcon, Boxes, Film, Mic, MessageSquare, type LucideIcon } from 'lucide-react'

export type TrainingView = 'home' | 'image' | 'model3d' | 'video' | 'podcast' | 'chat'

export type AgentMeta = {
  view: Exclude<TrainingView, 'home'>
  name: string
  sub: string
  icon: LucideIcon
  color: string
}

// 左侧栏的「agent 列表」：每个工作台 = 一个 agent（color 用于对话头像配色）
export const AGENTS: AgentMeta[] = [
  { view: 'image', name: '文生图 Agent', sub: '文本生成图像 · 提示词工程', icon: ImageIcon, color: '#e8590c' },
  { view: 'model3d', name: '3D 资产 Agent', sub: '文本 / 图片生成 3D 模型', icon: Boxes, color: '#7048e8' },
  { view: 'video', name: '短视频 Agent', sub: '分镜到成片 · 多步编排', icon: Film, color: '#0c8599' },
  { view: 'podcast', name: '播客 Agent', sub: '脚本到语音 · 音频合成', icon: Mic, color: '#e64980' },
  { view: 'chat', name: 'Qwen3 Agent', sub: '本地化全模态对话', icon: MessageSquare, color: '#2f9e44' },
]

export const AGENT_BY_VIEW = Object.fromEntries(
  AGENTS.map((a) => [a.view, a]),
) as Record<AgentMeta['view'], AgentMeta>

type NavCtx = {
  active: TrainingView
  theme: 'dark' | 'light'
  navigate: (v: TrainingView) => void
  toggleTheme: () => void
  openSettings: () => void
}

const Ctx = createContext<NavCtx | null>(null)

export function NavProvider({ value, children }: { value: NavCtx; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNav(): NavCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNav must be used within NavProvider')
  return v
}
