import { ReactNode } from 'react'
import { Sparkles, Sun, Moon, Settings } from 'lucide-react'
import './theme.css'

export type TrainingView = 'home' | 'image' | 'model3d' | 'video' | 'podcast' | 'chat'

const NAV: { key: TrainingView; label: string }[] = [
  { key: 'home', label: '课程首页' },
  { key: 'image', label: '文生图' },
  { key: 'model3d', label: '3D 生成' },
  { key: 'video', label: '短视频' },
  { key: 'podcast', label: '播客' },
  { key: 'chat', label: 'Qwen3 对话' },
]

type Props = {
  active: TrainingView
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onNavigate: (view: TrainingView) => void
  onOpenSettings: () => void
  children: ReactNode
}

export default function StudioShell({ active, theme, onToggleTheme, onNavigate, onOpenSettings, children }: Props) {
  return (
    <div className="tp">
      <nav className="tp-nav">
        <div className="tp-brand" onClick={() => onNavigate('home')}>
          <span className="tp-brand-mark">
            <Sparkles size={17} />
          </span>
          PolyStudio 实训平台
        </div>
        <div className="tp-nav-links">
          {NAV.map((item) => (
            <button
              key={item.key}
              className={`tp-nav-link ${active === item.key ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="tp-nav-spacer" />
        <button className="tp-icon-btn" title="设置" onClick={onOpenSettings}>
          <Settings size={18} />
        </button>
        <button className="tp-icon-btn" title="切换主题" onClick={onToggleTheme} style={{ marginLeft: 8 }}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>
      {children}
    </div>
  )
}
