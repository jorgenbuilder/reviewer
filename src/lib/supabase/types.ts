// Database types for Supabase client
// These match the tables defined in supabase/migrations/

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      push_subscriptions: {
        Row: {
          id: string
          endpoint: string
          p256dh: string
          auth: string
          email: string | null
          topics: number[] | null
          created_at: string
          last_success: string | null
        }
        Insert: {
          id?: string
          endpoint: string
          p256dh: string
          auth: string
          email?: string | null
          topics?: number[] | null
          created_at?: string
          last_success?: string | null
        }
        Update: {
          id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          email?: string | null
          topics?: number[] | null
          created_at?: string
          last_success?: string | null
        }
        Relationships: []
      }
      proposal_events: {
        Row: {
          id: number
          proposal_id: number
          event_type: string
          detail: string | null
          created_at: string
        }
        Insert: {
          id?: number
          proposal_id: number
          event_type: string
          detail?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          proposal_id?: number
          event_type?: string
          detail?: string | null
          created_at?: string
        }
        Relationships: []
      }
      proposals_seen: {
        Row: {
          proposal_id: number
          topic: string
          title: string | null
          seen_at: string
          notified: boolean
          commit_hash: string | null
          proposal_url: string | null
          viewer_seen_at: string | null
          review_forum_url: string | null
          reviewed_at: string | null
          proposal_timestamp: string | null
          lines_added: number | null
          lines_removed: number | null
          verification_triggered_at: string | null
          review_post_state: string | null
          review_post_url: string | null
          review_flagged_reason: string | null
          review_posted_at: string | null
          planned_vote_at: string | null
          urgency: number | null
          urgency_evidence: string | null
          urgency_source: string | null
          urgency_model: string | null
          urgency_extracted_at: string | null
        }
        Insert: {
          proposal_id: number
          topic: string
          title?: string | null
          seen_at?: string
          notified?: boolean
          commit_hash?: string | null
          proposal_url?: string | null
          viewer_seen_at?: string | null
          review_forum_url?: string | null
          reviewed_at?: string | null
          proposal_timestamp?: string | null
          lines_added?: number | null
          lines_removed?: number | null
          verification_triggered_at?: string | null
          review_post_state?: string | null
          review_post_url?: string | null
          review_flagged_reason?: string | null
          review_posted_at?: string | null
          planned_vote_at?: string | null
          urgency?: number | null
          urgency_evidence?: string | null
          urgency_source?: string | null
          urgency_model?: string | null
          urgency_extracted_at?: string | null
        }
        Update: {
          proposal_id?: number
          topic?: string
          title?: string | null
          seen_at?: string
          notified?: boolean
          commit_hash?: string | null
          proposal_url?: string | null
          viewer_seen_at?: string | null
          review_forum_url?: string | null
          reviewed_at?: string | null
          proposal_timestamp?: string | null
          lines_added?: number | null
          lines_removed?: number | null
          verification_triggered_at?: string | null
          review_post_state?: string | null
          review_post_url?: string | null
          review_flagged_reason?: string | null
          review_posted_at?: string | null
          planned_vote_at?: string | null
          urgency?: number | null
          urgency_evidence?: string | null
          urgency_source?: string | null
          urgency_model?: string | null
          urgency_extracted_at?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          id: string
          proposal_id: number
          subscription_id: string
          channel: string
          status: string
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proposal_id: number
          subscription_id: string
          channel: string
          status: string
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proposal_id?: number
          subscription_id?: string
          channel?: string
          status?: string
          error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      proposal_forum_threads: {
        Row: {
          id: string
          proposal_id: string
          forum_url: string
          thread_title: string | null
          added_at: string
          is_canonical: boolean
        }
        Insert: {
          id?: string
          proposal_id: string
          forum_url: string
          thread_title?: string | null
          added_at?: string
          is_canonical?: boolean
        }
        Update: {
          id?: string
          proposal_id?: string
          forum_url?: string
          thread_title?: string | null
          added_at?: string
          is_canonical?: boolean
        }
        Relationships: []
      }
      proposal_commentaries: {
        Row: {
          id: string
          proposal_id: number
          title: string | null
          canister_id: string | null
          analysis_incomplete: boolean
          incomplete_reason: string | null
          cost_usd: number | null
          duration_ms: number | null
          turns: number | null
          input_tokens: number | null
          output_tokens: number | null
          cache_read_tokens: number | null
          cache_creation_tokens: number | null
          commentary_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          proposal_id: number
          title?: string | null
          canister_id?: string | null
          analysis_incomplete?: boolean
          incomplete_reason?: string | null
          cost_usd?: number | null
          duration_ms?: number | null
          turns?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          cache_read_tokens?: number | null
          cache_creation_tokens?: number | null
          commentary_data: Json
          created_at?: string
        }
        Update: {
          id?: string
          proposal_id?: number
          title?: string | null
          canister_id?: string | null
          analysis_incomplete?: boolean
          incomplete_reason?: string | null
          cost_usd?: number | null
          duration_ms?: number | null
          turns?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          cache_read_tokens?: number | null
          cache_creation_tokens?: number | null
          commentary_data?: Json
          created_at?: string
        }
        Relationships: []
      }
      forum_cookies: {
        Row: {
          id: string
          cookies_encrypted: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          cookies_encrypted: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          cookies_encrypted?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      forum_search_log: {
        Row: {
          id: string
          proposal_id: string
          search_query: string
          results_count: number
          selected_url: string | null
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          search_query: string
          results_count: number
          selected_url?: string | null
          status: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          search_query?: string
          results_count?: number
          selected_url?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      review_session_costs: {
        Row: {
          proposal_id: number
          session_id: string
          source: string
          input_tokens: number
          output_tokens: number
          cache_read_tokens: number
          cache_creation_tokens: number
          cost_usd: number
          model: string | null
          first_seen_at: string
          updated_at: string
        }
        Insert: {
          proposal_id: number
          session_id: string
          source?: string
          input_tokens?: number
          output_tokens?: number
          cache_read_tokens?: number
          cache_creation_tokens?: number
          cost_usd?: number
          model?: string | null
          first_seen_at?: string
          updated_at?: string
        }
        Update: {
          proposal_id?: number
          session_id?: string
          source?: string
          input_tokens?: number
          output_tokens?: number
          cache_read_tokens?: number
          cache_creation_tokens?: number
          cost_usd?: number
          model?: string | null
          first_seen_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      review_session_claims: {
        Row: {
          session_id: string
          proposal_id: number
          claimed_at: string
        }
        Insert: {
          session_id: string
          proposal_id: number
          claimed_at?: string
        }
        Update: {
          session_id?: string
          proposal_id?: number
          claimed_at?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types for table rows
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row']
export type ProposalSeen = Database['public']['Tables']['proposals_seen']['Row']
export type NotificationLog = Database['public']['Tables']['notification_log']['Row']
export type ProposalForumThread = Database['public']['Tables']['proposal_forum_threads']['Row']
export type ProposalCommentary = Database['public']['Tables']['proposal_commentaries']['Row']
export type ForumCookies = Database['public']['Tables']['forum_cookies']['Row']
export type ForumSearchLog = Database['public']['Tables']['forum_search_log']['Row']
