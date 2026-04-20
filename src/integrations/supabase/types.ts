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
      assignment_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          student_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          student_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "assignment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_groups: {
        Row: {
          assignment_id: string
          created_at: string
          created_by: string
          id: string
          join_code: string
          name: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          created_by: string
          id?: string
          join_code?: string
          name: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          created_by?: string
          id?: string
          join_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_groups_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "class_assignments"
            referencedColumns: ["id"]
          },
        ]
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
          grading_type: string
          group_formation: string
          id: string
          is_group_assignment: boolean
          max_group_size: number
          min_group_size: number
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
          grading_type?: string
          group_formation?: string
          id?: string
          is_group_assignment?: boolean
          max_group_size?: number
          min_group_size?: number
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
          grading_type?: string
          group_formation?: string
          id?: string
          is_group_assignment?: boolean
          max_group_size?: number
          min_group_size?: number
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
      class_courses: {
        Row: {
          added_by: string
          auto_enroll: boolean
          class_id: string
          course_id: string
          created_at: string
          id: string
        }
        Insert: {
          added_by: string
          auto_enroll?: boolean
          class_id: string
          course_id: string
          created_at?: string
          id?: string
        }
        Update: {
          added_by?: string
          auto_enroll?: boolean
          class_id?: string
          course_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_courses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
          curriculum_type: string
          description: string | null
          grading_system_id: string | null
          id: string
          join_code: string
          name: string
          school_id: string | null
          subject: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          curriculum_type?: string
          description?: string | null
          grading_system_id?: string | null
          id?: string
          join_code?: string
          name: string
          school_id?: string | null
          subject?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          curriculum_type?: string
          description?: string | null
          grading_system_id?: string | null
          id?: string
          join_code?: string
          name?: string
          school_id?: string | null
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
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      course_flashcards: {
        Row: {
          back: string
          course_id: string
          created_at: string
          difficulty: number | null
          ease_factor: number | null
          front: string
          id: string
          interval_days: number | null
          next_review_at: string | null
          review_count: number | null
          topic_id: string
          user_id: string
        }
        Insert: {
          back: string
          course_id: string
          created_at?: string
          difficulty?: number | null
          ease_factor?: number | null
          front: string
          id?: string
          interval_days?: number | null
          next_review_at?: string | null
          review_count?: number | null
          topic_id: string
          user_id: string
        }
        Update: {
          back?: string
          course_id?: string
          created_at?: string
          difficulty?: number | null
          ease_factor?: number | null
          front?: string
          id?: string
          interval_days?: number | null
          next_review_at?: string | null
          review_count?: number | null
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_flashcards_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_flashcards_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      course_study_resources: {
        Row: {
          content: string
          course_id: string
          created_at: string
          created_by: string | null
          id: string
          is_ai_generated: boolean | null
          resource_type: string
          title: string
          topic_id: string | null
        }
        Insert: {
          content?: string
          course_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_ai_generated?: boolean | null
          resource_type?: string
          title: string
          topic_id?: string | null
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_ai_generated?: boolean | null
          resource_type?: string
          title?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_study_resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_study_resources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      course_topics: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          parent_topic_id: string | null
          title: string
          topic_code: string | null
          topic_order: number
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          parent_topic_id?: string | null
          title: string
          topic_code?: string | null
          topic_order?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          parent_topic_id?: string | null
          title?: string
          topic_code?: string | null
          topic_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_topics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_topics_parent_topic_id_fkey"
            columns: ["parent_topic_id"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          created_by: string | null
          curriculum_type: string
          description: string
          estimated_hours: number | null
          icon_emoji: string | null
          id: string
          is_official: boolean | null
          level: string
          school_id: string | null
          subject: string
          syllabus_content: string | null
          tags: string[] | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          curriculum_type?: string
          description?: string
          estimated_hours?: number | null
          icon_emoji?: string | null
          id?: string
          is_official?: boolean | null
          level?: string
          school_id?: string | null
          subject: string
          syllabus_content?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          curriculum_type?: string
          description?: string
          estimated_hours?: number | null
          icon_emoji?: string | null
          id?: string
          is_official?: boolean | null
          level?: string
          school_id?: string | null
          subject?: string
          syllabus_content?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
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
      discount_codes: {
        Row: {
          applies_to_plans: string[] | null
          code: string
          created_at: string
          created_by: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          notes: string | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          applies_to_plans?: string[] | null
          code: string
          created_at?: string
          created_by: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          applies_to_plans?: string[] | null
          code?: string
          created_at?: string
          created_by?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          uses_count?: number
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
      live_quiz_answers: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean | null
          player_id: string
          points_earned: number | null
          powerup_used: string | null
          question_id: string
          selected_index: number | null
          session_id: string
          time_taken_ms: number | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          player_id: string
          points_earned?: number | null
          powerup_used?: string | null
          question_id: string
          selected_index?: number | null
          session_id: string
          time_taken_ms?: number | null
          user_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          player_id?: string
          points_earned?: number | null
          powerup_used?: string | null
          question_id?: string
          selected_index?: number | null
          session_id?: string
          time_taken_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_quiz_answers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "live_quiz_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "live_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_quiz_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_quiz_players: {
        Row: {
          avatar: string | null
          id: string
          is_connected: boolean | null
          joined_at: string
          nickname: string
          powerups_available: Json
          powerups_used: Json
          score: number
          session_id: string
          streak: number
          user_id: string
        }
        Insert: {
          avatar?: string | null
          id?: string
          is_connected?: boolean | null
          joined_at?: string
          nickname?: string
          powerups_available?: Json
          powerups_used?: Json
          score?: number
          session_id: string
          streak?: number
          user_id: string
        }
        Update: {
          avatar?: string | null
          id?: string
          is_connected?: boolean | null
          joined_at?: string
          nickname?: string
          powerups_available?: Json
          powerups_used?: Json
          score?: number
          session_id?: string
          streak?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_quiz_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_quiz_questions: {
        Row: {
          ai_generated: boolean | null
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          image_url: string | null
          options: Json
          points: number | null
          question_order: number
          question_text: string
          question_type: string
          session_id: string
          time_seconds: number | null
        }
        Insert: {
          ai_generated?: boolean | null
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          options?: Json
          points?: number | null
          question_order?: number
          question_text: string
          question_type?: string
          session_id: string
          time_seconds?: number | null
        }
        Update: {
          ai_generated?: boolean | null
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          options?: Json
          points?: number | null
          question_order?: number
          question_text?: string
          question_type?: string
          session_id?: string
          time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_quiz_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_quiz_sessions: {
        Row: {
          class_id: string
          completed_at: string | null
          created_at: string
          current_question_index: number | null
          description: string | null
          enabled_powerups: string[] | null
          id: string
          join_code: string
          mode: string
          points_per_question: number | null
          question_time_seconds: number | null
          redemption_round_enabled: boolean | null
          show_leaderboard_after_each: boolean | null
          shuffle_answers: boolean | null
          shuffle_questions: boolean | null
          started_at: string | null
          status: string
          streak_bonus: boolean | null
          teacher_id: string
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          completed_at?: string | null
          created_at?: string
          current_question_index?: number | null
          description?: string | null
          enabled_powerups?: string[] | null
          id?: string
          join_code?: string
          mode?: string
          points_per_question?: number | null
          question_time_seconds?: number | null
          redemption_round_enabled?: boolean | null
          show_leaderboard_after_each?: boolean | null
          shuffle_answers?: boolean | null
          shuffle_questions?: boolean | null
          started_at?: string | null
          status?: string
          streak_bonus?: boolean | null
          teacher_id: string
          theme?: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          completed_at?: string | null
          created_at?: string
          current_question_index?: number | null
          description?: string | null
          enabled_powerups?: string[] | null
          id?: string
          join_code?: string
          mode?: string
          points_per_question?: number | null
          question_time_seconds?: number | null
          redemption_round_enabled?: boolean | null
          show_leaderboard_after_each?: boolean | null
          shuffle_answers?: boolean | null
          shuffle_questions?: boolean | null
          started_at?: string | null
          status?: string
          streak_bonus?: boolean | null
          teacher_id?: string
          theme?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_quiz_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
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
      paddle_price_ids: {
        Row: {
          billing_cycle: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          paddle_price_id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          paddle_price_id: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          paddle_price_id?: string
          plan_id?: string
          updated_at?: string
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
      payment_transactions: {
        Row: {
          amount_inr: number
          created_at: string
          currency: string
          discount_amount: number | null
          discount_code: string | null
          id: string
          paddle_customer_id: string | null
          paddle_transaction_id: string | null
          raw_event: Json | null
          registration_request_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_inr: number
          created_at?: string
          currency?: string
          discount_amount?: number | null
          discount_code?: string | null
          id?: string
          paddle_customer_id?: string | null
          paddle_transaction_id?: string | null
          raw_event?: Json | null
          registration_request_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          currency?: string
          discount_amount?: number | null
          discount_code?: string | null
          id?: string
          paddle_customer_id?: string | null
          paddle_transaction_id?: string | null
          raw_event?: Json | null
          registration_request_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_registration_request_id_fkey"
            columns: ["registration_request_id"]
            isOneToOne: false
            referencedRelation: "registration_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_collaborators: {
        Row: {
          id: string
          invited_by: string
          joined_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by: string
          joined_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string
          joined_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_private: boolean
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_private?: boolean
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          capstone_submission_id: string | null
          cover_image_url: string | null
          created_at: string
          description: string
          external_links: Json
          id: string
          invite_code: string | null
          is_published: boolean
          media_urls: string[]
          share_token: string | null
          tags: string[]
          theme: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capstone_submission_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string
          external_links?: Json
          id?: string
          invite_code?: string | null
          is_published?: boolean
          media_urls?: string[]
          share_token?: string | null
          tags?: string[]
          theme?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capstone_submission_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string
          external_links?: Json
          id?: string
          invite_code?: string | null
          is_published?: boolean
          media_urls?: string[]
          share_token?: string | null
          tags?: string[]
          theme?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_capstone_submission_id_fkey"
            columns: ["capstone_submission_id"]
            isOneToOne: false
            referencedRelation: "capstone_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_updates: {
        Row: {
          content: string
          created_at: string
          id: string
          media_urls: string[]
          project_id: string
          update_type: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          media_urls?: string[]
          project_id: string
          update_type?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_urls?: string[]
          project_id?: string
          update_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
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
      registration_requests: {
        Row: {
          created_at: string
          discount_amount: number | null
          discount_code: string | null
          email: string
          full_name: string
          id: string
          paddle_checkout_url: string | null
          paddle_transaction_id: string | null
          paid_at: string | null
          payment_amount_inr: number | null
          payment_plan: string | null
          payment_status: string | null
          rejection_reason: string | null
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          seat_config: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number | null
          discount_code?: string | null
          email: string
          full_name: string
          id?: string
          paddle_checkout_url?: string | null
          paddle_transaction_id?: string | null
          paid_at?: string | null
          payment_amount_inr?: number | null
          payment_plan?: string | null
          payment_status?: string | null
          rejection_reason?: string | null
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          seat_config?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_amount?: number | null
          discount_code?: string | null
          email?: string
          full_name?: string
          id?: string
          paddle_checkout_url?: string | null
          paddle_transaction_id?: string | null
          paid_at?: string | null
          payment_amount_inr?: number | null
          payment_plan?: string | null
          payment_status?: string | null
          rejection_reason?: string | null
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          seat_config?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_ai_settings: {
        Row: {
          allow_capstone_ai_grading: boolean | null
          allow_learning_path_generation: boolean | null
          allow_student_chat: boolean | null
          allowed_ai_models: string[] | null
          blocked_keywords: string[] | null
          created_at: string
          custom_model_training_data_ids: string[] | null
          custom_system_prompt: string | null
          grade_level_restrictions: string[] | null
          id: string
          max_daily_prompts_per_student: number | null
          max_monthly_cost_usd: number | null
          process_mode_enabled: boolean | null
          school_id: string
          subject_restrictions: string[] | null
          updated_at: string
        }
        Insert: {
          allow_capstone_ai_grading?: boolean | null
          allow_learning_path_generation?: boolean | null
          allow_student_chat?: boolean | null
          allowed_ai_models?: string[] | null
          blocked_keywords?: string[] | null
          created_at?: string
          custom_model_training_data_ids?: string[] | null
          custom_system_prompt?: string | null
          grade_level_restrictions?: string[] | null
          id?: string
          max_daily_prompts_per_student?: number | null
          max_monthly_cost_usd?: number | null
          process_mode_enabled?: boolean | null
          school_id: string
          subject_restrictions?: string[] | null
          updated_at?: string
        }
        Update: {
          allow_capstone_ai_grading?: boolean | null
          allow_learning_path_generation?: boolean | null
          allow_student_chat?: boolean | null
          allowed_ai_models?: string[] | null
          blocked_keywords?: string[] | null
          created_at?: string
          custom_model_training_data_ids?: string[] | null
          custom_system_prompt?: string | null
          grade_level_restrictions?: string[] | null
          id?: string
          max_daily_prompts_per_student?: number | null
          max_monthly_cost_usd?: number | null
          process_mode_enabled?: boolean | null
          school_id?: string
          subject_restrictions?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_ai_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_public: boolean
          priority: string
          school_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_public?: boolean
          priority?: string
          school_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_public?: boolean
          priority?: string
          school_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          event_date: string
          id: string
          is_public: boolean
          location: string | null
          school_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          event_date: string
          id?: string
          is_public?: boolean
          location?: string | null
          school_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          id?: string
          is_public?: boolean
          location?: string | null
          school_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_members: {
        Row: {
          id: string
          joined_at: string
          school_id: string
          school_role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          school_id: string
          school_role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          school_id?: string
          school_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_seat_limits: {
        Row: {
          billing_cycle: string
          created_at: string
          id: string
          plan_id: string
          school_id: string
          student_seats: number
          students_used: number
          teacher_seats: number
          teachers_used: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          id?: string
          plan_id?: string
          school_id: string
          student_seats?: number
          students_used?: number
          teacher_seats?: number
          teachers_used?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          id?: string
          plan_id?: string
          school_id?: string
          student_seats?: number
          students_used?: number
          teacher_seats?: number
          teachers_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_seat_limits_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          contact_email: string | null
          created_at: string
          created_by: string
          description: string | null
          domain: string | null
          id: string
          logo_url: string | null
          name: string
          subdomain: string | null
          theme_config: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name: string
          subdomain?: string | null
          theme_config?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          subdomain?: string | null
          theme_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      student_courses: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          last_studied_at: string | null
          mastery_score: number | null
          progress: number | null
          study_time_minutes: number | null
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          last_studied_at?: string | null
          mastery_score?: number | null
          progress?: number | null
          study_time_minutes?: number | null
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          last_studied_at?: string | null
          mastery_score?: number | null
          progress?: number | null
          study_time_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
      student_topic_mastery: {
        Row: {
          course_id: string
          id: string
          last_studied_at: string | null
          mastery_level: number | null
          questions_attempted: number | null
          questions_correct: number | null
          study_time_minutes: number | null
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          last_studied_at?: string | null
          mastery_level?: number | null
          questions_attempted?: number | null
          questions_correct?: number | null
          study_time_minutes?: number | null
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          last_studied_at?: string | null
          mastery_level?: number | null
          questions_attempted?: number | null
          questions_correct?: number | null
          study_time_minutes?: number | null
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_topic_mastery_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_topic_mastery_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          assigned_by: string | null
          billing_cycle: string
          created_at: string
          id: string
          monthly_token_limit: number
          plan_id: string
          status: string
          token_reset_date: string
          tokens_used_this_month: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          billing_cycle?: string
          created_at?: string
          id?: string
          monthly_token_limit?: number
          plan_id?: string
          status?: string
          token_reset_date?: string
          tokens_used_this_month?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          billing_cycle?: string
          created_at?: string
          id?: string
          monthly_token_limit?: number
          plan_id?: string
          status?: string
          token_reset_date?: string
          tokens_used_this_month?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      is_portfolio_collaborator: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_portfolio_owner: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_portfolio_project_published: {
        Args: { _project_id: string }
        Returns: boolean
      }
      is_school_member: {
        Args: { _school_id: string; _user_id: string }
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
