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
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          order_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          order_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          order_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_otp: string | null
          delivery_otp_failed_count: number
          delivery_otp_locked_until: string | null
          delivery_proof_url: string | null
          pickup_proof_url: string | null
          transit_photo_url: string | null
          protection_tier: string
          protection_fee: number
          protection_coverage: number
          fare_locked: boolean
          fare_locked_amount: number
          delivery_priority: string
          priority_fee: number
          scheduled_for: string | null
          business_order: boolean
          business_account_id: string | null
          business_batch_id: string | null
          business_name: string | null
          order_channel: string
          multi_stop_count: number
          trusted_rider_required: boolean
          support_channel: string
          estimated_eta_minutes: number | null
          eta_confidence: number | null
          guarantee_credit_amount: number
          distance_km: number | null
          drop_address: string
          drop_landmark: string | null
          id: string
          is_promo_free: boolean
          item_description: string
          item_photo_url: string | null
          payment_method: string | null
          picked_at: string | null
          pickup_address: string
          pickup_landmark: string | null
          platform_paid_amount: number
          price_offered: number
          receiver_phone: string | null
          rider_id: string | null
          sender_id: string | null
          sender_paid_amount: number
          sender_phone: string
          status: Database["public"]["Enums"]["order_status"] | null
          suggested_price: number | null
          tracking_code: string
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_otp?: string | null
          delivery_otp_failed_count?: number
          delivery_otp_locked_until?: string | null
          delivery_proof_url?: string | null
          pickup_proof_url?: string | null
          transit_photo_url?: string | null
          protection_tier?: string
          protection_fee?: number
          protection_coverage?: number
          fare_locked?: boolean
          fare_locked_amount?: number
          delivery_priority?: string
          priority_fee?: number
          scheduled_for?: string | null
          business_order?: boolean
          business_account_id?: string | null
          business_batch_id?: string | null
          business_name?: string | null
          order_channel?: string
          multi_stop_count?: number
          trusted_rider_required?: boolean
          support_channel?: string
          estimated_eta_minutes?: number | null
          eta_confidence?: number | null
          guarantee_credit_amount?: number
          distance_km?: number | null
          drop_address: string
          drop_landmark?: string | null
          id?: string
          is_promo_free?: boolean
          item_description: string
          item_photo_url?: string | null
          payment_method?: string | null
          picked_at?: string | null
          pickup_address: string
          pickup_landmark?: string | null
          platform_paid_amount?: number
          price_offered: number
          receiver_phone?: string | null
          rider_id?: string | null
          sender_id?: string | null
          sender_paid_amount?: number
          sender_phone: string
          status?: Database["public"]["Enums"]["order_status"] | null
          suggested_price?: number | null
          tracking_code: string
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_otp?: string | null
          delivery_otp_failed_count?: number
          delivery_otp_locked_until?: string | null
          delivery_proof_url?: string | null
          pickup_proof_url?: string | null
          transit_photo_url?: string | null
          protection_tier?: string
          protection_fee?: number
          protection_coverage?: number
          fare_locked?: boolean
          fare_locked_amount?: number
          delivery_priority?: string
          priority_fee?: number
          scheduled_for?: string | null
          business_order?: boolean
          business_account_id?: string | null
          business_batch_id?: string | null
          business_name?: string | null
          order_channel?: string
          multi_stop_count?: number
          trusted_rider_required?: boolean
          support_channel?: string
          estimated_eta_minutes?: number | null
          eta_confidence?: number | null
          guarantee_credit_amount?: number
          distance_km?: number | null
          drop_address?: string
          drop_landmark?: string | null
          id?: string
          is_promo_free?: boolean
          item_description?: string
          item_photo_url?: string | null
          payment_method?: string | null
          picked_at?: string | null
          pickup_address?: string
          pickup_landmark?: string | null
          platform_paid_amount?: number
          price_offered?: number
          receiver_phone?: string | null
          rider_id?: string | null
          sender_id?: string | null
          sender_paid_amount?: number
          sender_phone?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          suggested_price?: number | null
          tracking_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_qr_tokens: {
        Row: {
          assigned_rider_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          order_id: string
          revoked_at: string | null
          token_hash: string
          token_type: string
          used_at: string | null
          used_by: string | null
          used_rider_id: string | null
        }
        Insert: {
          assigned_rider_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          order_id: string
          revoked_at?: string | null
          token_hash: string
          token_type: string
          used_at?: string | null
          used_by?: string | null
          used_rider_id?: string | null
        }
        Update: {
          assigned_rider_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          order_id?: string
          revoked_at?: string | null
          token_hash?: string
          token_type?: string
          used_at?: string | null
          used_by?: string | null
          used_rider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_qr_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_qr_tokens_assigned_rider_id_fkey"
            columns: ["assigned_rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      business_accounts: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          business_type: string
          city: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          default_order_channel: string
          gst_number: string | null
          id: string
          monthly_volume_estimate: number
          name: string
          notes: string | null
          owner_id: string | null
          status: string
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_type?: string
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          default_order_channel?: string
          gst_number?: string | null
          id?: string
          monthly_volume_estimate?: number
          name: string
          notes?: string | null
          owner_id?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_type?: string
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          default_order_channel?: string
          gst_number?: string | null
          id?: string
          monthly_volume_estimate?: number
          name?: string
          notes?: string | null
          owner_id?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_delivery_batches: {
        Row: {
          business_account_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          status: string
          total_stops: number
          updated_at: string
        }
        Insert: {
          business_account_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string
          total_stops?: number
          updated_at?: string
        }
        Update: {
          business_account_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string
          total_stops?: number
          updated_at?: string
        }
        Relationships: []
      }
      business_inquiries: {
        Row: {
          business_account_id: string | null
          business_name: string
          business_type: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          created_by: string | null
          estimated_orders_per_month: number
          id: string
          message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_account_id?: string | null
          business_name: string
          business_type?: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at?: string
          created_by?: string | null
          estimated_orders_per_month?: number
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_account_id?: string | null
          business_name?: string
          business_type?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          created_by?: string | null
          estimated_orders_per_month?: number
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_members: {
        Row: {
          business_account_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          business_account_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          business_account_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      free_delivery_claims: {
        Row: {
          claimed_at: string
          created_at: string
          id: string
          order_id: string | null
          refund_reason: string | null
          refunded_at: string | null
          refunded_by: string | null
          sender_phone: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          created_at?: string
          id?: string
          order_id?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          sender_phone: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          created_at?: string
          id?: string
          order_id?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          sender_phone?: string
          user_id?: string
        }
        Relationships: []
      }
      rider_reviews: {
        Row: {
          business_context: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          parcel_arrived_safely: boolean
          review_tags: string[]
          reviewer_id: string | null
          rider_id: string
          trust_again: boolean
          was_on_time: boolean
        }
        Insert: {
          business_context?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          parcel_arrived_safely: boolean
          review_tags?: string[]
          reviewer_id?: string | null
          rider_id: string
          trust_again: boolean
          was_on_time: boolean
        }
        Update: {
          business_context?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          parcel_arrived_safely?: boolean
          review_tags?: string[]
          reviewer_id?: string | null
          rider_id?: string
          trust_again?: boolean
          was_on_time?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rider_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_reviews_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          guest_expires_at: string | null
          id: string
          is_guest: boolean | null
          phone: string | null
          phone_verified_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          guest_expires_at?: string | null
          id: string
          is_guest?: boolean | null
          phone?: string | null
          phone_verified_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          guest_expires_at?: string | null
          id?: string
          is_guest?: boolean | null
          phone?: string | null
          phone_verified_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      riders: {
        Row: {
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          id: string
          is_online: boolean | null
          license_photo_url: string | null
          status: Database["public"]["Enums"]["rider_status"] | null
          updated_at: string | null
          user_id: string
          vehicle_photo_url: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          id?: string
          is_online?: boolean | null
          license_photo_url?: string | null
          status?: Database["public"]["Enums"]["rider_status"] | null
          updated_at?: string | null
          user_id: string
          vehicle_photo_url?: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          id?: string
          is_online?: boolean | null
          license_photo_url?: string | null
          status?: Database["public"]["Enums"]["rider_status"] | null
          updated_at?: string | null
          user_id?: string
          vehicle_photo_url?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: []
      }
      service_zones: {
        Row: {
          base_price: number | null
          city: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price_per_km: number | null
        }
        Insert: {
          base_price?: number | null
          city: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_per_km?: number | null
        }
        Update: {
          base_price?: number | null
          city?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_per_km?: number | null
        }
        Relationships: []
      }
      user_promos: {
        Row: {
          created_at: string
          free_deliveries_remaining: number
          total_free_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          free_deliveries_remaining?: number
          total_free_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          free_deliveries_remaining?: number
          total_free_used?: number
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
      consume_order_qr_token: {
        Args: { _order_id?: string | null; _token: string; _token_type?: string }
        Returns: Json
      }
      can_manage_business: {
        Args: { _business_account_id: string; _user_id?: string }
        Returns: boolean
      }
      consume_free_delivery: {
        Args: { _order_id: string; _sender_phone: string; _user_id: string }
        Returns: boolean
      }
      generate_tracking_code: { Args: never; Returns: string }
      get_free_delivery_eligibility: {
        Args: { _sender_phone?: string | null }
        Returns: Json
      }
      get_public_order: { Args: { _code: string }; Returns: Json }
      get_rider_trust_profile: { Args: { _rider_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_member: {
        Args: { _business_account_id: string; _user_id?: string }
        Returns: boolean
      }
      normalize_phone_10: { Args: { _phone: string }; Returns: string }
      refund_free_delivery: {
        Args: { _order_id?: string | null; _sender_phone?: string | null; _user_id: string }
        Returns: undefined
      }
      issue_order_qr_token: {
        Args: { _order_id: string; _token_type?: string; _ttl_seconds?: number }
        Returns: Json
      }
      issue_receiver_delivery_qr_token: {
        Args: { _tracking_code: string; _ttl_seconds?: number }
        Returns: Json
      }
      verify_delivery_otp: {
        Args: { _order_id: string; _otp: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "rider" | "sender"
      order_status:
        | "pending"
        | "accepted"
        | "picked"
        | "in_transit"
        | "delivered"
        | "cancelled"
      rider_status: "pending" | "approved" | "suspended"
      vehicle_type: "bike" | "scooter" | "car" | "bicycle"
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
      app_role: ["admin", "rider", "sender"],
      order_status: [
        "pending",
        "accepted",
        "picked",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      rider_status: ["pending", "approved", "suspended"],
      vehicle_type: ["bike", "scooter", "car", "bicycle"],
    },
  },
} as const
