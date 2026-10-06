export const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18 },
}

export const panelMotion = {
  initial: { opacity: 0, scale: 0.96, y: 14 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 8 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 32 },
}

export const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.22 },
}

export const hudEnterMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
}
