const STORAGE_KEY = 'adminPanelPassword'

export function getAdminPassword(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAdminPassword(password: string): void {
  sessionStorage.setItem(STORAGE_KEY, password)
}

export function clearAdminPassword(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
