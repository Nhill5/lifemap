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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          date: string
          end_time: string | null
          id: string
          source: Database["public"]["Enums"]["block_source"]
          start_time: string | null
          status: Database["public"]["Enums"]["block_status"]
          sub_goal_id: string | null
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          date: string
          end_time?: string | null
          id?: string
          source: Database["public"]["Enums"]["block_source"]
          start_time?: string | null
          status?: Database["public"]["Enums"]["block_status"]
          sub_goal_id?: string | null
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          date?: string
          end_time?: string | null
          id?: string
          source?: Database["public"]["Enums"]["block_source"]
          start_time?: string | null
          status?: Database["public"]["Enums"]["block_status"]
          sub_goal_id?: string | null
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_sub_goal_id_fkey"
            columns: ["sub_goal_id"]
            isOneToOne: false
            referencedRelation: "sub_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      buckets: {
        Row: {
          archived_at: string | null
          color: Database["public"]["Enums"]["accent_slot"]
          created_at: string
          id: string
          name: string
          sort_order: number
          state: Database["public"]["Enums"]["bucket_state"]
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color: Database["public"]["Enums"]["accent_slot"]
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          state?: Database["public"]["Enums"]["bucket_state"]
          user_id: string
        }
        Update: {
          archived_at?: string | null
          color?: Database["public"]["Enums"]["accent_slot"]
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          state?: Database["public"]["Enums"]["bucket_state"]
          user_id?: string
        }
        Relationships: []
      }
      chief_goals: {
        Row: {
          achieved_at: string | null
          baseline_value: number | null
          bucket_id: string
          created_at: string
          deadline: string | null
          id: string
          status: Database["public"]["Enums"]["goal_status"]
          target_unit: string | null
          target_value: number | null
          title: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          baseline_value?: number | null
          bucket_id: string
          created_at?: string
          deadline?: string | null
          id?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_unit?: string | null
          target_value?: number | null
          title: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          baseline_value?: number | null
          bucket_id?: string
          created_at?: string
          deadline?: string | null
          id?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_unit?: string | null
          target_value?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chief_goals_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      chief_goal_progress: {
        Row: {
          chief_goal_id: string
          created_at: string
          date: string
          id: string
          user_id: string
          value: number
        }
        Insert: {
          chief_goal_id: string
          created_at?: string
          date: string
          id?: string
          user_id: string
          value: number
        }
        Update: {
          chief_goal_id?: string
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "chief_goal_progress_chief_goal_id_fkey"
            columns: ["chief_goal_id"]
            isOneToOne: false
            referencedRelation: "chief_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      day_plans: {
        Row: {
          committed_at: string | null
          date: string
          id: string
          user_id: string
        }
        Insert: {
          committed_at?: string | null
          date: string
          id?: string
          user_id: string
        }
        Update: {
          committed_at?: string | null
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          type: Database["public"]["Enums"]["event_type"]
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          type: Database["public"]["Enums"]["event_type"]
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          type?: Database["public"]["Enums"]["event_type"]
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      exercises: {
        Row: {
          id: string
          muscle_group: string | null
          name: string
          user_id: string | null
        }
        Insert: {
          id?: string
          muscle_group?: string | null
          name: string
          user_id?: string | null
        }
        Update: {
          id?: string
          muscle_group?: string | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fitbit_data: {
        Row: {
          date: string
          id: string
          metric: Database["public"]["Enums"]["fitbit_metric"]
          synced_at: string
          user_id: string
          value: number
        }
        Insert: {
          date: string
          id?: string
          metric: Database["public"]["Enums"]["fitbit_metric"]
          synced_at?: string
          user_id: string
          value: number
        }
        Update: {
          date?: string
          id?: string
          metric?: Database["public"]["Enums"]["fitbit_metric"]
          synced_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      fitbit_connections: {
        Row: {
          connected_at: string
          last_sync_at: string | null
          scopes: string | null
          user_id: string
        }
        Insert: {
          connected_at?: string
          last_sync_at?: string | null
          scopes?: string | null
          user_id: string
        }
        Update: {
          connected_at?: string
          last_sync_at?: string | null
          scopes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fitbit_tokens: {
        Row: {
          access_token: string
          expires_at: string
          id: string
          refresh_token: string
          user_id: string
        }
        Insert: {
          access_token: string
          expires_at: string
          id?: string
          refresh_token: string
          user_id: string
        }
        Update: {
          access_token?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          body: string
          created_at: string
          date: string
          id: string
          linked_context: Json | null
          prompt: string
          scope: Database["public"]["Enums"]["journal_scope"]
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          date: string
          id?: string
          linked_context?: Json | null
          prompt?: string
          scope: Database["public"]["Enums"]["journal_scope"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          date?: string
          id?: string
          linked_context?: Json | null
          prompt?: string
          scope?: Database["public"]["Enums"]["journal_scope"]
          user_id?: string
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          date: string
          id: string
          sent_at: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          sent_at?: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          sent_at?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accountability_dial: Database["public"]["Enums"]["accountability_dial"]
          created_at: string
          id: string
          notification_windows: Json | null
          onboarding_state: Database["public"]["Enums"]["onboarding_state"]
          quiet_hours: Json | null
          sleep_time: string | null
          timezone: string
          updated_at: string
          wake_time: string | null
        }
        Insert: {
          accountability_dial?: Database["public"]["Enums"]["accountability_dial"]
          created_at?: string
          id: string
          notification_windows?: Json | null
          onboarding_state?: Database["public"]["Enums"]["onboarding_state"]
          quiet_hours?: Json | null
          sleep_time?: string | null
          timezone?: string
          updated_at?: string
          wake_time?: string | null
        }
        Update: {
          accountability_dial?: Database["public"]["Enums"]["accountability_dial"]
          created_at?: string
          id?: string
          notification_windows?: Json | null
          onboarding_state?: Database["public"]["Enums"]["onboarding_state"]
          quiet_hours?: Json | null
          sleep_time?: string | null
          timezone?: string
          updated_at?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      sub_goals: {
        Row: {
          bucket_id: string
          cadence_per_week: number | null
          chief_goal_id: string | null
          created_at: string
          daily_target: number | null
          data_source: Database["public"]["Enums"]["data_source"]
          id: string
          recurrence_days: number[] | null
          recurrence_duration_min: number | null
          recurrence_time: string | null
          status: Database["public"]["Enums"]["goal_status"]
          target_unit: string | null
          title: string
          type: Database["public"]["Enums"]["sub_goal_type"]
          user_id: string
        }
        Insert: {
          bucket_id: string
          cadence_per_week?: number | null
          chief_goal_id?: string | null
          created_at?: string
          daily_target?: number | null
          data_source?: Database["public"]["Enums"]["data_source"]
          id?: string
          recurrence_days?: number[] | null
          recurrence_duration_min?: number | null
          recurrence_time?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_unit?: string | null
          title: string
          type: Database["public"]["Enums"]["sub_goal_type"]
          user_id: string
        }
        Update: {
          bucket_id?: string
          cadence_per_week?: number | null
          chief_goal_id?: string | null
          created_at?: string
          daily_target?: number | null
          data_source?: Database["public"]["Enums"]["data_source"]
          id?: string
          recurrence_days?: number[] | null
          recurrence_duration_min?: number | null
          recurrence_time?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_unit?: string | null
          title?: string
          type?: Database["public"]["Enums"]["sub_goal_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_goals_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_goals_chief_goal_id_fkey"
            columns: ["chief_goal_id"]
            isOneToOne: false
            referencedRelation: "chief_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          bucket_id: string | null
          chief_goal_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          is_major: boolean
          rollover_count: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          user_id: string
        }
        Insert: {
          bucket_id?: string | null
          chief_goal_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_major?: boolean
          rollover_count?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          user_id: string
        }
        Update: {
          bucket_id?: string | null
          chief_goal_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_major?: boolean
          rollover_count?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_chief_goal_id_fkey"
            columns: ["chief_goal_id"]
            isOneToOne: false
            referencedRelation: "chief_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      track_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          rating: Database["public"]["Enums"]["track_rating"] | null
          source: Database["public"]["Enums"]["data_source"]
          sub_goal_id: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          rating?: Database["public"]["Enums"]["track_rating"] | null
          source?: Database["public"]["Enums"]["data_source"]
          sub_goal_id: string
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          rating?: Database["public"]["Enums"]["track_rating"] | null
          source?: Database["public"]["Enums"]["data_source"]
          sub_goal_id?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "track_logs_sub_goal_id_fkey"
            columns: ["sub_goal_id"]
            isOneToOne: false
            referencedRelation: "sub_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      unlocks: {
        Row: {
          feature: Database["public"]["Enums"]["feature_unlock"]
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          feature: Database["public"]["Enums"]["feature_unlock"]
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          feature?: Database["public"]["Enums"]["feature_unlock"]
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          exercise_id: string
          id: string
          sort_order: number
          workout_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          sort_order?: number
          workout_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          sort_order?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          id: string
          reps: number | null
          set_number: number
          unit: Database["public"]["Enums"]["weight_unit"]
          weight: number | null
          workout_exercise_id: string
        }
        Insert: {
          id?: string
          reps?: number | null
          set_number: number
          unit?: Database["public"]["Enums"]["weight_unit"]
          weight?: number | null
          workout_exercise_id: string
        }
        Update: {
          id?: string
          reps?: number | null
          set_number?: number
          unit?: Database["public"]["Enums"]["weight_unit"]
          weight?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          block_id: string | null
          created_at: string
          date: string
          id: string
          user_id: string
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          date: string
          id?: string
          user_id: string
        }
        Update: {
          block_id?: string | null
          created_at?: string
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding: {
        Args: { p_buckets: Json }
        Returns: undefined
      }
    }
    Enums: {
      accent_slot: "school" | "work" | "fitness" | "looks" | "hobby"
      accountability_dial: "gentle" | "balanced" | "drill"
      block_source: "sub_goal" | "task" | "external"
      block_status: "planned" | "done" | "missed" | "moved" | "dropped"
      bucket_state: "thriving" | "steady" | "wilting" | "parked"
      data_source: "manual" | "fitbit" | "workout_logger"
      event_type:
        | "task"
        | "subgoal"
        | "milestone"
        | "chief_goal"
        | "unlock"
        | "comeback"
        | "PR"
      feature_unlock: "week_zoom" | "month_zoom" | "bucket_depth" | "life_gpa"
      fitbit_metric: "steps" | "sleep" | "resting_hr" | "active_minutes"
      goal_status: "active" | "achieved" | "abandoned" | "replaced"
      journal_scope: "day" | "week"
      notification_type:
        | "morning_kickoff"
        | "drift_catch"
        | "slip_catch"
        | "evening_mirror"
        | "celebration"
      onboarding_state:
        | "not_started"
        | "buckets"
        | "goals"
        | "first_plan"
        | "complete"
      sub_goal_type: "schedule_it" | "track_it"
      task_status: "todo" | "done" | "dropped"
      track_rating: "hit" | "close" | "missed"
      weight_unit: "lb" | "kg"
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

export const Constants = {
  public: {
    Enums: {
      accent_slot: ["school", "work", "fitness", "looks", "hobby"],
      accountability_dial: ["gentle", "balanced", "drill"],
      block_source: ["sub_goal", "task", "external"],
      block_status: ["planned", "done", "missed", "moved", "dropped"],
      bucket_state: ["thriving", "steady", "wilting", "parked"],
      data_source: ["manual", "fitbit", "workout_logger"],
      event_type: ["task", "subgoal", "milestone", "chief_goal", "unlock", "comeback", "PR"],
      feature_unlock: ["week_zoom", "month_zoom", "bucket_depth", "life_gpa"],
      fitbit_metric: ["steps", "sleep", "resting_hr", "active_minutes"],
      goal_status: ["active", "achieved", "abandoned", "replaced"],
      journal_scope: ["day", "week"],
      notification_type: ["morning_kickoff", "drift_catch", "slip_catch", "evening_mirror", "celebration"],
      onboarding_state: ["not_started", "buckets", "goals", "first_plan", "complete"],
      sub_goal_type: ["schedule_it", "track_it"],
      task_status: ["todo", "done", "dropped"],
      track_rating: ["hit", "close", "missed"],
      weight_unit: ["lb", "kg"],
    },
  },
} as const
