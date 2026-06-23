import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  SlidersHorizontal,
  Brain,
  Package,
  Wrench,
  Server,
  KeyRound,
  Sun,
  Moon,
  Home,
  Save,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Search,
  Loader2,
  ExternalLink,
  BookOpen,
  MessageSquare,
  Image as ImageIcon,
  Box,
  Film,
  Mic,
  UserSquare,
} from 'lucide-react'
import CourseSidebar from './CourseSidebar'
import { useNav } from './nav'
import './settings.css'

// ─── Types ──────────────────────────────────────────────────────────
type TabId = 'general' | 'workspace' | 'skills' | 'tools' | 'mcp' | 'env' | 'docs'

interface ToolItem {
  id: string
  name: string
  description: string
  enabled: boolean
  category: string
}

interface InstalledSkill {
  id: string
  name: string
  description: string
  source: 'public' | 'custom'
  enabled: boolean
}

interface MCPServerForm {
  _key: string
  name: string
  command: string
  args: string
  envPairs: { k: string; v: string }[]
}

interface EnvItem {
  key: string
  value: string
  desc: string
  sensitive: boolean
}

interface EnvGroup {
  group: string
  items: EnvItem[]
}

interface WorkspaceFile {
  id: string
  name: string
  desc: string
  content: string
}

type Toast = { type: 'success' | 'error'; msg: string } | null

const CATEGORY_LABELS: Record<string, string> = {
  image: '图片',
  video: '视频',
  '3d': '3D',
  avatar: '虚拟人',
  audio: '音频',
  content: '内容创作',
}
const CATEGORY_ORDER = ['image', 'video', '3d', 'avatar', 'audio', 'content']

const WORKSPACE_ICON: Record<string, string> = {
  'AGENTS.md': '📋',
  'TOOLS.md': '🔧',
  'IDENTITY.md': '🎭',
  'USER.md': '🧑',
  'SOUL.md': '✨',
  'MEMORY.md': '💾',
}

// ─── shared bits ────────────────────────────────────────────────────
function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      className={`st-toggle${checked ? ' on' : ''}`}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
    >
      <span className="st-toggle-knob" />
    </button>
  )
}

function ToastChip({ toast }: { toast: Toast }) {
  if (!toast) return null
  return (
    <span className={`st-toast ${toast.type}`}>
      {toast.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
      {toast.msg}
    </span>
  )
}

function Loading() {
  return (
    <div className="st-loading">
      <Loader2 size={18} className="st-spin" /> 加载中…
    </div>
  )
}

// ─── 常规 ────────────────────────────────────────────────────────────
function GeneralPanel() {
  const { theme, toggleTheme, navigate } = useNav()
  return (
    <div className="st-section">
      <h2 className="st-h2">常规</h2>
      <p className="st-sub">外观与全局偏好。</p>

      <div className="st-row-card">
        <div className="st-row-card-info">
          <div className="st-row-card-title">主题外观</div>
          <div className="st-row-card-desc">在亮色 / 暗色之间切换，设置即时生效并记忆。</div>
        </div>
        <button className="st-btn" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          {theme === 'dark' ? '切到亮色' : '切到暗色'}
        </button>
      </div>

      <div className="st-row-card">
        <div className="st-row-card-info">
          <div className="st-row-card-title">返回工作台</div>
          <div className="st-row-card-desc">回到课程首页，选择一个 Agent 开始创作。</div>
        </div>
        <button className="st-btn" onClick={() => navigate('home')}>
          <Home size={15} /> 课程首页
        </button>
      </div>
    </div>
  )
}

// ─── 工具开关 ─────────────────────────────────────────────────────────
function ToolsPanel() {
  const [tools, setTools] = useState<ToolItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch('/api/settings/skills')
      .then((r) => r.json())
      .then((d) => setTools(d.skills || []))
      .catch(() => setToast({ type: 'error', msg: '加载失败' }))
      .finally(() => setLoading(false))
  }, [])

  const persist = useCallback(async (next: ToolItem[]) => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: next }),
      })
      if (!res.ok) throw new Error()
      setToast({ type: 'success', msg: '已保存' })
      setTimeout(() => setToast(null), 1800)
    } catch {
      setToast({ type: 'error', msg: '保存失败' })
    } finally {
      setSaving(false)
    }
  }, [])

  const toggle = (id: string) => {
    const next = tools.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    setTools(next)
    persist(next)
  }

  if (loading) return <Loading />

  const filtered = tools.filter(
    (t) => !query || t.name.includes(query) || t.description.includes(query),
  )
  const grouped = filtered.reduce<Record<string, ToolItem[]>>((acc, s) => {
    const cat = s.category || 'other'
    ;(acc[cat] = acc[cat] || []).push(s)
    return acc
  }, {})
  const cats = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]
  const onCount = tools.filter((t) => t.enabled).length

  return (
    <div className="st-section">
      <div className="st-section-head">
        <div>
          <h2 className="st-h2">工具开关</h2>
          <p className="st-sub">控制各模态工具是否在对话中可被调用。开关即点即存。</p>
        </div>
        <div className="st-head-right">
          <span className="st-pill">{onCount} / {tools.length} 已启用</span>
          {saving && <Loader2 size={14} className="st-spin" />}
          <ToastChip toast={toast} />
        </div>
      </div>

      <div className="st-search">
        <Search size={15} />
        <input placeholder="搜索工具…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {cats.map((cat) => (
        <div key={cat} className="st-group">
          <div className="st-group-title">{CATEGORY_LABELS[cat] || cat}</div>
          <div className="st-tool-grid">
            {grouped[cat].map((tool) => (
              <div className={`st-tool-card${tool.enabled ? ' on' : ''}`} key={tool.id}>
                <div className="st-tool-info">
                  <div className="st-tool-name">{tool.name}</div>
                  <div className="st-tool-desc">{tool.description}</div>
                </div>
                <Toggle checked={tool.enabled} onChange={() => toggle(tool.id)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── 工作空间（人设记忆文件） ───────────────────────────────────────────
function WorkspacePanel() {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/settings/workspace')
      .then((r) => r.json())
      .then((data: WorkspaceFile[]) => {
        const arr = Array.isArray(data) ? data : []
        setFiles(arr)
        if (arr.length) {
          setSelectedId(arr[0].id)
          setEditContent(arr[0].content)
        }
      })
      .catch(() => setToast({ type: 'error', msg: '加载失败' }))
      .finally(() => setLoading(false))
  }, [])

  const select = (f: WorkspaceFile) => {
    setSelectedId(f.id)
    setEditContent(f.content)
    setPreviewMode(false)
    setToast(null)
  }

  const save = async () => {
    if (!selectedId) return
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch(`/api/settings/workspace/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      if (!res.ok) throw new Error()
      setFiles((prev) => prev.map((f) => (f.id === selectedId ? { ...f, content: editContent } : f)))
      setToast({ type: 'success', msg: '已保存' })
      setTimeout(() => setToast(null), 2000)
    } catch {
      setToast({ type: 'error', msg: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const selected = files.find((f) => f.id === selectedId) ?? null
  const dirty = !!selected && selected.content !== editContent

  if (loading) return <Loading />

  return (
    <div className="st-section">
      <h2 className="st-h2">工作空间 · 人设记忆</h2>
      <p className="st-sub">Agent 每次对话会读取这些文件，作为身份与记忆注入 System Prompt。</p>

      <div className="st-split">
        <div className="st-file-list">
          {files.map((f) => {
            const chars = f.content.trim().length
            return (
              <button
                key={f.id}
                className={`st-file${selectedId === f.id ? ' active' : ''}`}
                onClick={() => select(f)}
              >
                <span className="st-file-emoji">{WORKSPACE_ICON[f.id] ?? '📄'}</span>
                <span className="st-file-meta">
                  <span className="st-file-name">{f.name}</span>
                  <span className="st-file-id">{f.id} · {chars > 0 ? `${chars} 字符` : '空'}</span>
                </span>
              </button>
            )
          })}
        </div>

        {selected && (
          <div className="st-editor">
            <div className="st-editor-head">
              <div className="st-editor-title">
                <Brain size={15} /> {selected.name}
                <span className="st-editor-desc">{selected.desc}</span>
              </div>
              <div className="st-seg">
                <button className={!previewMode ? 'on' : ''} onClick={() => setPreviewMode(false)}>编辑</button>
                <button className={previewMode ? 'on' : ''} onClick={() => setPreviewMode(true)}>预览</button>
              </div>
            </div>
            {previewMode ? (
              <div className="st-md-preview"><ReactMarkdown>{editContent || '（空）'}</ReactMarkdown></div>
            ) : (
              <textarea
                className="st-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder={`在此编辑 ${selected.id}…`}
                spellCheck={false}
              />
            )}
            <div className="st-editor-foot">
              <button className="st-btn primary" onClick={save} disabled={saving || !dirty}>
                {saving ? <><Loader2 size={15} className="st-spin" />保存中…</> : <><Save size={15} />保存</>}
              </button>
              {dirty && !saving && <span className="st-dirty">有未保存的修改</span>}
              <ToastChip toast={toast} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Skills（SKILL.md） ───────────────────────────────────────────────
function SkillPreview({ skill }: { skill: InstalledSkill }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => {
    setLoading(true)
    setError(false)
    fetch(`/api/settings/skills/installed/${skill.id}/content`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((d) => setContent(d.content))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [skill.id])
  return (
    <div className="st-editor">
      <div className="st-editor-head">
        <div className="st-editor-title">
          <Package size={15} /> {skill.name}
          <span className={`st-badge ${skill.source}`}>{skill.source}</span>
        </div>
        <span className="st-editor-desc">SKILL.md</span>
      </div>
      <div className="st-md-preview">
        {loading && <Loading />}
        {error && <div className="st-empty">读取文件失败</div>}
        {!loading && !error && content !== null && <ReactMarkdown>{content}</ReactMarkdown>}
      </div>
    </div>
  )
}

function SkillsPanel() {
  const [skills, setSkills] = useState<InstalledSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/settings/skills/installed')
      .then((r) => r.json())
      .then((data) => setSkills(Array.isArray(data) ? data : []))
      .catch(() => setToast({ type: 'error', msg: '加载失败' }))
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (skill: InstalledSkill) => {
    if (togglingId === skill.id) return
    const next = !skill.enabled
    setSkills((prev) => prev.map((s) => (s.id === skill.id ? { ...s, enabled: next } : s)))
    setTogglingId(skill.id)
    try {
      const res = await fetch(`/api/settings/skills/installed/${skill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setSkills((prev) => prev.map((s) => (s.id === skill.id ? { ...s, enabled: skill.enabled } : s)))
      setToast({ type: 'error', msg: '操作失败' })
      setTimeout(() => setToast(null), 2000)
    } finally {
      setTogglingId(null)
    }
  }

  const selected = skills.find((s) => s.id === selectedId) ?? null

  if (loading) return <Loading />

  return (
    <div className="st-section">
      <div className="st-section-head">
        <div>
          <h2 className="st-h2">Skills</h2>
          <p className="st-sub">已安装的 Skill 文件（SKILL.md）。启用后 Agent 会自动读取对应领域知识。</p>
        </div>
        <ToastChip toast={toast} />
      </div>

      {skills.length === 0 ? (
        <div className="st-empty">
          <Package size={30} style={{ opacity: 0.3 }} />
          <div>暂无已安装的 Skills</div>
          <div className="st-empty-hint">将 SKILL.md 放入 <code>skills/custom/</code> 目录即可</div>
        </div>
      ) : (
        <div className="st-split">
          <div className="st-file-list wide">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className={`st-skill${selectedId === skill.id ? ' active' : ''}`}
                onClick={() => setSelectedId(selectedId === skill.id ? null : skill.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedId(selectedId === skill.id ? null : skill.id)}
              >
                <div className="st-skill-info">
                  <div className="st-skill-name">
                    {skill.name}
                    <span className={`st-badge ${skill.source}`}>{skill.source}</span>
                  </div>
                  <div className="st-skill-desc">{skill.description}</div>
                  <div className="st-skill-id">{skill.id}</div>
                </div>
                <Toggle
                  checked={skill.enabled}
                  disabled={togglingId === skill.id}
                  onChange={() => toggle(skill)}
                />
              </div>
            ))}
          </div>
          {selected && <SkillPreview skill={selected} />}
        </div>
      )}
    </div>
  )
}

// ─── MCP ─────────────────────────────────────────────────────────────
function toFormList(servers: Record<string, any>): MCPServerForm[] {
  return Object.entries(servers).map(([name, cfg]) => ({
    _key: `${name}-${Date.now()}-${Math.random()}`,
    name,
    command: cfg.command || '',
    args: Array.isArray(cfg.args) ? cfg.args.join(', ') : '',
    envPairs: cfg.env ? Object.entries(cfg.env as Record<string, string>).map(([k, v]) => ({ k, v })) : [],
  }))
}
function fromFormList(forms: MCPServerForm[]): Record<string, any> {
  const result: Record<string, any> = {}
  for (const f of forms) {
    const name = f.name.trim()
    if (!name) continue
    const server: any = {}
    if (f.command.trim()) server.command = f.command.trim()
    const args = f.args.split(',').map((a) => a.trim()).filter(Boolean)
    if (args.length) server.args = args
    if (f.envPairs.length) {
      server.env = Object.fromEntries(f.envPairs.filter((p) => p.k.trim()).map((p) => [p.k.trim(), p.v]))
    }
    result[name] = server
  }
  return result
}

function MCPPanel() {
  const [view, setView] = useState<'form' | 'json'>('form')
  const [forms, setForms] = useState<MCPServerForm[]>([])
  const [jsonText, setJsonText] = useState('{}')
  const [jsonError, setJsonError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/settings/mcp')
      .then((r) => r.json())
      .then((d) => {
        const servers = d.mcpServers || {}
        setForms(toFormList(servers))
        setJsonText(JSON.stringify({ mcpServers: servers }, null, 2))
      })
      .catch(() => setToast({ type: 'error', msg: '加载失败' }))
      .finally(() => setLoading(false))
  }, [])

  const switchToJson = () => {
    setJsonText(JSON.stringify({ mcpServers: fromFormList(forms) }, null, 2))
    setJsonError('')
    setView('json')
  }
  const switchToForm = () => {
    try {
      const parsed = JSON.parse(jsonText)
      setForms(toFormList(parsed.mcpServers || {}))
      setJsonError('')
      setView('form')
    } catch {
      setJsonError('JSON 格式错误，请先修正再切换')
    }
  }
  const updateForm = (key: string, patch: Partial<MCPServerForm>) =>
    setForms((prev) => prev.map((f) => (f._key === key ? { ...f, ...patch } : f)))
  const addEnvPair = (k: string) =>
    setForms((prev) => prev.map((f) => (f._key === k ? { ...f, envPairs: [...f.envPairs, { k: '', v: '' }] } : f)))
  const removeEnvPair = (k: string, idx: number) =>
    setForms((prev) => prev.map((f) => (f._key === k ? { ...f, envPairs: f.envPairs.filter((_, i) => i !== idx) } : f)))
  const updateEnvPair = (k: string, idx: number, patch: { k?: string; v?: string }) =>
    setForms((prev) =>
      prev.map((f) =>
        f._key === k ? { ...f, envPairs: f.envPairs.map((ep, i) => (i === idx ? { ...ep, ...patch } : ep)) } : f,
      ),
    )

  const save = async () => {
    setSaving(true)
    setToast(null)
    let payload: Record<string, any>
    if (view === 'json') {
      try {
        payload = JSON.parse(jsonText)
      } catch {
        setToast({ type: 'error', msg: 'JSON 格式错误，无法保存' })
        setSaving(false)
        return
      }
    } else {
      payload = { mcpServers: fromFormList(forms) }
    }
    try {
      const res = await fetch('/api/settings/mcp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      setToast({ type: 'success', msg: '已保存' })
      setTimeout(() => setToast(null), 2200)
    } catch {
      setToast({ type: 'error', msg: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="st-section">
      <div className="st-section-head">
        <div>
          <h2 className="st-h2">MCP 服务器</h2>
          <p className="st-sub">配置 Model Context Protocol 服务器，支持表单或原始 JSON。</p>
        </div>
        <div className="st-seg">
          <button className={view === 'form' ? 'on' : ''} onClick={view === 'json' ? switchToForm : undefined}>表单</button>
          <button className={view === 'json' ? 'on' : ''} onClick={view === 'form' ? switchToJson : undefined}>JSON</button>
        </div>
      </div>

      {view === 'form' ? (
        <>
          {forms.length === 0 && <div className="st-empty">尚未配置任何 MCP 服务器</div>}
          {forms.map((f) => (
            <div className="st-mcp-card" key={f._key}>
              <div className="st-mcp-head">
                <span>服务器配置</span>
                <button className="st-icon-btn" onClick={() => setForms((p) => p.filter((x) => x._key !== f._key))} title="删除">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="st-mcp-fields">
                <label className="st-field">
                  <span>名称</span>
                  <input className="st-input" placeholder="my-server" value={f.name} onChange={(e) => updateForm(f._key, { name: e.target.value })} />
                </label>
                <label className="st-field">
                  <span>命令</span>
                  <input className="st-input" placeholder="npx" value={f.command} onChange={(e) => updateForm(f._key, { command: e.target.value })} />
                </label>
                <label className="st-field full">
                  <span>参数（逗号分隔）</span>
                  <input className="st-input" placeholder="-y, @modelcontextprotocol/server-filesystem, /path" value={f.args} onChange={(e) => updateForm(f._key, { args: e.target.value })} />
                </label>
                <div className="st-field full">
                  <span>环境变量</span>
                  <div className="st-env-pairs">
                    {f.envPairs.map((ep, idx) => (
                      <div className="st-env-pair" key={idx}>
                        <input className="st-input" placeholder="KEY" value={ep.k} onChange={(e) => updateEnvPair(f._key, idx, { k: e.target.value })} style={{ maxWidth: 160 }} />
                        <input className="st-input" placeholder="VALUE" value={ep.v} onChange={(e) => updateEnvPair(f._key, idx, { v: e.target.value })} />
                        <button className="st-icon-btn" onClick={() => removeEnvPair(f._key, idx)} title="删除"><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <button className="st-ghost-btn" onClick={() => addEnvPair(f._key)}><Plus size={12} />添加环境变量</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button className="st-ghost-btn big" onClick={() => setForms((p) => [...p, { _key: `new-${Date.now()}`, name: '', command: '', args: '', envPairs: [] }])}>
            <Plus size={16} />添加服务器
          </button>
        </>
      ) : (
        <textarea
          className={`st-code${jsonError ? ' error' : ''}`}
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value)
            try {
              JSON.parse(e.target.value)
              setJsonError('')
            } catch {
              setJsonError('JSON 格式错误')
            }
          }}
          spellCheck={false}
        />
      )}
      {jsonError && <div className="st-toast error" style={{ marginTop: 8 }}><AlertCircle size={14} />{jsonError}</div>}

      <div className="st-editor-foot">
        <button className="st-btn primary" onClick={save} disabled={saving || (view === 'json' && !!jsonError)}>
          {saving ? <><Loader2 size={15} className="st-spin" />保存中…</> : <><Save size={15} />保存</>}
        </button>
        <ToastChip toast={toast} />
      </div>
    </div>
  )
}

// 各 API Key 对应厂商官方控制台「获取密钥」页面
const KEY_DOCS: Record<string, { label: string; url: string }> = {
  OPENAI_API_KEY: { label: 'DeepSeek 控制台', url: 'https://platform.deepseek.com/api_keys' },
  VOLCANO_API_KEY: { label: '火山引擎方舟', url: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey' },
  TENCENT_AI3D_API_KEY: { label: '腾讯云访问密钥', url: 'https://console.cloud.tencent.com/cam/capi' },
  DASHSCOPE_API_KEY: { label: '阿里云百炼', url: 'https://bailian.console.aliyun.com/?tab=model#/api-key' },
}

// ─── 环境变量（API Key 等） ────────────────────────────────────────────
function EnvPanel() {
  const [groups, setGroups] = useState<EnvGroup[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/settings/env')
      .then((r) => r.json())
      .then((d) => {
        const grps: EnvGroup[] = d.groups || []
        setGroups(grps)
        const init: Record<string, string> = {}
        for (const g of grps) for (const item of g.items) init[item.key] = item.value
        setValues(init)
      })
      .catch(() => setToast({ type: 'error', msg: '加载失败' }))
      .finally(() => setLoading(false))
  }, [])

  const toggleReveal = (key: string) =>
    setRevealed((prev) => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })

  const save = async () => {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/settings/env', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: Object.entries(values).map(([key, value]) => ({ key, value })) }),
      })
      if (!res.ok) throw new Error()
      setToast({ type: 'success', msg: '已保存，部分项需重启后端生效' })
      setTimeout(() => setToast(null), 4000)
    } catch {
      setToast({ type: 'error', msg: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="st-section">
      <h2 className="st-h2">环境变量 · API Key</h2>
      <p className="st-sub">直接读写 backend/.env。敏感字段默认隐藏，点击眼睛可查看。部分修改需重启后端生效。</p>

      {groups.map((g) => (
        <div className="st-group" key={g.group}>
          <div className="st-group-title">{g.group}</div>
          {g.items.map((item) => {
            const show = revealed.has(item.key) || !item.sensitive
            const doc = KEY_DOCS[item.key]
            return (
              <div className="st-env-row" key={item.key}>
                <div className="st-env-key">
                  <div className="st-env-key-name">
                    {item.sensitive && <KeyRound size={13} />} {item.key}
                  </div>
                  <div className="st-env-key-desc">{item.desc}</div>
                  {doc && (
                    <a
                      className="st-env-doc"
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={12} />
                      获取 Key · {doc.label}
                    </a>
                  )}
                </div>
                <div className="st-env-val">
                  <input
                    className="st-input"
                    type={show ? 'text' : 'password'}
                    value={values[item.key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
                    placeholder="（未设置）"
                  />
                  {item.sensitive && (
                    <button className="st-icon-btn" onClick={() => toggleReveal(item.key)} title={show ? '隐藏' : '查看'}>
                      {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <div className="st-editor-foot">
        <button className="st-btn primary" onClick={save} disabled={saving}>
          {saving ? <><Loader2 size={15} className="st-spin" />保存中…</> : <><Save size={15} />保存</>}
        </button>
        <ToastChip toast={toast} />
      </div>
    </div>
  )
}

// ─── 获取密钥 · 文档 ──────────────────────────────────────────────────
interface ProviderDoc {
  name: string
  desc: string
  envKeys?: string[]
  keyUrl: string
  docUrl: string
}
interface DocCategory {
  cat: string
  icon: React.ReactNode
  providers: ProviderDoc[]
}

const DOC_CATEGORIES: DocCategory[] = [
  {
    cat: 'LLM · 对话决策',
    icon: <MessageSquare size={15} />,
    providers: [
      { name: 'DeepSeek', desc: 'OpenAI 兼容，本平台默认对话模型', envKeys: ['OPENAI_API_KEY'], keyUrl: 'https://platform.deepseek.com/api_keys', docUrl: 'https://api-docs.deepseek.com/' },
      { name: '硅基流动 SiliconFlow', desc: '聚合多模型，OpenAI 兼容接口', envKeys: ['OPENAI_API_KEY'], keyUrl: 'https://cloud.siliconflow.cn/account/ak', docUrl: 'https://docs.siliconflow.cn/' },
      { name: '阿里云百炼 (通义千问)', desc: 'Qwen 系列，OpenAI 兼容模式', envKeys: ['OPENAI_API_KEY', 'DASHSCOPE_API_KEY'], keyUrl: 'https://bailian.console.aliyun.com/?tab=model#/api-key', docUrl: 'https://help.aliyun.com/zh/model-studio/' },
      { name: '月之暗面 Kimi (Moonshot)', desc: 'OpenAI 兼容长上下文模型', envKeys: ['OPENAI_API_KEY'], keyUrl: 'https://platform.moonshot.cn/console/api-keys', docUrl: 'https://platform.moonshot.cn/docs' },
      { name: '智谱 GLM (BigModel)', desc: 'GLM-4 系列，OpenAI 兼容', envKeys: ['OPENAI_API_KEY'], keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys', docUrl: 'https://open.bigmodel.cn/dev/api' },
      { name: '百度千帆 (文心)', desc: 'ERNIE 系列大模型', envKeys: ['OPENAI_API_KEY'], keyUrl: 'https://console.bce.baidu.com/iam/#/iam/apikey/list', docUrl: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html' },
      { name: 'OpenAI', desc: '官方 GPT 系列', envKeys: ['OPENAI_API_KEY'], keyUrl: 'https://platform.openai.com/api-keys', docUrl: 'https://platform.openai.com/docs' },
    ],
  },
  {
    cat: '图片生成',
    icon: <ImageIcon size={15} />,
    providers: [
      { name: '火山引擎方舟 (Seedream/豆包)', desc: '文生图 / 图生图', envKeys: ['VOLCANO_API_KEY'], keyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey', docUrl: 'https://www.volcengine.com/docs/82379' },
      { name: '阿里云百炼 (通义万相)', desc: 'Wanx 文生图模型', envKeys: ['DASHSCOPE_API_KEY'], keyUrl: 'https://bailian.console.aliyun.com/?tab=model#/api-key', docUrl: 'https://help.aliyun.com/zh/model-studio/text-to-image' },
      { name: 'SiliconFlow (Flux/SD)', desc: '开源图片模型托管', envKeys: ['OPENAI_API_KEY'], keyUrl: 'https://cloud.siliconflow.cn/account/ak', docUrl: 'https://docs.siliconflow.cn/cn/api-reference/images/images-generations' },
    ],
  },
  {
    cat: '3D 模型生成',
    icon: <Box size={15} />,
    providers: [
      { name: '腾讯混元 3D', desc: '文/图生成 3D 模型', envKeys: ['TENCENT_AI3D_API_KEY'], keyUrl: 'https://console.cloud.tencent.com/cam/capi', docUrl: 'https://cloud.tencent.com/document/product/1804' },
      { name: 'Meshy', desc: 'AI 3D 模型与贴图生成', keyUrl: 'https://www.meshy.ai/api', docUrl: 'https://docs.meshy.ai/' },
      { name: 'Tripo3D', desc: '快速文/图生成 3D', keyUrl: 'https://platform.tripo3d.ai/api-keys', docUrl: 'https://platform.tripo3d.ai/docs' },
    ],
  },
  {
    cat: '视频生成',
    icon: <Film size={15} />,
    providers: [
      { name: '火山引擎 (即梦/Seedance)', desc: '文/图生成视频片段', envKeys: ['VOLCANO_API_KEY', 'VOLCANO_VIDEO_MODEL'], keyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey', docUrl: 'https://www.volcengine.com/docs/82379' },
      { name: '阿里云百炼 (通义万相视频)', desc: 'Wanx 文生视频', envKeys: ['DASHSCOPE_API_KEY'], keyUrl: 'https://bailian.console.aliyun.com/?tab=model#/api-key', docUrl: 'https://help.aliyun.com/zh/model-studio/text-to-video' },
      { name: 'MiniMax 海螺', desc: '视频与多模态生成', keyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key', docUrl: 'https://platform.minimaxi.com/document' },
      { name: 'Runway', desc: 'Gen 系列视频生成', keyUrl: 'https://app.runwayml.com/', docUrl: 'https://docs.dev.runwayml.com/' },
    ],
  },
  {
    cat: '语音合成 (TTS)',
    icon: <Mic size={15} />,
    providers: [
      { name: '阿里云百炼 CosyVoice', desc: '本平台默认语音合成', envKeys: ['DASHSCOPE_API_KEY'], keyUrl: 'https://bailian.console.aliyun.com/?tab=model#/api-key', docUrl: 'https://help.aliyun.com/zh/model-studio/cosyvoice-large-model-for-speech-synthesis' },
      { name: '火山引擎语音', desc: '语音合成 / 声音复刻', keyUrl: 'https://console.volcengine.com/speech/app', docUrl: 'https://www.volcengine.com/docs/6561' },
      { name: 'ElevenLabs', desc: '高质量多语种 TTS', keyUrl: 'https://elevenlabs.io/app/settings/api-keys', docUrl: 'https://elevenlabs.io/docs' },
      { name: 'OpenAI TTS', desc: '官方语音合成接口', envKeys: ['OPENAI_API_KEY'], keyUrl: 'https://platform.openai.com/api-keys', docUrl: 'https://platform.openai.com/docs/guides/text-to-speech' },
    ],
  },
  {
    cat: '虚拟人 · 数字人',
    icon: <UserSquare size={15} />,
    providers: [
      { name: 'ComfyUI (本地)', desc: '本地工作流，无需 API Key', envKeys: ['COMFYUI_SERVER_ADDRESS'], keyUrl: 'https://github.com/comfyanonymous/ComfyUI', docUrl: 'https://docs.comfy.org/' },
      { name: 'HeyGen', desc: '数字人视频生成', keyUrl: 'https://app.heygen.com/settings?nav=API', docUrl: 'https://docs.heygen.com/' },
      { name: 'D-ID', desc: '照片驱动数字人', keyUrl: 'https://studio.d-id.com/account-settings', docUrl: 'https://docs.d-id.com/' },
    ],
  },
]

function DocsPanel() {
  return (
    <div className="st-section">
      <h2 className="st-h2">获取密钥 · 官方文档</h2>
      <p className="st-sub">按能力分类汇总各厂商。点「获取 Key」直达控制台密钥页，点「文档」查看官方接入文档。拿到 Key 后到「环境变量」填入对应字段。</p>

      {DOC_CATEGORIES.map((c) => (
        <div className="st-doc-cat" key={c.cat}>
          <div className="st-doc-cat-title">
            <span className="st-doc-cat-ic">{c.icon}</span>
            {c.cat}
          </div>
          <div className="st-doc-grid">
            {c.providers.map((p) => (
              <div className="st-doc-card" key={p.name}>
                <div className="st-doc-card-head">
                  <div className="st-doc-card-name">{p.name}</div>
                  <div className="st-doc-card-desc">{p.desc}</div>
                </div>
                {p.envKeys && p.envKeys.length > 0 && (
                  <div className="st-doc-envs">
                    {p.envKeys.map((k) => (
                      <span className="st-doc-env-tag" key={k}>{k}</span>
                    ))}
                  </div>
                )}
                <div className="st-doc-card-links">
                  <a className="st-doc-link primary" href={p.keyUrl} target="_blank" rel="noopener noreferrer">
                    <KeyRound size={13} />获取 Key<ExternalLink size={11} />
                  </a>
                  <a className="st-doc-link" href={p.docUrl} target="_blank" rel="noopener noreferrer">
                    <BookOpen size={13} />文档<ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Settings shell ──────────────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'general', label: '常规', icon: <SlidersHorizontal size={16} />, hint: '外观与偏好' },
  { id: 'workspace', label: '工作空间', icon: <Brain size={16} />, hint: '人设记忆' },
  { id: 'skills', label: 'Skills', icon: <Package size={16} />, hint: '领域知识' },
  { id: 'tools', label: '工具开关', icon: <Wrench size={16} />, hint: '模态能力' },
  { id: 'mcp', label: 'MCP 服务器', icon: <Server size={16} />, hint: '外部协议' },
  { id: 'env', label: '环境变量', icon: <KeyRound size={16} />, hint: 'API Key' },
  { id: 'docs', label: '获取密钥', icon: <BookOpen size={16} />, hint: '文档直达' },
]

export default function SettingsStudio() {
  const [tab, setTab] = useState<TabId>('general')
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [tab])

  const panel = () => {
    switch (tab) {
      case 'general': return <GeneralPanel />
      case 'workspace': return <WorkspacePanel />
      case 'skills': return <SkillsPanel />
      case 'tools': return <ToolsPanel />
      case 'mcp': return <MCPPanel />
      case 'env': return <EnvPanel />
      case 'docs': return <DocsPanel />
    }
  }

  return (
    <div className="cz-app">
      <CourseSidebar />
      <div className="cz-content">
        <div className="st-wrap">
          <div className="st-head">
            <div className="st-head-ic"><SlidersHorizontal size={18} /></div>
            <div>
              <div className="st-head-title">Agent 设置</div>
              <div className="st-head-sub">配置人设、技能、工具与密钥 · 即点即用</div>
            </div>
          </div>
          <div className="st-body">
            <nav className="st-rail">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`st-rail-item${tab === t.id ? ' active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <span className="st-rail-ic">{t.icon}</span>
                  <span className="st-rail-text">
                    <span className="st-rail-label">{t.label}</span>
                    <span className="st-rail-hint">{t.hint}</span>
                  </span>
                </button>
              ))}
            </nav>
            <div className="st-panel" ref={bodyRef}>
              {panel()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
