import type { createServiceClient } from './supabase.ts'

export async function writeAuditLog(
  service: ReturnType<typeof createServiceClient>,
  characterId: string,
  eventType: string,
  detail: Record<string, unknown>,
): Promise<void> {
  await service.from('character_audit_log').insert({
    character_id: characterId,
    event_type: eventType,
    detail,
  })
}
