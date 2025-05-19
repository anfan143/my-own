export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ServiceCategory =
  | 'General Renovation'
  | 'Kitchen Remodeling'
  | 'Bathroom Remodeling'
  | 'Room Addition'
  | 'Outdoor Space'
  | 'Roofing'
  | 'Electrical Work'
  | 'Plumbing'
  | 'Flooring'
  | 'Painting'
  | 'Windows and Doors'
  | 'HVAC'
  | 'Other'

export type UserType = 'customer' | 'provider';
export type RoleType = 'single' | 'both';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_type: UserType
          role_type: RoleType
          full_name: string | null
          email: string | null
          phone: string | null
          location: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          user_type: UserType
          role_type?: RoleType
          full_name?: string | null
          email?: string | null
          phone?: string | null
          location?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_type?: UserType
          role_type?: RoleType
          full_name?: string | null
          email?: string | null
          phone?: string | null
          location?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      role_switch_history: {
        Row: {
          id: string
          user_id: string
          old_role: UserType
          new_role: UserType
          switched_at: string
        }
        Insert: {
          id?: string
          user_id: string
          old_role: UserType
          new_role: UserType
          switched_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          old_role?: UserType
          new_role?: UserType
          switched_at?: string
        }
      }
      project_proposals: {
        Row: {
          id: string
          project_id: string
          provider_id: string
          quote_amount: number
          start_date: string
          comments: string
          portfolio_items: string[]
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          provider_id: string
          quote_amount: number
          start_date: string
          comments: string
          portfolio_items: string[]
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          provider_id?: string
          quote_amount?: number
          start_date?: string
          comments?: string
          portfolio_items?: string[]
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      customer_projects: {
        Row: {
          id: string
          customer_id: string
          name: string
          description: string | null
          start_date: string
          end_date: string
          location: string
          category: ServiceCategory
          budget_min: number
          budget_max: number
          status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled'
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          name: string
          description?: string | null
          start_date: string
          end_date: string
          location: string
          category: ServiceCategory
          budget_min: number
          budget_max: number
          status?: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string
          location?: string
          category?: ServiceCategory
          budget_min?: number
          budget_max?: number
          status?: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string | null
          updated_at?: string | null
        }
      }
      project_providers: {
        Row: {
          id: string
          project_id: string
          provider_id: string
          status: 'pending' | 'accepted' | 'rejected' | 'completed'
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          provider_id: string
          status?: 'pending' | 'accepted' | 'rejected' | 'completed'
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          provider_id?: string
          status?: 'pending' | 'accepted' | 'rejected' | 'completed'
          created_at?: string | null
          updated_at?: string | null
        }
      }
      provider_profiles: {
        Row: {
          id: string
          business_name: string | null
          business_description: string | null
          years_in_business: number | null
          website: string | null
          profile_completion_percentage: number
          average_rating: number
          total_reviews: number
          skills: string[] | null
          experience_level: string | null
          description: string | null
          available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          business_name?: string | null
          business_description?: string | null
          years_in_business?: number | null
          website?: string | null
          profile_completion_percentage?: number
          average_rating?: number
          total_reviews?: number
          skills?: string[] | null
          experience_level?: string | null
          description?: string | null
          available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_name?: string | null
          business_description?: string | null
          years_in_business?: number | null
          website?: string | null
          profile_completion_percentage?: number
          average_rating?: number
          total_reviews?: number
          skills?: string[] | null
          experience_level?: string | null
          description?: string | null
          available?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}