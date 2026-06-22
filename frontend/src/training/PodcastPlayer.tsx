import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, Mic } from 'lucide-react'

const BARS = 56

// 用 src 生成一组确定的伪波形高度（暂停时显示，避免一片空白）。
function seededBars(seed: string, n: number): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    h = (Math.imul(h, 1103515245) + 12345) & 0x7fffffff
    out.push(0.28 + (h % 1000) / 1000 * 0.72)
  }
  return out
}

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${ss.toString().padStart(2, '0')}`
}

type Props = {
  src: string
  title?: string
  label: string
}

export default function PodcastPlayer({ src, title, label }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef<{ ac: AudioContext; analyser: AnalyserNode; data: Uint8Array<ArrayBuffer> } | null>(null)
  const rafRef = useRef(0)
  const progRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)
  const staticBars = useRef(seededBars(title || src, BARS))

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const c = canvas.getContext('2d')
    if (!c) return
    const w = canvas.width
    const h = canvas.height
    c.clearRect(0, 0, w, h)
    const gap = 3
    const bw = (w - (BARS - 1) * gap) / BARS
    const graph = graphRef.current
    let live: Uint8Array<ArrayBuffer> | null = null
    if (graph && playing) {
      graph.analyser.getByteFrequencyData(graph.data)
      live = graph.data
    }
    const prog = progRef.current
    for (let i = 0; i < BARS; i++) {
      let v: number
      if (live) {
        const idx = Math.floor((i / BARS) * live.length)
        v = Math.max(0.06, live[idx] / 255)
      } else {
        v = staticBars.current[i] * 0.62
      }
      const bh = Math.max(3, v * h)
      const x = i * (bw + gap)
      const y = (h - bh) / 2
      const played = i / BARS <= prog
      c.fillStyle = played ? 'rgba(31,107,74,0.95)' : 'rgba(31,107,74,0.2)'
      const r = Math.min(bw / 2, 2)
      c.beginPath()
      c.roundRect(x, y, bw, bh, r)
      c.fill()
    }
  }, [playing])

  useEffect(() => {
    if (!playing) {
      draw()
      return
    }
    const loop = () => {
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, draw])

  useEffect(() => {
    return () => {
      graphRef.current?.ac.close().catch(() => {})
    }
  }, [])

  const ensureGraph = () => {
    if (graphRef.current || !audioRef.current) return
    const AC: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    try {
      const ac = new AC()
      const source = ac.createMediaElementSource(audioRef.current)
      const analyser = ac.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.75
      source.connect(analyser)
      analyser.connect(ac.destination)
      graphRef.current = { ac, analyser, data: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)) }
    } catch {
      /* 跨域音频无法做频谱时，降级为伪波形 */
    }
  }

  const toggle = async () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      ensureGraph()
      await graphRef.current?.ac.resume().catch(() => {})
      await a.play().catch(() => {})
    } else {
      a.pause()
    }
  }

  const seek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const a = audioRef.current
    const canvas = canvasRef.current
    if (!a || !canvas || !dur) return
    const rect = canvas.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    a.currentTime = frac * dur
  }

  return (
    <div className="tp-podcast">
      <div className="tp-podcast-cover">
        <Mic size={20} />
      </div>
      <div className="tp-podcast-body">
        <div className="tp-podcast-meta">
          <span className="tp-podcast-badge">{label}</span>
          <span className="tp-podcast-title">{title || '未命名播客'}</span>
        </div>
        <div className="tp-podcast-controls">
          <button className="tp-podcast-play" onClick={toggle} aria-label={playing ? '暂停' : '播放'}>
            {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          </button>
          <canvas
            ref={canvasRef}
            className="tp-podcast-wave"
            width={620}
            height={56}
            onClick={seek}
          />
          <span className="tp-podcast-time">
            {fmt(cur)} / {fmt(dur)}
          </span>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          progRef.current = 0
        }}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget
          setCur(a.currentTime)
          progRef.current = a.duration ? a.currentTime / a.duration : 0
        }}
      />
    </div>
  )
}
