export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone: string | null
          wechat_id: string | null
          created_at: string
          last_active_at: string
        }
        Insert: {
          id: string
          phone?: string | null
          wechat_id?: string | null
          created_at?: string
          last_active_at?: string
        }
        Update: {
          phone?: string | null
          wechat_id?: string | null
          last_active_at?: string
        }
        Relationships: []
      }
      monitor_configs: {
        Row: {
          id: string
          user_id: string
          platform: 'zhubajie' | 'proginn'
          keywords: string[]
          min_budget: number | null
          notify_channel: 'feishu' | 'wechat'
          notify_target: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: 'zhubajie' | 'proginn'
          keywords: string[]
          min_budget?: number | null
          notify_channel: 'feishu' | 'wechat'
          notify_target: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          platform?: 'zhubajie' | 'proginn'
          keywords?: string[]
          min_budget?: number | null
          notify_channel?: 'feishu' | 'wechat'
          notify_target?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "monitor_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      jobs: {
        Row: {
          id: string
          platform: 'zhubajie' | 'proginn'
          external_id: string
          title: string
          description: string | null
          budget: number | null
          url: string
          posted_at: string | null
          crawled_at: string
        }
        Insert: {
          id?: string
          platform: 'zhubajie' | 'proginn'
          external_id: string
          title: string
          description?: string | null
          budget?: number | null
          url: string
          posted_at?: string | null
          crawled_at?: string
        }
        Update: {
          id?: string
          platform?: 'zhubajie' | 'proginn'
          external_id?: string
          title?: string
          description?: string | null
          budget?: number | null
          url?: string
          posted_at?: string | null
          crawled_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          job_id: string
          channel: 'feishu' | 'wechat'
          status: 'sent' | 'failed'
          clicked: boolean
          sent_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_id: string
          channel: 'feishu' | 'wechat'
          status: 'sent' | 'failed'
          clicked?: boolean
          sent_at?: string
        }
        Update: {
          clicked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      platform_type: 'zhubajie' | 'proginn'
      notify_channel_type: 'feishu' | 'wechat'
      notification_status: 'sent' | 'failed'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
