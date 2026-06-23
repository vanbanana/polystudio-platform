import { ReactNode, useEffect, useState } from 'react'
import {
  ThreadListPrimitive,
  ThreadListItemPrimitive,
  useThread,
  useThreadListItem,
  useThreadListItemRuntime,
} from '@assistant-ui/react'
import { Plus, MessageSquare, Trash2, PanelRight, PanelRightClose } from 'lucide-react'
import CourseSidebar from './CourseSidebar'

const ThreadTitle = () => {
  const title = useThreadListItem((s) => s.title)
  return <span className="cz-thread-title">{title || '新会话'}</span>
}

const ThreadItem = () => (
  <ThreadListItemPrimitive.Root className="cz-thread-item">
    <ThreadListItemPrimitive.Trigger className="cz-thread-trigger">
      <MessageSquare size={14} />
      <ThreadTitle />
    </ThreadListItemPrimitive.Trigger>
    <ThreadListItemPrimitive.Delete className="cz-thread-del" aria-label="删除会话">
      <Trash2 size={13} />
    </ThreadListItemPrimitive.Delete>
  </ThreadListItemPrimitive.Root>
)

// 当前 agent 的会话记录块，注入到左侧栏
const HistoryBlock = () => (
  <ThreadListPrimitive.Root className="cz-history">
    <div className="cz-history-head">
      <span className="cz-history-title">会话记录</span>
      <ThreadListPrimitive.New className="cz-newbtn" aria-label="新建会话">
        <Plus size={16} />
      </ThreadListPrimitive.New>
    </div>
    <div className="cz-thread-items">
      <ThreadListPrimitive.Items components={{ ThreadListItem: ThreadItem }} />
    </div>
  </ThreadListPrimitive.Root>
)

// 跟踪当前会话：上报 id（供产出隔离），并用首条用户消息自动命名会话。
function ThreadProbe({ onThread }: { onThread: (id: string) => void }) {
  const id = useThreadListItem((s) => s.id)
  const title = useThreadListItem((s) => s.title)
  const itemRuntime = useThreadListItemRuntime()
  const firstUserText = useThread((s) => {
    const um = s.messages.find((m) => m.role === 'user')
    if (!um) return ''
    return um.content
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
      .trim()
  })

  useEffect(() => {
    onThread(id)
  }, [id, onThread])

  useEffect(() => {
    if (!title && firstUserText) {
      itemRuntime.rename(firstUserText.length > 18 ? firstUserText.slice(0, 18) + '…' : firstUserText)
    }
  }, [title, firstUserText, itemRuntime])

  return null
}

type Props = {
  children: ReactNode
  onThread?: (id: string) => void
  chatTitle?: string
  chatSub?: string
  chatIcon?: ReactNode
  preview?: ReactNode
}

export default function StudioLayout({ children, onThread, chatTitle, chatSub, chatIcon, preview }: Props) {
  // 右侧“生成结果”面板默认隐藏，结果直接出现在对话里；需要时可用顶部按钮展开。
  const [showPreview, setShowPreview] = useState(false)
  const hasPreview = preview !== undefined
  const previewOpen = hasPreview && showPreview
  return (
    <div className="cz-app">
      <CourseSidebar history={<HistoryBlock />} />
      <div className="cz-content">
        <main className={`cz-chat ${previewOpen ? '' : 'solo'}`}>
          {chatTitle && (
            <div className="cz-chat-head">
              {chatIcon && <span className="ic">{chatIcon}</span>}
              <div>
                <div className="cz-chat-title">{chatTitle}</div>
                {chatSub && <div className="cz-chat-sub">{chatSub}</div>}
              </div>
              {hasPreview && (
                <button
                  type="button"
                  className="cz-panel-toggle"
                  onClick={() => setShowPreview((v) => !v)}
                  aria-label={showPreview ? '隐藏结果面板' : '显示结果面板'}
                  title={showPreview ? '隐藏结果面板' : '显示结果面板'}
                >
                  {showPreview ? <PanelRightClose size={18} /> : <PanelRight size={18} />}
                </button>
              )}
            </div>
          )}
          <div className="cz-chat-body">{children}</div>
        </main>
        {previewOpen && <section className="cz-preview">{preview}</section>}
      </div>
      {onThread && <ThreadProbe onThread={onThread} />}
    </div>
  )
}
