import { useCallback, useRef, useState } from 'react'

// 把产出（图/视频/音频/3D）按当前会话隔离：切换会话时各看各的。
export function useThreadScoped<T>(keyOf: (t: T) => string) {
  const [byThread, setByThread] = useState<Record<string, T[]>>({})
  const [activeId, setActiveId] = useState('__main__')
  const activeRef = useRef('__main__')

  const setActive = useCallback((id: string) => {
    activeRef.current = id
    setActiveId(id)
  }, [])

  const add = useCallback(
    (item: T) => {
      const id = activeRef.current || '__main__'
      setByThread((prev) => {
        const arr = prev[id] || []
        if (arr.some((x) => keyOf(x) === keyOf(item))) return prev
        return { ...prev, [id]: [...arr, item] }
      })
    },
    [keyOf],
  )

  const items = byThread[activeId] || []
  return { items, add, setActive }
}
