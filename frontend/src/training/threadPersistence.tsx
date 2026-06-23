import { useCallback, useMemo, useRef, type PropsWithChildren } from 'react'
import {
  RuntimeAdapterProvider,
  useThreadListItemRuntime,
  type ExportedMessageRepository,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
  type ThreadMessage,
} from '@assistant-ui/react'
import type { AssistantStream } from 'assistant-stream'
import * as api from './api'

// 把 assistant-ui 的会话列表 + 每会话消息历史接到后端 SQLite 持久化。
// - RemoteThreadListAdapter：列出/新建/重命名/归档/删除会话
// - ThreadHistoryAdapter（经 unstable_Provider 注入）：加载/追加/删除某会话的消息
// 消息直接存完整 ThreadMessage（JSON），无损往返。

type StoredMessage = ThreadMessage & { createdAt?: unknown }

// 后端把 createdAt 序列化成了字符串，import 时还原成 Date。
function reviveMessage(raw: unknown): ThreadMessage {
  const m = raw as StoredMessage
  const createdAt =
    m && m.createdAt ? new Date(m.createdAt as string | number | Date) : new Date()
  return { ...m, createdAt } as ThreadMessage
}

function useBackendHistoryAdapter(): ThreadHistoryAdapter {
  const item = useThreadListItemRuntime()
  return useMemo<ThreadHistoryAdapter>(
    () => ({
      async load() {
        const remoteId = item.getState().remoteId
        if (!remoteId) return { messages: [] }
        const data = await api.loadMessages(remoteId)
        const repo: ExportedMessageRepository = {
          headId: data.headId ?? undefined,
          messages: data.messages.map((it) => ({
            parentId: it.parentId,
            message: reviveMessage(it.message),
          })),
        }
        return repo
      },
      async append({ message, parentId }) {
        const { remoteId } = await item.initialize()
        await api.appendMessage(remoteId, message, parentId)
      },
      async delete(items) {
        const remoteId = item.getState().remoteId
        if (!remoteId) return
        await api.deleteMessages(
          remoteId,
          items.map((i) => i.message.id),
        )
      },
    }),
    [item],
  )
}

export function useBackendThreadListAdapter(agent: string): RemoteThreadListAdapter {
  const agentRef = useRef(agent)
  agentRef.current = agent

  const unstable_Provider = useCallback(function HistoryProvider({ children }: PropsWithChildren) {
    const history = useBackendHistoryAdapter()
    const adapters = useMemo(() => ({ history }), [history])
    return <RuntimeAdapterProvider adapters={adapters}>{children}</RuntimeAdapterProvider>
  }, [])

  return useMemo<RemoteThreadListAdapter>(
    () => ({
      async list() {
        const conversations = await api.listConversations(agentRef.current)
        return {
          threads: conversations.map((c) => ({
            status: c.status === 'archived' ? ('archived' as const) : ('regular' as const),
            remoteId: c.id,
            externalId: c.externalId ?? undefined,
            title: c.title ?? undefined,
            lastMessageAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
          })),
        }
      },
      async initialize() {
        const res = await api.createConversation({ agent: agentRef.current })
        return { remoteId: res.remoteId, externalId: res.externalId ?? undefined }
      },
      async fetch(remoteId) {
        const conversations = await api.listConversations(agentRef.current)
        const c = conversations.find((x) => x.id === remoteId)
        if (!c) throw new Error(`conversation ${remoteId} not found`)
        return {
          status: c.status === 'archived' ? ('archived' as const) : ('regular' as const),
          remoteId: c.id,
          externalId: c.externalId ?? undefined,
          title: c.title ?? undefined,
          lastMessageAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
        }
      },
      async rename(remoteId, newTitle) {
        await api.renameConversation(remoteId, newTitle)
      },
      async archive(remoteId) {
        await api.setConversationStatus(remoteId, 'archived')
      },
      async unarchive(remoteId) {
        await api.setConversationStatus(remoteId, 'regular')
      },
      async delete(remoteId) {
        await api.deleteConversation(remoteId)
      },
      async generateTitle() {
        // 标题由前端首条用户消息自动命名（ThreadProbe.rename），不需要服务端生成。
        return new ReadableStream() as unknown as AssistantStream
      },
      unstable_Provider,
    }),
    [unstable_Provider],
  )
}
