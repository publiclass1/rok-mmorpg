import type { CharacterRow, PartyRequestRow, PartyRow } from '../types/database'
import {
  appearanceFromCharacterRow,
  type CharacterAppearance,
} from '../game/character/characterAppearance'
import { derivedMaxHp, derivedMaxMp } from '../game/character/statFormulas'
import { apiFetch } from './http'
import { partyManage } from './api'

export const MAX_PARTY_SIZE = 20

export type PartyMemberVitals = {
  hp: number
  hpMax: number
  mp: number
  mpMax: number
}

export type PartyMemberInfo = {
  characterId: string
  name: string
  appearance: CharacterAppearance
  jobId: string
  baseLevel: number
  jobLevel: number
  hp: number | null
  mp: number | null
  vit: number
  statInt: number
  isLeader: boolean
}

export type PartyApplicantInfo = {
  request: PartyRequestRow
  characterId: string
  name: string
  appearance: CharacterAppearance
  jobId: string
  baseLevel: number
  jobLevel: number
}

export type PartySnapshot = {
  party: PartyRow
  members: PartyMemberInfo[]
  pendingApplications: PartyApplicantInfo[]
} | null

type PartyCharacterApi = {
  id: string
  name: string
  gender?: CharacterRow['gender']
  body_color?: number
  hair_color?: number
  eye_color?: number
  clothes_color?: number
  job_id?: string
  base_level?: number
  job_level?: number
  hp?: number | null
  mp?: number | null
  vit?: number
  stat_int?: number
}

function rowFromPartyCharacterApi(c: PartyCharacterApi): CharacterRow {
  return {
    id: c.id,
    user_id: '',
    name: c.name,
    slot: 0,
    map_id: 'prontera',
    x: 0,
    y: 0,
    zeny: 0,
    gender: c.gender,
    body_color: c.body_color,
    hair_color: c.hair_color,
    eye_color: c.eye_color,
    clothes_color: c.clothes_color,
    created_at: '',
  }
}

function memberFromCharacterApi(c: PartyCharacterApi, leaderId: string): PartyMemberInfo {
  return {
    characterId: c.id,
    name: c.name,
    appearance: appearanceFromCharacterRow(rowFromPartyCharacterApi(c)),
    jobId: c.job_id ?? 'novice',
    baseLevel: c.base_level ?? 1,
    jobLevel: c.job_level ?? 1,
    hp: c.hp ?? null,
    mp: c.mp ?? null,
    vit: c.vit ?? 1,
    statInt: c.stat_int ?? 1,
    isLeader: c.id === leaderId,
  }
}

export function approximateMemberVitals(member: PartyMemberInfo): PartyMemberVitals {
  const hpMax = derivedMaxHp(member.jobId, member.baseLevel, member.vit)
  const mpMax = derivedMaxMp(member.jobId, member.baseLevel, member.statInt)
  return {
    hp: member.hp ?? hpMax,
    mp: member.mp ?? mpMax,
    hpMax,
    mpMax,
  }
}

export async function loadPartyForCharacter(characterId: string): Promise<PartySnapshot> {
  const data = await apiFetch<{
    party: PartyRow | null
    characters: PartyCharacterApi[]
    members: Array<{ character_id: string }>
    pending_applications?: Array<PartyRequestRow & { from_character: PartyCharacterApi }>
  }>(`/api/party/me?characterId=${encodeURIComponent(characterId)}`)

  if (!data.party) return null

  const charById = new Map((data.characters ?? []).map((c) => [c.id, c]))
  const leaderId = data.party.leader_character_id
  const members: PartyMemberInfo[] = (data.members ?? []).map((m) => {
    const c = charById.get(m.character_id)
    if (c) return memberFromCharacterApi(c, leaderId)
    return {
      characterId: m.character_id,
      name: 'Adventurer',
      appearance: appearanceFromCharacterRow(rowFromPartyCharacterApi({ id: m.character_id, name: 'Adventurer' })),
      jobId: 'novice',
      baseLevel: 1,
      jobLevel: 1,
      hp: null,
      mp: null,
      vit: 1,
      statInt: 1,
      isLeader: m.character_id === leaderId,
    }
  })

  const pendingApplications: PartyApplicantInfo[] = (data.pending_applications ?? []).map((row) => {
    const from = row.from_character
    return {
      request: row,
      characterId: from.id,
      name: from.name,
      appearance: appearanceFromCharacterRow(rowFromPartyCharacterApi(from)),
      jobId: from.job_id ?? 'novice',
      baseLevel: from.base_level ?? 1,
      jobLevel: from.job_level ?? 1,
    }
  })

  return { party: data.party, members, pendingApplications }
}

export async function loadPendingPartyRequests(characterId: string): Promise<PartyRequestRow[]> {
  const data = await apiFetch<{ requests: PartyRequestRow[] }>(
    `/api/party/requests?characterId=${encodeURIComponent(characterId)}`,
  )
  return data.requests ?? []
}

export function partyMemberIds(snapshot: PartySnapshot): string[] {
  return snapshot?.members.map((m) => m.characterId) ?? []
}

export async function createParty(characterId: string, name: string): Promise<void> {
  await partyManage({ action: 'create', characterId, name: name.trim() })
}
