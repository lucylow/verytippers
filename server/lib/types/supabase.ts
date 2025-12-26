/**
 * TypeScript types for Supabase database tables
 * 
 * These types are manually defined based on the database schema.
 * For production, consider using Supabase CLI to generate types:
 * npx supabase gen types typescript --project-id your-project-id > types/supabase.ts
 */

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
      users: {
        Row: {
          id: string
          created_at: string
          username: string | null
          wallet_address: string | null
          display_name: string | null
          avatar_url: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          username?: string | null
          wallet_address?: string | null
          display_name?: string | null
          avatar_url?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          username?: string | null
          wallet_address?: string | null
          display_name?: string | null
          avatar_url?: string | null
          metadata?: Json | null
        }
      }
      ipfs_messages: {
        Row: {
          id: string
          cid: string
          encrypted: boolean
          length: number | null
          created_at: string
          author_id: string | null
        }
        Insert: {
          id?: string
          cid: string
          encrypted?: boolean
          length?: number | null
          created_at?: string
          author_id?: string | null
        }
        Update: {
          id?: string
          cid?: string
          encrypted?: boolean
          length?: number | null
          created_at?: string
          author_id?: string | null
        }
      }
      tips: {
        Row: {
          id: string
          created_at: string
          from_user: string
          to_user: string
          amount: string // numeric(30, 18)
          cid_id: string | null
          meta_tx: Json | null
          status: 'pending' | 'submitted' | 'confirmed' | 'failed'
          relayer_tx_hash: string | null
          confirmations: number
          chain_network: string
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          from_user: string
          to_user: string
          amount: string | number
          cid_id?: string | null
          meta_tx?: Json | null
          status?: 'pending' | 'submitted' | 'confirmed' | 'failed'
          relayer_tx_hash?: string | null
          confirmations?: number
          chain_network?: string
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          from_user?: string
          to_user?: string
          amount?: string | number
          cid_id?: string | null
          meta_tx?: Json | null
          status?: 'pending' | 'submitted' | 'confirmed' | 'failed'
          relayer_tx_hash?: string | null
          confirmations?: number
          chain_network?: string
          notes?: string | null
        }
      }
      meta_tx_queue: {
        Row: {
          id: number
          created_at: string
          tip_id: string | null
          user_id?: string | null
          to_address?: string | null
          amount?: number | null
          cid?: string | null
          nonce?: number | null
          payload: Json | null
          priority: number
          status: 'queued' | 'processing' | 'done' | 'failed'
          tx_hash?: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          tip_id?: string | null
          user_id?: string | null
          to_address?: string | null
          amount?: number | null
          cid?: string | null
          nonce?: number | null
          payload?: Json | null
          priority?: number
          status?: 'queued' | 'processing' | 'done' | 'failed'
          tx_hash?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          tip_id?: string | null
          user_id?: string | null
          to_address?: string | null
          amount?: number | null
          cid?: string | null
          nonce?: number | null
          payload?: Json | null
          priority?: number
          status?: 'queued' | 'processing' | 'done' | 'failed'
          tx_hash?: string | null
        }
      }
      relayer_logs: {
        Row: {
          id: number
          created_at: string
          tip_id: string | null
          action: string | null
          actor: string | null
          detail: Json | null
        }
        Insert: {
          id?: number
          created_at?: string
          tip_id?: string | null
          action?: string | null
          actor?: string | null
          detail?: Json | null
        }
        Update: {
          id?: number
          created_at?: string
          tip_id?: string | null
          action?: string | null
          actor?: string | null
          detail?: Json | null
        }
      }
      leaderboards: {
        Row: {
          user_id: string
          total_received: string // numeric
          total_sent: string // numeric
          tip_count: number
          updated_at: string
        }
        Insert: {
          user_id: string
          total_received?: string | number
          total_sent?: string | number
          tip_count?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          total_received?: string | number
          total_sent?: string | number
          tip_count?: number
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          created_at: string
          user_id: string
          amount_cents: number
          credits: number
          stripe_session_id: string
          status: 'pending' | 'paid' | 'failed'
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          amount_cents: number
          credits: number
          stripe_session_id: string
          status?: 'pending' | 'paid' | 'failed'
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          amount_cents?: number
          credits?: number
          stripe_session_id?: string
          status?: 'pending' | 'paid' | 'failed'
          updated_at?: string
        }
      }
      balances: {
        Row: {
          id?: string
          user_id: string
          credits: number
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          credits: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          credits?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      update_tip_confirmation: {
        Args: {
          p_tip_id: string
          p_tx_hash: string
          p_confirmations?: number
          p_status?: string
        }
        Returns: {
          id: string
          status: string
          relayer_tx_hash: string | null
          confirmations: number
        } | null
      }
    }
  }
}

// Convenience type exports
export type User = Database['public']['Tables']['users']['Row']
export type Tip = Database['public']['Tables']['tips']['Row']
export type MetaTxQueueItem = Database['public']['Tables']['meta_tx_queue']['Row']
export type IPFSMessage = Database['public']['Tables']['ipfs_messages']['Row']
export type Leaderboard = Database['public']['Tables']['leaderboards']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type Balance = Database['public']['Tables']['balances']['Row']

