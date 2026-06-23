import { useEffect, useState } from 'react'
import ChatInterface from './components/ChatInterface'
import { NavProvider, type TrainingView } from './training/nav'
import SettingsStudio from './training/SettingsStudio'
import TrainingHome from './training/TrainingHome'
import ImageStudio from './training/ImageStudio'
import Model3DStudio from './training/Model3DStudio'
import VideoStudio from './training/VideoStudio'
import PodcastStudio from './training/PodcastStudio'
import ChatStudio from './training/ChatStudio'
import './training/theme.css'
import './training/coze.css'
import './App.css'

type ThemeMode = 'dark' | 'light'

function getParam(name: string) {
  try {
    return new URL(window.location.href).searchParams.get(name) || ''
  } catch {
    return ''
  }
}

function readInitialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem('polystudio:theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // ignore
  }
  return 'dark'
}

const VALID_VIEWS: TrainingView[] = ['home', 'image', 'model3d', 'video', 'podcast', 'chat']

function App() {
  const [canvasId, setCanvasId] = useState<string>(() => getParam('canvasId'))
  const [page, setPage] = useState<string>(() => getParam('page'))
  const [view, setView] = useState<string>(() => getParam('view'))
  const [theme, setTheme] = useState<ThemeMode>(() => readInitialTheme())

  useEffect(() => {
    const onPop = () => {
      setCanvasId(getParam('canvasId'))
      setPage(getParam('page'))
      setView(getParam('view'))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    try {
      document.documentElement.dataset.theme = theme
      localStorage.setItem('polystudio:theme', theme)
    } catch {
      // ignore
    }
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const navigateView = (next: TrainingView) => {
    const url = new URL(window.location.href)
    url.searchParams.delete('canvasId')
    url.searchParams.delete('page')
    if (next === 'home') url.searchParams.delete('view')
    else url.searchParams.set('view', next)
    window.history.pushState({}, '', url.toString())
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const openSettings = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('canvasId')
    url.searchParams.delete('view')
    url.searchParams.set('page', 'settings')
    window.history.pushState({}, '', url.toString())
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // 经典完整画布（保留可达，通过 canvasId 链接进入）
  if (canvasId) {
    return (
      <div className="app">
        <ChatInterface initialCanvasId={canvasId} theme={theme} onToggleTheme={toggleTheme} onSetTheme={setTheme} />
      </div>
    )
  }

  const activeView = (VALID_VIEWS.includes(view as TrainingView) ? view : 'home') as TrainingView

  const isSettings = page === 'settings'

  const renderStudio = () => {
    switch (activeView) {
      case 'image':
        return <ImageStudio />
      case 'model3d':
        return <Model3DStudio />
      case 'video':
        return <VideoStudio />
      case 'podcast':
        return <PodcastStudio />
      case 'chat':
        return <ChatStudio />
      default:
        return <TrainingHome />
    }
  }

  return (
    <div className="app">
      <div className="tp">
        <NavProvider
          value={{
            active: activeView,
            theme,
            navigate: navigateView,
            toggleTheme,
            openSettings,
          }}
        >
          {isSettings ? <SettingsStudio /> : renderStudio()}
        </NavProvider>
      </div>
    </div>
  )
}

export default App
