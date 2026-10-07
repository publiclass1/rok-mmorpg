import { useEffect, useState } from 'react'

type Celebrate = {
  id: number
  kind: 'base' | 'job'
  level: number
}

type Props = {
  celebrate: Celebrate | null
}

export function LevelUpBannerOverlay({ celebrate }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!celebrate) {
      setVisible(false)
      return
    }
    setVisible(true)
    const id = window.setTimeout(() => setVisible(false), 2000)
    return () => window.clearTimeout(id)
  }, [celebrate?.id])

  if (!celebrate || !visible) return null

  const isBase = celebrate.kind === 'base'
  const title = isBase ? 'LEVEL UP!' : 'JOB LEVEL UP!'
  const levelLabel = isBase ? `Lv ${celebrate.level}` : `Job Lv ${celebrate.level}`

  return (
    <div
      className={`level-up-banner-overlay level-up-banner-overlay--${celebrate.kind}`}
      aria-live="assertive"
    >
      <div className="level-up-banner-overlay__inner">
        <p className="level-up-banner-overlay__title">{title}</p>
        <p className="level-up-banner-overlay__level">{levelLabel}</p>
      </div>
    </div>
  )
}
