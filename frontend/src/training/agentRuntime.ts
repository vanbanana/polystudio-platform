import { useMemo, useRef } from 'react'
import { useLocalRuntime, type ChatModelAdapter, type ChatModelRunResult } from '@assistant-ui/react'
import { apiUrl } from './api'

// 用 assistant-ui 的本地 runtime 桥接到现有后端的全能 Agent（POST /api/chat，SSE）。
// 对话/工具调用/思考链/输入框等 UI 全部交给 assistant-ui，这里只负责协议转换与媒体收集。

export interface MediaItem {
  kind: 'image' | 'video' | 'audio'
  url: string
  prompt?: string
  concatenated?: boolean
}

export interface ModelItem {
  modelUrl: string
  previewUrl?: string
  format: 'obj' | 'glb'
  mtlUrl?: string
  textureUrl?: string
  prompt?: string
}

export interface AgentRuntimeOptions {
  canvasId?: string
  systemHint?: string
  onMedia?: (item: MediaItem) => void
  onModel?: (item: ModelItem) => void
}

type AnyPart = { type: string; text?: string }

function safeParse(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function textOf(message: { content: readonly AnyPart[] }): string {
  return message.content
    .filter((p) => p.type === 'text')
    .map((p) => p.text || '')
    .join('')
}

export function useAgentRuntime(options: AgentRuntimeOptions) {
  const optsRef = useRef(options)
  optsRef.current = options

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        const opts = optsRef.current

        const history = messages.slice(0, -1).map((m) => {
          let content = textOf(m)
          if (m.role === 'assistant') {
            const urls: { image: string[]; audio: string[] } = { image: [], audio: [] }
            for (const part of m.content) {
              if (part.type !== 'tool-call') continue
              const raw = (part as { result?: unknown }).result
              const obj = typeof raw === 'string' ? safeParse(raw) : raw
              if (obj && typeof obj.image_url === 'string') urls.image.push(obj.image_url)
              if (obj && typeof obj.audio_url === 'string') urls.audio.push(obj.audio_url)
            }
            if (urls.image.length) content += `\n\nGenerated Image:\n${urls.image.map((u) => `- ${u}`).join('\n')}`
            if (urls.audio.length) content += `\n\nGenerated Audio:\n${urls.audio.map((u) => `- ${u}`).join('\n')}`
          }
          return { role: m.role, content }
        })

        const lastMessage = messages[messages.length - 1]
        const userText = lastMessage ? textOf(lastMessage) : ''
        const messageToSend = opts.systemHint ? `${opts.systemHint}\n\n${userText}` : userText

        const response = await fetch(apiUrl('/api/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            message: messageToSend,
            messages: history,
            canvas_id: opts.canvasId || undefined,
          }),
          signal: abortSignal,
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const reader = response.body?.getReader()
        if (!reader) throw new Error('无法读取响应流')
        const decoder = new TextDecoder()
        let buffer = ''

        type Part =
          | { type: 'text'; text: string }
          | { type: 'reasoning'; text: string }
          | { type: 'tool-call'; toolCallId: string; toolName: string; args: Record<string, unknown>; argsText: string; result?: unknown }
        const parts: Part[] = []

        const snapshot = (): ChatModelRunResult => ({
          content: parts.map((p) => ({ ...p })) as ChatModelRunResult['content'],
        })

        const appendText = (delta: string) => {
          const last = parts[parts.length - 1]
          if (last && last.type === 'text') last.text += delta
          else parts.push({ type: 'text', text: delta })
        }

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
                if (event.content) {
                  appendText(event.content)
                  yield snapshot()
                }
                break
              case 'skill_matched':
                parts.push({ type: 'reasoning', text: `命中技能：${event.skill_name}` })
                yield snapshot()
                break
              case 'tool_call':
                parts.push({
                  type: 'tool-call',
                  toolCallId: event.id,
                  toolName: event.name,
                  args: event.arguments || {},
                  argsText: JSON.stringify(event.arguments || {}, null, 2),
                })
                yield snapshot()
                break
              case 'tool_result': {
                const result = safeParse(event.content) || {}
                const part = parts.find(
                  (p): p is Extract<Part, { type: 'tool-call' }> =>
                    p.type === 'tool-call' && p.toolCallId === event.tool_call_id,
                )
                if (part) part.result = result
                const { onMedia, onModel } = optsRef.current
                if (typeof result.image_url === 'string') onMedia?.({ kind: 'image', url: result.image_url, prompt: result.prompt })
                const videoUrl = result.video_url || result.video_path
                if (typeof videoUrl === 'string')
                  onMedia?.({
                    kind: 'video',
                    url: videoUrl,
                    prompt: result.prompt,
                    concatenated: part?.toolName === 'concatenate_videos',
                  })
                if (typeof result.audio_url === 'string') onMedia?.({ kind: 'audio', url: result.audio_url, prompt: result.prompt })
                if (typeof result.model_url === 'string')
                  onModel?.({
                    modelUrl: result.model_url,
                    previewUrl: typeof result.preview_url === 'string' ? result.preview_url : undefined,
                    format: (result.format || 'obj') as 'obj' | 'glb',
                    mtlUrl: typeof result.mtl_url === 'string' ? result.mtl_url : undefined,
                    textureUrl: typeof result.texture_url === 'string' ? result.texture_url : undefined,
                    prompt: result.prompt,
                  })
                yield snapshot()
                break
              }
              case 'error':
                appendText(`\n\n错误：${event.error}`)
                yield snapshot()
                break
            }
          }
        }

        yield snapshot()
      },
    }),
    [],
  )

  return useLocalRuntime(adapter)
}
