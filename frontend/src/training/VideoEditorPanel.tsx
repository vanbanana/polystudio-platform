import { useEffect, useMemo, useRef, useState } from 'react'
import { Film, Play, Pause, Scissors, SkipBack } from 'lucide-react'
import type { MediaItem } from './agentRuntime'
import './video-editor.css'

const PX_PER_SEC = 26
const MIN_CLIP_PX = 64
const HEAD_W = 66

const isConcatenated = (m: MediaItem) => m.concatenated ?? /concatenat/i.test(m.url)

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const f = Math.floor((sec - Math.floor(sec)) * 30)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

type ClipProps = {
  clip: MediaItem
  active: boolean
  duration?: number
  onSelect: () => void
  onDuration: (d: number) => void
}

function TimelineClip({ clip, active, duration, onSelect, onDuration }: ClipProps) {
  const width = duration ? Math.max(MIN_CLIP_PX, duration * PX_PER_SEC) : MIN_CLIP_PX
  return (
    <button
      type="button"
      className={`ve-clip ${active ? 'active' : ''}`}
      style={{ width }}
      onClick={onSelect}
      title={clip.prompt || clip.url}
    >
      <video
        className="ve-clip-thumb"
        src={clip.url}
        muted
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (isFinite(d) && d > 0) onDuration(d)
        }}
      />
      <span className="ve-clip-label">
        <Film size={11} />
        {clip.prompt ? clip.prompt.slice(0, 18) : '片段'}
      </span>
      {duration ? <span className="ve-clip-dur">{duration.toFixed(1)}s</span> : null}
    </button>
  )
}

export default function VideoEditorPanel({ videos }: { videos: MediaItem[] }) {
  const segments = useMemo(() => videos.filter((v) => !isConcatenated(v)), [videos])
  const outputs = useMemo(() => videos.filter(isConcatenated), [videos])

  const monitorRef = useRef<HTMLVideoElement>(null)
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const [durations, setDurations] = useState<Record<string, number>>({})

  // 默认选中最新成片，否则最新片段
  useEffect(() => {
    if (activeUrl && videos.some((v) => v.url === activeUrl)) return
    const latest = outputs[outputs.length - 1] || segments[segments.length - 1] || null
    setActiveUrl(latest ? latest.url : null)
  }, [videos, outputs, segments, activeUrl])

  const active = videos.find((v) => v.url === activeUrl) || null

  const setDuration = (url: string, d: number) =>
    setDurations((prev) => (prev[url] ? prev : { ...prev, [url]: d }))

  const togglePlay = () => {
    const el = monitorRef.current
    if (!el) return
    if (el.paused) el.play()
    else el.pause()
  }

  const restart = () => {
    const el = monitorRef.current
    if (!el) return
    el.currentTime = 0
  }

  const rowMaxSec = (row: MediaItem[]) =>
    row.reduce((acc, c) => acc + (durations[c.url] || MIN_CLIP_PX / PX_PER_SEC), 0)
  const rulerSec = Math.max(8, rowMaxSec(segments), rowMaxSec(outputs))

  // 播放头：当前活动片段在其轨道内的累计起点 + 当前播放进度
  const playheadSec = useMemo(() => {
    if (!active) return 0
    const row = isConcatenated(active) ? outputs : segments
    let start = 0
    for (const c of row) {
      if (c.url === active.url) break
      start += durations[c.url] || MIN_CLIP_PX / PX_PER_SEC
    }
    return start + current
  }, [active, outputs, segments, durations, current])

  const ticks = useMemo(() => {
    const step = rulerSec > 40 ? 10 : rulerSec > 16 ? 5 : 2
    const arr: number[] = []
    for (let t = 0; t <= rulerSec; t += step) arr.push(t)
    return arr
  }, [rulerSec])

  if (videos.length === 0) {
    return (
      <div className="ve-root">
        <div className="ve-empty">
          <Scissors size={38} strokeWidth={1.4} />
          <p>还没有视频。在左侧对话里描述镜头，生成或拼接后将在此进入剪辑器视图。</p>
        </div>
      </div>
    )
  }

  const renderTrack = (label: string, row: MediaItem[], accent: boolean) => (
    <div className={`ve-track ${accent ? 'accent' : ''}`}>
      <div className="ve-track-head">
        <span className="ve-track-name">{label}</span>
        <span className="ve-track-count">{row.length}</span>
      </div>
      <div className="ve-track-lane">
        {row.length === 0 ? (
          <span className="ve-track-empty">{accent ? '拼接成片后出现在这里' : '暂无片段'}</span>
        ) : (
          row.map((clip) => (
            <TimelineClip
              key={clip.url}
              clip={clip}
              active={clip.url === activeUrl}
              duration={durations[clip.url]}
              onSelect={() => setActiveUrl(clip.url)}
              onDuration={(d) => setDuration(clip.url, d)}
            />
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="ve-root">
      {/* 监视器 */}
      <div className="ve-monitor">
        {active ? (
          <video
            key={active.url}
            ref={monitorRef}
            src={active.url}
            className="ve-monitor-video"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              setTotal(e.currentTarget.duration)
              setDuration(active.url, e.currentTarget.duration)
            }}
          />
        ) : (
          <div className="ve-monitor-empty">选择一个片段以预览</div>
        )}
      </div>

      {/* 走带控制 */}
      <div className="ve-transport">
        <button type="button" className="ve-tp-btn" onClick={restart} title="回到起点">
          <SkipBack size={15} />
        </button>
        <button type="button" className="ve-tp-btn play" onClick={togglePlay} title={playing ? '暂停' : '播放'}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <span className="ve-timecode">
          {fmtTime(current)} <span className="ve-timecode-sep">/</span> {fmtTime(total)}
        </span>
        {active && isConcatenated(active) && <span className="ve-badge">成片</span>}
      </div>

      {/* 时间线 */}
      <div className="ve-timeline">
        <div className="ve-ruler" style={{ marginLeft: HEAD_W, width: rulerSec * PX_PER_SEC }}>
          {ticks.map((t) => (
            <span key={t} className="ve-tick" style={{ left: t * PX_PER_SEC }}>
              {t}s
            </span>
          ))}
        </div>
        <div className="ve-tracks" style={{ minWidth: HEAD_W + rulerSec * PX_PER_SEC }}>
          {renderTrack('片段', segments, false)}
          {renderTrack('成片', outputs, true)}
          <div
            className="ve-playhead"
            style={{ left: HEAD_W + playheadSec * PX_PER_SEC, display: active ? 'block' : 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
