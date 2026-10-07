export type CharacterGender = 'male' | 'female'

export type CharacterRow = {
  id: string
  user_id: string
  name: string
  slot: number
  map_id: string
  x: number
  y: number
  zeny: number
  is_gm?: boolean
  gender?: CharacterGender
  body_color?: number
  hair_color?: number
  eye_color?: number
  clothes_color?: number
  created_at: string
}

export type NpcRow = {
  id: string
  map_id: string
  x: number
  y: number
  npc_type: 'teleport' | 'storage' | 'save' | 'job_master' | 'shop' | 'healer' | 'dungeon' | 'rental'
  label: string
  config: {
    destinations?: Array<{ map_id: string; label: string; x: number; y: number; category?: string }>
    offers?: Array<{
      jobId: string
      fromJobId?: string
      requiredJobLevel?: number
      requiredBaseLevel?: number
      zenyCost?: number
    }>
    stock?: Array<{ itemId: string; price: number }>
    buys?: Array<{ itemId: string; price: number }>
    /** When `rarityTabs`, shop UI groups stock by item `rarity` in content. */
    shopLayout?: 'rarityTabs'
    zenyCost?: number
    spriteKey?: string
    facing?: 'up' | 'down' | 'left' | 'right'
    guildName?: string
    guildIcon?: string
  }
}

export type InventoryRow = {
  id: string
  character_id: string
  item_id: string
  quantity: number
}

export type StorageRow = {
  id: string
  user_id: string
  item_id: string
  quantity: number
}

export type ItemRow = {
  id: string
  name: string
  stack_max: number
  item_type?: string | null
  weight?: number | null
  equip_slot?: string | null
  metadata?: Record<string, unknown>
}

export type CharacterProgressRow = {
  character_id: string
  job_id: string
  base_level: number
  base_exp: number
  job_level: number
  job_exp: number
  str: number
  agi: number
  vit: number
  stat_int: number
  dex: number
  luk: number
  stat_points_unspent: number
  skill_points_unspent: number
  hp: number | null
  mp: number | null
  skill_bar: unknown
  session_inventory: unknown
  rolled_items?: unknown
  updated_at: string
}

export type CharacterSkillRow = {
  character_id: string
  skill_id: string
  level: number
}

export type CharacterEquipmentRow = {
  character_id: string
  slot: string
  item_id: string
  instance_id?: string | null
}

export type DungeonInstanceRow = {
  id: string
  party_id: string
  floor_id: string
  map_id: string
  status: 'active' | 'mvp' | 'cleared'
  killed_spawns: number[]
  total_spawns: number
  mvp_alive: boolean
  created_at: string
  updated_at: string
}

export type TradeSessionRow = {
  id: string
  initiator_character_id: string
  partner_character_id: string
  state: 'pending' | 'open' | 'locked' | 'completed' | 'cancelled'
  initiator_confirmed: boolean
  partner_confirmed: boolean
  created_at: string
  updated_at: string
}

export type TradeOfferRow = {
  id: string
  trade_session_id: string
  character_id: string
  item_id: string | null
  quantity: number
  zeny: number
}

export type PartyRow = {
  id: string
  leader_character_id: string
  name: string
  exp_share: boolean
  created_at: string
  updated_at: string
}

export type PartyMemberRow = {
  party_id: string
  character_id: string
  joined_at: string
}

export type PartyRequestRow = {
  id: string
  party_id: string
  from_character_id: string
  to_character_id: string
  kind: 'invite' | 'apply'
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  created_at: string
  updated_at: string
}

export type DuelSessionRow = {
  id: string
  challenger_character_id: string
  opponent_character_id: string
  state: 'pending' | 'countdown' | 'active' | 'completed' | 'declined' | 'cancelled'
  map_id: string
  fight_starts_at: string | null
  challenger_name: string
  challenger_job_id: string
  challenger_base_level: number
  challenger_snapshot: unknown
  opponent_snapshot: unknown
  challenger_hp: number | null
  opponent_hp: number | null
  challenger_hp_max: number | null
  opponent_hp_max: number | null
  last_attack_at: string | null
  winner_character_id: string | null
  created_at: string
  updated_at: string
}

export type GuildRow = {
  id: string
  name: string
  tag: string
  leader_character_id: string
  created_at: string
}

export type GuildMemberRow = {
  guild_id: string
  character_id: string
  role: 'leader' | 'member'
  joined_at: string
}

export type VendorStallRow = {
  character_id: string
  title: string
  map_id: string
  x: number
  y: number
  is_open: boolean
  updated_at: string
}

export type VendorListingRow = {
  id: string
  character_id: string
  item_id: string
  price: number
  quantity: number
}

export type Database = {
  public: {
    Tables: {
      characters: {
        Row: CharacterRow
        Insert: {
          user_id: string
          name: string
          slot: number
          map_id?: string
          x?: number
          y?: number
          zeny?: number
          gender?: CharacterGender
          body_color?: number
          hair_color?: number
          eye_color?: number
          clothes_color?: number
        }
        Update: Partial<
          Pick<
            CharacterRow,
            | 'map_id'
            | 'x'
            | 'y'
            | 'zeny'
            | 'name'
            | 'gender'
            | 'body_color'
            | 'hair_color'
            | 'eye_color'
            | 'clothes_color'
          >
        >
      }
      npc_definitions: { Row: NpcRow; Insert: NpcRow; Update: Partial<NpcRow> }
      character_inventory: { Row: InventoryRow; Insert: Partial<InventoryRow>; Update: Partial<InventoryRow> }
      account_storage: { Row: StorageRow; Insert: Partial<StorageRow>; Update: Partial<StorageRow> }
      items: { Row: ItemRow; Insert: ItemRow; Update: Partial<ItemRow> }
      character_progress: {
        Row: CharacterProgressRow
        Insert: Partial<CharacterProgressRow> & { character_id: string }
        Update: Partial<CharacterProgressRow>
      }
      character_skills: {
        Row: CharacterSkillRow
        Insert: Partial<CharacterSkillRow> & { character_id: string; skill_id: string; level: number }
        Update: Partial<CharacterSkillRow>
      }
      character_equipment: {
        Row: CharacterEquipmentRow
        Insert: Partial<CharacterEquipmentRow> & { character_id: string; slot: string; item_id: string }
        Update: Partial<CharacterEquipmentRow>
      }
      trade_sessions: { Row: TradeSessionRow; Insert: Partial<TradeSessionRow>; Update: Partial<TradeSessionRow> }
      trade_offers: { Row: TradeOfferRow; Insert: Partial<TradeOfferRow>; Update: Partial<TradeOfferRow> }
      parties: { Row: PartyRow; Insert: Partial<PartyRow>; Update: Partial<PartyRow> }
      party_members: { Row: PartyMemberRow; Insert: Partial<PartyMemberRow>; Update: Partial<PartyMemberRow> }
      party_requests: { Row: PartyRequestRow; Insert: Partial<PartyRequestRow>; Update: Partial<PartyRequestRow> }
      duel_sessions: { Row: DuelSessionRow; Insert: Partial<DuelSessionRow>; Update: Partial<DuelSessionRow> }
      guilds: { Row: GuildRow; Insert: Partial<GuildRow>; Update: Partial<GuildRow> }
      guild_members: { Row: GuildMemberRow; Insert: Partial<GuildMemberRow>; Update: Partial<GuildMemberRow> }
      vendor_stalls: { Row: VendorStallRow; Insert: Partial<VendorStallRow>; Update: Partial<VendorStallRow> }
      vendor_listings: { Row: VendorListingRow; Insert: Partial<VendorListingRow>; Update: Partial<VendorListingRow> }
    }
  }
}
