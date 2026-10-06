export type CharacterRow = {
  id: string
  user_id: string
  name: string
  slot: number
  map_id: string
  x: number
  y: number
  zeny: number
  created_at: string
}

export type NpcRow = {
  id: string
  map_id: string
  x: number
  y: number
  npc_type: 'teleport' | 'storage' | 'save'
  label: string
  config: {
    destinations?: Array<{ map_id: string; label: string; x: number; y: number }>
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
        }
        Update: Partial<Pick<CharacterRow, 'map_id' | 'x' | 'y' | 'zeny' | 'name'>>
      }
      npc_definitions: { Row: NpcRow; Insert: NpcRow; Update: Partial<NpcRow> }
      character_inventory: { Row: InventoryRow; Insert: Partial<InventoryRow>; Update: Partial<InventoryRow> }
      account_storage: { Row: StorageRow; Insert: Partial<StorageRow>; Update: Partial<StorageRow> }
      items: { Row: ItemRow; Insert: ItemRow; Update: Partial<ItemRow> }
      trade_sessions: { Row: TradeSessionRow; Insert: Partial<TradeSessionRow>; Update: Partial<TradeSessionRow> }
      trade_offers: { Row: TradeOfferRow; Insert: Partial<TradeOfferRow>; Update: Partial<TradeOfferRow> }
    }
  }
}
