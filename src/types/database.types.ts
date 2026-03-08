// Auto-generated placeholder. Run `supabase gen types typescript` after schema
// is live to replace.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          packs_available: number
          last_pack_regen: string
          pity_counter: number
          total_packs_opened: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          packs_available?: number
          last_pack_regen?: string
          pity_counter?: number
          total_packs_opened?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          packs_available?: number
          last_pack_regen?: string
          pity_counter?: number
          total_packs_opened?: number
          created_at?: string
          updated_at?: string
        }
      }
      card_pool: {
        Row: {
          id: string
          tmdb_id: number
          card_type: "movie" | "actor" | "director" | "studio"
          name: string
          image_path: string | null
          rarity: "C" | "UC" | "R" | "SR" | "SSR" | "UR" | "LR"
          atk: number
          def: number
          metadata: Json
          pool_updated_at: string
        }
        Insert: {
          id: string
          tmdb_id: number
          card_type: "movie" | "actor" | "director" | "studio"
          name: string
          image_path?: string | null
          rarity: "C" | "UC" | "R" | "SR" | "SSR" | "UR" | "LR"
          atk: number
          def: number
          metadata?: Json
          pool_updated_at?: string
        }
        Update: {
          id?: string
          tmdb_id?: number
          card_type?: "movie" | "actor" | "director" | "studio"
          name?: string
          image_path?: string | null
          rarity?: "C" | "UC" | "R" | "SR" | "SSR" | "UR" | "LR"
          atk?: number
          def?: number
          metadata?: Json
          pool_updated_at?: string
        }
      }
      user_cards: {
        Row: {
          id: string
          user_id: string
          card_id: string
          stars: number
          obtained_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_id: string
          stars?: number
          obtained_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_id?: string
          stars?: number
          obtained_at?: string
        }
      }
      albums: {
        Row: {
          id: string
          name: string
          description: string | null
          genre_id: number | null
          card_ids: string[]
          reward_description: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          genre_id?: number | null
          card_ids?: string[]
          reward_description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          genre_id?: number | null
          card_ids?: string[]
          reward_description?: string | null
          created_at?: string
        }
      }
      user_album_progress: {
        Row: {
          id: string
          user_id: string
          album_id: string
          completed_at: string | null
          reward_claimed: boolean
        }
        Insert: {
          id?: string
          user_id: string
          album_id: string
          completed_at?: string | null
          reward_claimed?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          album_id?: string
          completed_at?: string | null
          reward_claimed?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
