export function isChatStripInputFocused(): boolean {
  const el = document.activeElement
  return el instanceof HTMLInputElement && el.classList.contains('chat-strip-input')
}
