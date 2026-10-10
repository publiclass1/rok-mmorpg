/** Client-spawned drops (dungeon MVP gear) — not in field_map_drops. */
export function isEphemeralMapDropId(dropId: string): boolean {
  return dropId.startsWith('mvpdrop_')
}
