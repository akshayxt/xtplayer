export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      liked_songs: {
        Row: {
          channel_title: string | null
          duration: string | null
          id: string
          liked_at: string
          thumbnail: string | null
          title: string
          user_id: string
          video_id: string
        }
        Insert: {
          channel_title?: string | null
          duration?: string | null
          id?: string
          liked_at?: string
          thumbnail?: string | null
          title: string
          user_id: string
          video_id: string
        }
        Update: {
          channel_title?: string | null
          duration?: string | null
          id?: string
          liked_at?: string
          thumbnail?: string | null
          title?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      listening_history: {
        Row: {
          channel_title: string | null
          duration: string | null
          id: string
          play_count: number | null
          played_at: string
          skip_count: number | null
          thumbnail: string | null
          title: string
          user_id: string
          video_id: string
        }
        Insert: {
          channel_title?: string | null
          duration?: string | null
          id?: string
          play_count?: number | null
          played_at?: string
          skip_count?: number | null
          thumbnail?: string | null
          title: string
          user_id: string
          video_id: string
        }
        Update: {
          channel_title?: string | null
          duration?: string | null
          id?: string
          play_count?: number | null
          played_at?: string
          skip_count?: number | null
          thumbnail?: string | null
          title?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      playlist_songs: {
        Row: {
          added_at: string
          channel_title: string | null
          duration: string | null
          id: string
          playlist_id: string
          position: number
          thumbnail: string | null
          title: string
          video_id: string
        }
        Insert: {
          added_at?: string
          channel_title?: string | null
          duration?: string | null
          id?: string
          playlist_id: string
          position?: number
          thumbnail?: string | null
          title: string
          video_id: string
        }
        Update: {
          added_at?: string
          channel_title?: string | null
          duration?: string | null
          id?: string
          playlist_id?: string
          position?: number
          thumbnail?: string | null
          title?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          preferred_mode: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_mode?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_mode?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          sender_device_id: string
          session_id: string
          timestamp: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          sender_device_id: string
          session_id: string
          timestamp: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          sender_device_id?: string
          session_id?: string
          timestamp?: number
        }
        Relationships: [
          {
            foreignKeyName: "sync_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sync_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_participants: {
        Row: {
          device_id: string
          display_name: string | null
          id: string
          is_host: boolean | null
          joined_at: string
          last_heartbeat: string
          latency_ms: number | null
          session_id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          device_id: string
          display_name?: string | null
          id?: string
          is_host?: boolean | null
          joined_at?: string
          last_heartbeat?: string
          latency_ms?: number | null
          session_id: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          device_id?: string
          display_name?: string | null
          id?: string
          is_host?: boolean | null
          joined_at?: string
          last_heartbeat?: string
          latency_ms?: number | null
          session_id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sync_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_sessions: {
        Row: {
          created_at: string
          current_position: number | null
          current_video_channel: string | null
          current_video_id: string | null
          current_video_thumbnail: string | null
          current_video_title: string | null
          expires_at: string
          host_user_id: string
          id: string
          is_playing: boolean | null
          start_timestamp: number | null
          status: string | null
          sync_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_position?: number | null
          current_video_channel?: string | null
          current_video_id?: string | null
          current_video_thumbnail?: string | null
          current_video_title?: string | null
          expires_at?: string
          host_user_id: string
          id?: string
          is_playing?: boolean | null
          start_timestamp?: number | null
          status?: string | null
          sync_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_position?: number | null
          current_video_channel?: string | null
          current_video_id?: string | null
          current_video_thumbnail?: string | null
          current_video_title?: string | null
          expires_at?: string
          host_user_id?: string
          id?: string
          is_playing?: boolean | null
          start_timestamp?: number | null
          status?: string | null
          sync_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role: "user" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "premium"],
    },
  },
} as const
