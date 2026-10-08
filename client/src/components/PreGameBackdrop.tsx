type Props = {
  /** Show decorative hero illustration (login / char select). */
  hero?: boolean
  /** Slow drifting tile animation (loading splash). */
  animateTiles?: boolean
}

export function PreGameBackdrop({ hero = false, animateTiles = false }: Props) {
  return (
    <>
      <div
        className={`pregame-tiles${animateTiles ? ' pregame-tiles--animate' : ''}`}
        aria-hidden
      />
      <div className="pregame-vignette" aria-hidden />
      {hero ? (
        <img
          className="pregame-hero"
          src="/ui/pregame-hero.svg"
          alt=""
          draggable={false}
          aria-hidden
        />
      ) : null}
    </>
  )
}
