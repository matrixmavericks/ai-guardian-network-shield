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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          moderation_status: string | null
          role: string
          session_id: string
          severity: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          moderation_status?: string | null
          role: string
          session_id: string
          severity?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          moderation_status?: string | null
          role?: string
          session_id?: string
          severity?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          subject: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subject?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_configurations: {
        Row: {
          ai_engine: Database["public"]["Enums"]["ai_engine"]
          blocked_keywords: string[] | null
          created_at: string | null
          enabled: boolean | null
          endpoint_url: string | null
          grade_level_rules: Json | null
          id: string
          organization_id: string | null
          process_mode_enabled: boolean | null
          subject_filters: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_engine: Database["public"]["Enums"]["ai_engine"]
          blocked_keywords?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          endpoint_url?: string | null
          grade_level_rules?: Json | null
          id?: string
          organization_id?: string | null
          process_mode_enabled?: boolean | null
          subject_filters?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_engine?: Database["public"]["Enums"]["ai_engine"]
          blocked_keywords?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          endpoint_url?: string | null
          grade_level_rules?: Json | null
          id?: string
          organization_id?: string | null
          process_mode_enabled?: boolean | null
          subject_filters?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number
          created_at: string
          estimated_cost_usd: number
          id: string
          model: string
          prompt_tokens: number
          session_id: string | null
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          model?: string
          prompt_tokens?: number
          session_id?: string | null
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          model?: string
          prompt_tokens?: number
          session_id?: string | null
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_quotas: {
        Row: {
          created_at: string
          id: string
          monthly_limit_usd: number
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_limit_usd?: number
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_limit_usd?: number
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          feedback: string | null
          file_name: string | null
          file_url: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          max_grade: number
          status: string
          student_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_grade?: number
          status?: string
          student_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_grade?: number
          status?: string
          student_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "class_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      bypass_attempts: {
        Row: {
          attempt_type: string
          blocked: boolean | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          severity: Database["public"]["Enums"]["severity_level"] | null
          user_id: string | null
        }
        Insert: {
          attempt_type: string
          blocked?: boolean | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          severity?: Database["public"]["Enums"]["severity_level"] | null
          user_id?: string | null
        }
        Update: {
          attempt_type?: string
          blocked?: boolean | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          severity?: Database["public"]["Enums"]["severity_level"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      capstone_submissions: {
        Row: {
          ai_feedback: Json | null
          ai_score: number | null
          created_at: string
          external_link: string | null
          file_name: string | null
          file_url: string | null
          id: string
          path_id: string
          reviewed_at: string | null
          status: string
          teacher_feedback: string | null
          teacher_id: string | null
          teacher_score: number | null
          text_content: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_feedback?: Json | null
          ai_score?: number | null
          created_at?: string
          external_link?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          path_id: string
          reviewed_at?: string | null
          status?: string
          teacher_feedback?: string | null
          teacher_id?: string | null
          teacher_score?: number | null
          text_content?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_feedback?: Json | null
          ai_score?: number | null
          created_at?: string
          external_link?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          path_id?: string
          reviewed_at?: string | null
          status?: string
          teacher_feedback?: string | null
          teacher_id?: string | null
          teacher_score?: number | null
          text_content?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capstone_submissions_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      class_assignments: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          subject: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          subject?: string | null
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          subject?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_members: {
        Row: {
          class_id: string
          id: string
          joined_at: string
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_resource_folders: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_resource_folders_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_resource_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "class_resource_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      class_resources: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          external_url: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          folder_id: string | null
          id: string
          mime_type: string | null
          resource_type: string
          tags: string[]
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          resource_type?: string
          tags?: string[]
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          resource_type?: string
          tags?: string[]
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_resources_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_resources_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "class_resource_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          description: string | null
          grading_system_id: string | null
          id: string
          join_code: string
          name: string
          subject: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          grading_system_id?: string | null
          id?: string
          join_code?: string
          name: string
          subject?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          grading_system_id?: string | null
          id?: string
          join_code?: string
          name?: string
          subject?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_grading_system_id_fkey"
            columns: ["grading_system_id"]
            isOneToOne: false
            referencedRelation: "grading_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_links: {
        Row: {
          assignment_name: string
          created_at: string | null
          external_id: string | null
          id: string
          linked_prompts: string[] | null
          lms_integration: string | null
          subject: string
          teacher_id: string
        }
        Insert: {
          assignment_name: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          linked_prompts?: string[] | null
          lms_integration?: string | null
          subject: string
          teacher_id: string
        }
        Update: {
          assignment_name?: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          linked_prompts?: string[] | null
          lms_integration?: string | null
          subject?: string
          teacher_id?: string
        }
        Relationships: []
      }
      ethical_badges: {
        Row: {
          badge_description: string | null
          badge_name: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_name: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_name?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      grading_systems: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          is_default: boolean
          name: string
          scale_config: Json
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          id?: string
          is_default?: boolean
          name: string
          scale_config?: Json
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_default?: boolean
          name?: string
          scale_config?: Json
        }
        Relationships: []
      }
      learning_path_activities: {
        Row: {
          activity_key: string
          activity_type: string
          content: Json
          created_at: string
          id: string
          module_id: string
          path_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_key: string
          activity_type?: string
          content?: Json
          created_at?: string
          id?: string
          module_id: string
          path_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_key?: string
          activity_type?: string
          content?: Json
          created_at?: string
          id?: string
          module_id?: string
          path_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_activities_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_progress: {
        Row: {
          bookmarked: boolean
          completed_modules: string[]
          created_at: string
          id: string
          last_accessed_at: string
          path_id: string
          progress: number
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bookmarked?: boolean
          completed_modules?: string[]
          created_at?: string
          id?: string
          last_accessed_at?: string
          path_id: string
          progress?: number
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bookmarked?: boolean
          completed_modules?: string[]
          created_at?: string
          id?: string
          last_accessed_at?: string
          path_id?: string
          progress?: number
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_progress_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          created_at: string
          created_by: string
          description: string
          difficulty: string
          enrolled_count: number
          estimated_hours: number
          featured: boolean
          id: string
          is_public: boolean
          modules: Json
          rating: number
          subject: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          difficulty?: string
          enrolled_count?: number
          estimated_hours?: number
          featured?: boolean
          id?: string
          is_public?: boolean
          modules?: Json
          rating?: number
          subject: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          difficulty?: string
          enrolled_count?: number
          estimated_hours?: number
          featured?: boolean
          id?: string
          is_public?: boolean
          modules?: Json
          rating?: number
          subject?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      model_training_data: {
        Row: {
          approved: boolean | null
          created_at: string | null
          created_by: string
          grade_level: string | null
          id: string
          ideal_response: string
          input_prompt: string
          subject: string
        }
        Insert: {
          approved?: boolean | null
          created_at?: string | null
          created_by: string
          grade_level?: string | null
          id?: string
          ideal_response: string
          input_prompt: string
          subject: string
        }
        Update: {
          approved?: boolean | null
          created_at?: string | null
          created_by?: string
          grade_level?: string | null
          id?: string
          ideal_response?: string
          input_prompt?: string
          subject?: string
        }
        Relationships: []
      }
      parent_child_links: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          parent_id: string
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string
          grade_level: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          grade_level?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          grade_level?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prompt_logs: {
        Row: {
          ai_engine: Database["public"]["Enums"]["ai_engine"] | null
          created_at: string | null
          flagged_keywords: string[] | null
          grade_level: string | null
          id: string
          modified_prompt: string | null
          original_prompt: string
          process_mode_enabled: boolean | null
          response: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          status: Database["public"]["Enums"]["prompt_status"]
          subject: string | null
          user_id: string
        }
        Insert: {
          ai_engine?: Database["public"]["Enums"]["ai_engine"] | null
          created_at?: string | null
          flagged_keywords?: string[] | null
          grade_level?: string | null
          id?: string
          modified_prompt?: string | null
          original_prompt: string
          process_mode_enabled?: boolean | null
          response?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          status: Database["public"]["Enums"]["prompt_status"]
          subject?: string | null
          user_id: string
        }
        Update: {
          ai_engine?: Database["public"]["Enums"]["ai_engine"] | null
          created_at?: string | null
          flagged_keywords?: string[] | null
          grade_level?: string | null
          id?: string
          modified_prompt?: string | null
          original_prompt?: string
          process_mode_enabled?: boolean | null
          response?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          status?: Database["public"]["Enums"]["prompt_status"]
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name: string
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      student_resource_bookmarks: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          resource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_resource_bookmarks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "class_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      get_user_contacts: {
        Args: { _user_id: string }
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_class_member: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      is_class_teacher: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      ai_engine: "openai" | "anthropic" | "google" | "other"
      app_role: "admin" | "teacher" | "student" | "parent"
      prompt_status: "approved" | "blocked" | "rewritten" | "flagged"
      severity_level: "low" | "medium" | "high" | "critical"
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
      ai_engine: ["openai", "anthropic", "google", "other"],
      app_role: ["admin", "teacher", "student", "parent"],
      prompt_status: ["approved", "blocked", "rewritten", "flagged"],
      severity_level: ["low", "medium", "high", "critical"],
    },
  },
} as const
