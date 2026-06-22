import { ReactNode } from 'react'
import { Home, Settings, Sun, Moon } from 'lucide-react'
import { AGENTS, useNav } from './nav'

// 左侧 agent 切换栏。history：当前 agent 的会话记录（由具体 studio 注入）。
export default function CourseSidebar({ history }: { history?: ReactNode }) {
  const { active, theme, navigate, toggleTheme, openSettings } = useNav()

  return (
    <aside className="cz-sidebar">
      <div className="cz-side-label">智能体</div>
      <div className="cz-agents">
        {AGENTS.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.view}
              className={`cz-agent ${active === a.view ? 'active' : ''}`}
              onClick={() => navigate(a.view)}
            >
              <span className="cz-agent-avatar">
                <Icon size={18} />
              </span>
              <span className="cz-agent-text">
                <span className="cz-agent-name">{a.name}</span>
                <span className="cz-agent-sub">{a.sub}</span>
              </span>
            </button>
          )
        })}
      </div>

      {history}

      <div className="cz-side-spacer" />

      <div className="cz-side-foot">
        <button className="cz-foot-btn" onClick={() => navigate('home')} title="课程首页">
          <Home size={17} />
        </button>
        <button className="cz-foot-btn" onClick={openSettings} title="设置">
          <Settings size={17} />
        </button>
        <button className="cz-foot-btn" onClick={toggleTheme} title="切换主题">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </aside>
  )
}
