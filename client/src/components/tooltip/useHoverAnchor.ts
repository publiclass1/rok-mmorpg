import { useCallback, useState } from 'react'

export function useHoverAnchor() {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  const onMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget.getBoundingClientRect())
  }, [])

  const onMouseLeave = useCallback(() => {
    setAnchor(null)
  }, [])

  return { anchor, onMouseEnter, onMouseLeave }
}
