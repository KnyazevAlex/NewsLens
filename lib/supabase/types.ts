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
      sources: {
        Row: {
          id: string
          name: string
          listing_url: string
          parser_strategy: string | null
          logo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          listing_url: string
          parser_strategy?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          listing_url?: string
          parser_strategy?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          id: string
          source_id: string
          original_url: string
          canonical_url: string | null
          title: string
          description: string | null
          image_url: string
          published_at: string
          raw_text: string
          categories: string[]
          region: string | null
          author: string | null
          scraped_at: string
          analyzed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_id: string
          original_url: string
          canonical_url?: string | null
          title: string
          description?: string | null
          image_url: string
          published_at: string
          raw_text: string
          categories?: string[]
          region?: string | null
          author?: string | null
          scraped_at?: string
          analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          original_url?: string
          canonical_url?: string | null
          title?: string
          description?: string | null
          image_url?: string
          published_at?: string
          raw_text?: string
          categories?: string[]
          region?: string | null
          author?: string | null
          scraped_at?: string
          analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      article_analyses: {
        Row: {
          id: string
          article_id: string
          summary: string
          sentiment_score: number
          sentiment_label: "positive" | "neutral" | "negative"
          bias_score: number
          bias_label: "left" | "center" | "right" | "mixed" | "unclear"
          left_percentage: number
          center_percentage: number
          right_percentage: number
          confidence: number
          framing_notes: string[]
          loaded_terms: string[]
          disclaimer: string
          model: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          article_id: string
          summary: string
          sentiment_score: number
          sentiment_label: "positive" | "neutral" | "negative"
          bias_score: number
          bias_label: "left" | "center" | "right" | "mixed" | "unclear"
          left_percentage: number
          center_percentage: number
          right_percentage: number
          confidence: number
          framing_notes?: string[]
          loaded_terms?: string[]
          disclaimer: string
          model: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          summary?: string
          sentiment_score?: number
          sentiment_label?: "positive" | "neutral" | "negative"
          bias_score?: number
          bias_label?: "left" | "center" | "right" | "mixed" | "unclear"
          left_percentage?: number
          center_percentage?: number
          right_percentage?: number
          confidence?: number
          framing_notes?: string[]
          loaded_terms?: string[]
          disclaimer?: string
          model?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_analyses_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          id: string
          level: "debug" | "info" | "warning" | "error" | "success"
          event: string
          message: string
          metadata: Json
          source_id: string | null
          article_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          level?: "debug" | "info" | "warning" | "error" | "success"
          event: string
          message: string
          metadata?: Json
          source_id?: string | null
          article_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          level?: "debug" | "info" | "warning" | "error" | "success"
          event?: string
          message?: string
          metadata?: Json
          source_id?: string | null
          article_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      oxylabs_schedules: {
        Row: {
          id: string
          source_id: string
          oxylabs_schedule_id: string | null
          status: "pending" | "active" | "paused" | "error" | "deleted"
          is_active: boolean
          schedule_expression: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_id: string
          oxylabs_schedule_id?: string | null
          status?: "pending" | "active" | "paused" | "error" | "deleted"
          is_active?: boolean
          schedule_expression?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          oxylabs_schedule_id?: string | null
          status?: "pending" | "active" | "paused" | "error" | "deleted"
          is_active?: boolean
          schedule_expression?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oxylabs_schedules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: true
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      oxylabs_schedule_runs: {
        Row: {
          id: string
          schedule_id: string
          oxylabs_run_id: string | null
          result_status: "pending" | "running" | "done" | "failed" | "cancelled"
          summary: Json
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          oxylabs_run_id?: string | null
          result_status?: "pending" | "running" | "done" | "failed" | "cancelled"
          summary?: Json
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          oxylabs_run_id?: string | null
          result_status?: "pending" | "running" | "done" | "failed" | "cancelled"
          summary?: Json
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oxylabs_schedule_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "oxylabs_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

