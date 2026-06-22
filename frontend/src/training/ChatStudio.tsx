import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { MessageSquare } from 'lucide-react'
import { useAgentChat } from './useAgentChat'
import { Composer } from './parts'
import './studio.css'

const SUGGEST = [
  '用通俗的话解释什么是多模态大模型',
  '帮我写一段 Python 读取 CSV 并画折线图的代码',
  '私有化部署 Qwen3 大致需要什么硬件？',
  '给我三个适合短视频的选题方向',
]

export default function ChatStudio() {
  const { messages, isLoading, send, stop } = useAgentChat('tp-chat-studio')
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim()
    if (!value) return
    send(value)
    setInput('')
  }

  const visible = messages.filter((m) => m.content.trim())

  return (
    <div className="tp-chat">
      <div className="tp-chat-scroll" ref={scrollRef}>
        {visible.length === 0 ? (
          <div className="tp-chat-empty">
            <MessageSquare size={40} />
            <h2>Qwen3 在线对话</h2>
            <p style={{ color: 'var(--tp-text-soft)' }}>体验全模态对话能力，可对接本地私有化部署的 Qwen3。</p>
            <div className="tp-chat-suggest">
              {SUGGEST.map((s) => (
                <button key={s} onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          visible.map((m, i) => (
            <div key={i} className={`tp-chat-msg ${m.role}`}>
              <div className={`tp-chat-avatar ${m.role}`}>{m.role === 'assistant' ? 'AI' : '我'}</div>
              <div className="tp-chat-bubble">
                {m.role === 'assistant' ? (
                  <div className="tp-md">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="tp-chat-composer">
        <Composer
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          onStop={stop}
          loading={isLoading}
          placeholder='给 Qwen3 发消息…'
        />
      </div>
    </div>
  )
}
