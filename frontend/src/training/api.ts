// Resolve API paths against the credential-free origin. When the app is served
// behind a tunnel whose URL carries userinfo (https://user:pass@host), the
// browser refuses to build a fetch Request from a URL that includes credentials
// — relative paths inherit those credentials from the document base URL.
// window.location.origin is scheme+host+port only, so it never includes them.
export const apiUrl = (path: string): string => `${window.location.origin}${path}`

const jsonHeaders = { 'Content-Type': 'application/json' }

// --- 会话/消息持久化 REST（SQLite 后端） ---

export type RemoteConversation = {
  id: string
  agent: string
  title: string | null
  status: 'regular' | 'archived'
  externalId: string | null
  createdAt: number
  updatedAt: number
}

export async function listConversations(agent: string): Promise<RemoteConversation[]> {
  const res = await fetch(apiUrl(`/api/conversations?agent=${encodeURIComponent(agent)}`))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.conversations as RemoteConversation[]
}

export async function createConversation(body: {
  agent: string
  externalId?: string
}): Promise<{ remoteId: string; externalId: string | null }> {
  const res = await fetch(apiUrl('/api/conversations'), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function renameConversation(id: string, title: string): Promise<void> {
  await fetch(apiUrl(`/api/conversations/${id}`), {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  })
}

export async function setConversationStatus(id: string, status: 'regular' | 'archived'): Promise<void> {
  await fetch(apiUrl(`/api/conversations/${id}`), {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify({ status }),
  })
}

export async function deleteConversation(id: string): Promise<void> {
  await fetch(apiUrl(`/api/conversations/${id}`), { method: 'DELETE' })
}

export async function loadMessages(
  id: string,
): Promise<{ headId: string | null; messages: { message: unknown; parentId: string | null }[] }> {
  const res = await fetch(apiUrl(`/api/conversations/${id}/messages`))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function appendMessage(
  id: string,
  message: unknown,
  parentId: string | null,
): Promise<void> {
  await fetch(apiUrl(`/api/conversations/${id}/messages`), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ message, parentId }),
  })
}

export async function deleteMessages(id: string, ids: string[]): Promise<void> {
  await fetch(apiUrl(`/api/conversations/${id}/messages`), {
    method: 'DELETE',
    headers: jsonHeaders,
    body: JSON.stringify({ ids }),
  })
}
