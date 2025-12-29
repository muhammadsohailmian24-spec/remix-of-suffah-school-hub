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
      academic_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      admissions: {
        Row: {
          address: string
          applicant_email: string
          applicant_name: string
          applicant_phone: string
          applying_for_class: number
          created_at: string
          date_of_birth: string
          documents: Json | null
          gender: string
          id: string
          parent_email: string | null
          parent_name: string
          parent_phone: string
          previous_class: string | null
          previous_school: string | null
          review_notes: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          address: string
          applicant_email: string
          applicant_name: string
          applicant_phone: string
          applying_for_class: number
          created_at?: string
          date_of_birth: string
          documents?: Json | null
          gender: string
          id?: string
          parent_email?: string | null
          parent_name: string
          parent_phone: string
          previous_class?: string | null
          previous_school?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          applicant_email?: string
          applicant_name?: string
          applicant_phone?: string
          applying_for_class?: number
          created_at?: string
          date_of_birth?: string
          documents?: Json | null
          gender?: string
          id?: string
          parent_email?: string | null
          parent_name?: string
          parent_phone?: string
          previous_class?: string | null
          previous_school?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          is_published: boolean | null
          priority: string | null
          target_audience: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          priority?: string | null
          target_audience?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          priority?: string | null
          target_audience?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          attachment_url: string | null
          class_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          max_marks: number | null
          status: string | null
          subject_id: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          class_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          max_marks?: number | null
          status?: string | null
          subject_id: string
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          max_marks?: number | null
          status?: string | null
          subject_id?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          marked_by: string | null
          remarks: string | null
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          marked_by?: string | null
          remarks?: string | null
          status: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          remarks?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year_id: string | null
          capacity: number | null
          class_teacher_id: string | null
          created_at: string
          department_id: string | null
          grade_level: number
          id: string
          name: string
          room_number: string | null
          section: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          department_id?: string | null
          grade_level: number
          id?: string
          name: string
          room_number?: string | null
          section?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          department_id?: string | null
          grade_level?: number
          id?: string
          name?: string
          room_number?: string | null
          section?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          head_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          head_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          head_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          academic_year_id: string | null
          class_id: string
          created_at: string
          end_time: string | null
          exam_date: string
          exam_type: string
          id: string
          max_marks: number | null
          name: string
          passing_marks: number | null
          start_time: string | null
          subject_id: string
        }
        Insert: {
          academic_year_id?: string | null
          class_id: string
          created_at?: string
          end_time?: string | null
          exam_date: string
          exam_type: string
          id?: string
          max_marks?: number | null
          name: string
          passing_marks?: number | null
          start_time?: string | null
          subject_id: string
        }
        Update: {
          academic_year_id?: string | null
          class_id?: string
          created_at?: string
          end_time?: string | null
          exam_date?: string
          exam_type?: string
          id?: string
          max_marks?: number | null
          name?: string
          passing_marks?: number | null
          start_time?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_date: string
          payment_method: string
          receipt_number: string | null
          received_by: string | null
          remarks: string | null
          student_fee_id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string
          receipt_number?: string | null
          received_by?: string | null
          remarks?: string | null
          student_fee_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string
          receipt_number?: string | null
          received_by?: string | null
          remarks?: string | null
          student_fee_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_student_fee_id_fkey"
            columns: ["student_fee_id"]
            isOneToOne: false
            referencedRelation: "student_fees"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year_id: string | null
          amount: number
          class_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          fee_type: string
          id: string
          is_recurring: boolean | null
          name: string
          recurring_period: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          amount: number
          class_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          fee_type?: string
          id?: string
          is_recurring?: boolean | null
          name: string
          recurring_period?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          amount?: number
          class_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          fee_type?: string
          id?: string
          is_recurring?: boolean | null
          name?: string
          recurring_period?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_visible: boolean | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_visible?: boolean | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_visible?: boolean | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      parents: {
        Row: {
          created_at: string
          id: string
          occupation: string | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          occupation?: string | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          occupation?: string | null
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          photo_url: string | null
          sms_notifications_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          gender?: string | null
          id?: string
          phone?: string | null
          photo_url?: string | null
          sms_notifications_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          photo_url?: string | null
          sms_notifications_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          created_at: string
          exam_id: string
          grade: string | null
          id: string
          is_published: boolean | null
          marks_obtained: number
          remarks: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          grade?: string | null
          id?: string
          is_published?: boolean | null
          marks_obtained: number
          remarks?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          grade?: string | null
          id?: string
          is_published?: boolean | null
          marks_obtained?: number
          remarks?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fees: {
        Row: {
          amount: number
          created_at: string
          discount: number | null
          due_date: string
          fee_structure_id: string
          final_amount: number
          id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          discount?: number | null
          due_date: string
          fee_structure_id: string
          final_amount: number
          id?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          discount?: number | null
          due_date?: string
          fee_structure_id?: string
          final_amount?: number
          id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fees_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean | null
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_date: string
          admission_number: string | null
          blood_group: string | null
          class_id: string | null
          created_at: string
          emergency_contact: string | null
          id: string
          previous_school: string | null
          status: string | null
          student_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admission_date?: string
          admission_number?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          emergency_contact?: string | null
          id?: string
          previous_school?: string | null
          status?: string | null
          student_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admission_date?: string
          admission_number?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          emergency_contact?: string | null
          id?: string
          previous_school?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_materials: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          file_type: string | null
          file_url: string
          id: string
          subject_id: string
          teacher_id: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          subject_id: string
          teacher_id: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          subject_id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_materials_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          credit_hours: number | null
          department_id: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          credit_hours?: number | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          credit_hours?: number | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_id: string
          created_at: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_late: boolean | null
          marks_obtained: number | null
          student_id: string
          submission_text: string | null
          submission_url: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_late?: boolean | null
          marks_obtained?: number | null
          student_id: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_late?: boolean | null
          marks_obtained?: number | null
          student_id?: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          department_id: string | null
          employee_id: string
          id: string
          joining_date: string
          qualification: string | null
          salary: number | null
          specialization: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          employee_id: string
          id?: string
          joining_date?: string
          qualification?: string | null
          salary?: number | null
          specialization?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          employee_id?: string
          id?: string
          joining_date?: string
          qualification?: string | null
          salary?: number | null
          specialization?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room_number: string | null
          start_time: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room_number?: string | null
          start_time: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room_number?: string | null
          start_time?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          check_role: Database["public"]["Enums"]["user_role"]
          check_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "teacher" | "student" | "parent"
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
      user_role: ["admin", "teacher", "student", "parent"],
    },
  },
} as const
