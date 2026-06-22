import { useCallback, useMemo, useRef, useState } from 'react'

// 复用后端同一个全能 Agent 的 SSE 接口（POST /api/chat）。
// 各教学界面共用这个 hook，只是在 UI 层做不同的聚焦展示。

export type ToolStatus = 'executing' | 'done' | 'error'

export interface AgentToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  status: ToolStatus
  result?: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  modelUrl?: string
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls: AgentToolCall[]
  skillMatched?: string
}

export type MediaKind = 'image' | 'video' | 'audio'

export interface MediaItem {
  kind: MediaKind
  url: string
  prompt?: string
  createdAt: number
}

export interface ModelItem {
  modelUrl: string
  previewUrl?: string
  format: 'obj' | 'glb'
  mtlUrl?: string
  textureUrl?: string
  prompt?: string
  createdAt: number
}

interface SendOptions {
  // 附加到模型的隐藏上下文（不展示给用户），用于让某个界面更聚焦某类工具
  systemHint?: string
}

function safeParse(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function useAgentChat(canvasId?: string) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [models, setModels] = useState<ModelItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const pushMedia = useCallback((kind: MediaKind, url: string, prompt?: string) => {
    setMedia((prev) => {
      if (prev.some((m) => m.url === url)) return prev
      return [...prev, { kind, url, prompt, createdAt: Date.now() }]
    })
  }, [])

  const pushModel = useCallback((item: ModelItem) => {
    setModels((prev) => {
      if (prev.some((m) => m.modelUrl === item.modelUrl)) return prev
      return [...prev, item]
    })
  }, [])

  const reset = useCallback(() => {
    setMessages([])
    setMedia([])
    setModels([])
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
  }, [])

  const send = useCallback(
    async (text: string, options: SendOptions = {}) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const userMessage: AgentMessage = { role: 'user', content: trimmed, toolCalls: [] }

      // 构建发给模型的历史（纯文本 + 已生成媒体 URL 作为上下文）
      const history = messages.map((msg) => {
        let content = msg.content || ''
        const imageUrls = msg.toolCalls.map((tc) => tc.imageUrl).filter(Boolean) as string[]
        if (imageUrls.length) content += `\n\nGenerated Image:\n${imageUrls.map((u) => `- ${u}`).join('\n')}`
        const audioUrls = msg.toolCalls.map((tc) => tc.audioUrl).filter(Boolean) as string[]
        if (audioUrls.length) content += `\n\nGenerated Audio:\n${audioUrls.map((u) => `- ${u}`).join('\n')}`
        return { role: msg.role, content }
      })

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      const controller = new AbortController()
      abortRef.current = controller

      const messageToSend = options.systemHint ? `${options.systemHint}\n\n${trimmed}` : trimmed

      const appendDelta = (delta: string) => {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last && last.role === 'assistant' && last.toolCalls.length === 0) {
            next[next.length - 1] = { ...last, content: last.content + delta }
            return next
          }
          next.push({ role: 'assistant', content: delta, toolCalls: [] })
          return next
        })
      }

      const appendToolCall = (tc: AgentToolCall) => {
        setMessages((prev) => [...prev, { role: 'assistant', content: '', toolCalls: [tc] }])
      }

      const updateToolCall = (id: string, updater: (tc: AgentToolCall) => AgentToolCall) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.toolCalls.some((tc) => tc.id === id)
              ? { ...m, toolCalls: m.toolCalls.map((tc) => (tc.id === id ? updater(tc) : tc)) }
              : m,
          ),
        )
      }

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            message: messageToSend,
            messages: history,
            canvas_id: canvasId || undefined,
          }),
          signal: controller.signal,
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const reader = response.body?.getReader()
        if (!reader) throw new Error('无法读取响应流')
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]' || data === '') continue
            const event = safeParse(data)
            if (!event) continue

            switch (event.type) {
              case 'delta':
                if (event.content) appendDelta(event.content)
                break
              case 'skill_matched':
                setMessages((prev) => [...prev, { role: 'assistant', content: '', toolCalls: [], skillMatched: event.skill_name }])
                break
              case 'tool_call':
                appendToolCall({
                  id: event.id,
                  name: event.name,
                  arguments: event.arguments || {},
                  status: 'executing',
                })
                break
              case 'tool_result': {
                const result = safeParse(event.content) || {}
                const imageUrl = typeof result.image_url === 'string' ? result.image_url : undefined
                const videoUrl = (result.video_url || result.video_path) as string | undefined
                const audioUrl = typeof result.audio_url === 'string' ? result.audio_url : undefined
                const modelUrl = typeof result.model_url === 'string' ? result.model_url : undefined
                if (imageUrl) pushMedia('image', imageUrl, result.prompt)
                if (videoUrl) pushMedia('video', videoUrl, result.prompt)
                if (audioUrl) pushMedia('audio', audioUrl, result.prompt)
                if (modelUrl)
                  pushModel({
                    modelUrl,
                    previewUrl: typeof result.preview_url === 'string' ? result.preview_url : undefined,
                    format: (result.format || 'obj') as 'obj' | 'glb',
                    mtlUrl: typeof result.mtl_url === 'string' ? result.mtl_url : undefined,
                    textureUrl: typeof result.texture_url === 'string' ? result.texture_url : undefined,
                    prompt: result.prompt,
                    createdAt: Date.now(),
                  })
                updateToolCall(event.tool_call_id, (tc) => ({
                  ...tc,
                  status: 'done',
                  result: event.content,
                  imageUrl,
                  videoUrl,
                  audioUrl,
                  modelUrl,
                }))
                break
              }
              case 'error':
                appendDelta(`\n\n错误：${event.error}`)
                break
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        appendDelta(`\n\n错误：${error instanceof Error ? error.message : '未知错误'}`)
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [messages, isLoading, canvasId, pushMedia, pushModel],
  )

  const images = useMemo(() => media.filter((m) => m.kind === 'image'), [media])
  const videos = useMemo(() => media.filter((m) => m.kind === 'video'), [media])
  const audios = useMemo(() => media.filter((m) => m.kind === 'audio'), [media])

  return { messages, media, images, videos, audios, models, isLoading, send, stop, reset }
}
