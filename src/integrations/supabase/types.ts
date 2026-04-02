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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      branch_users: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      credit_notes: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          created_by: string
          id: string
          note_number: string
          reason: string | null
          reference_id: string | null
          reference_type: string
          type: string
        }
        Insert: {
          amount?: number
          branch_id: string
          created_at?: string
          created_by: string
          id?: string
          note_number: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string
          type?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          created_by?: string
          id?: string
          note_number?: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          batch_number: string
          branch_id: string
          category: Database["public"]["Enums"]["medicine_category"]
          created_at: string
          description: string | null
          expiry_date: string
          gst_rate: number | null
          hsn_code: string | null
          id: string
          manufacturer: string | null
          min_quantity: number
          mrp: number | null
          name: string
          price: number
          quantity: number
          updated_at: string
        }
        Insert: {
          batch_number: string
          branch_id: string
          category?: Database["public"]["Enums"]["medicine_category"]
          created_at?: string
          description?: string | null
          expiry_date: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          manufacturer?: string | null
          min_quantity?: number
          mrp?: number | null
          name: string
          price?: number
          quantity?: number
          updated_at?: string
        }
        Update: {
          batch_number?: string
          branch_id?: string
          category?: Database["public"]["Enums"]["medicine_category"]
          created_at?: string
          description?: string | null
          expiry_date?: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          manufacturer?: string | null
          min_quantity?: number
          mrp?: number | null
          name?: string
          price?: number
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicines_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          batch_number: string | null
          created_at: string
          expiry_date: string | null
          gst_rate: number | null
          id: string
          medicine_id: string | null
          medicine_name: string
          purchase_order_id: string
          quantity: number
          total_price: number | null
          unit_price: number
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          gst_rate?: number | null
          id?: string
          medicine_id?: string | null
          medicine_name: string
          purchase_order_id: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          gst_rate?: number | null
          id?: string
          medicine_id?: string | null
          medicine_name?: string
          purchase_order_id?: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          gst_amount: number | null
          id: string
          net_amount: number | null
          notes: string | null
          order_number: string
          received_at: string | null
          status: string
          supplier_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          gst_amount?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          order_number: string
          received_at?: string | null
          status?: string
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          gst_amount?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          order_number?: string
          received_at?: string | null
          status?: string
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cgst: number | null
          created_at: string
          gst_rate: number | null
          hsn_code: string | null
          id: string
          medicine_id: string
          medicine_name: string
          quantity: number
          sale_id: string
          sgst: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          cgst?: number | null
          created_at?: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          medicine_id: string
          medicine_name: string
          quantity: number
          sale_id: string
          sgst?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          cgst?: number | null
          created_at?: string
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          medicine_id?: string
          medicine_name?: string
          quantity?: number
          sale_id?: string
          sgst?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string
          cgst: number | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          discount: number
          gst_amount: number | null
          id: string
          igst: number | null
          invoice_number: string
          net_amount: number
          payment_method: string
          sgst: number | null
          sold_by: string
          total_amount: number
        }
        Insert: {
          branch_id: string
          cgst?: number | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          gst_amount?: number | null
          id?: string
          igst?: number | null
          invoice_number: string
          net_amount?: number
          payment_method?: string
          sgst?: number | null
          sold_by: string
          total_amount?: number
        }
        Update: {
          branch_id?: string
          cgst?: number | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          gst_amount?: number | null
          id?: string
          igst?: number | null
          invoice_number?: string
          net_amount?: number
          payment_method?: string
          sgst?: number | null
          sold_by?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_return_items: {
        Row: {
          created_at: string
          id: string
          medicine_id: string
          medicine_name: string
          quantity: number
          sales_return_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_id: string
          medicine_name: string
          quantity: number
          sales_return_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          medicine_id?: string
          medicine_name?: string
          quantity?: number
          sales_return_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_return_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_sales_return_id_fkey"
            columns: ["sales_return_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          id: string
          reason: string | null
          return_number: string
          sale_id: string
          status: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          id?: string
          reason?: string | null
          return_number: string
          sale_id: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          id?: string
          reason?: string | null
          return_number?: string
          sale_id?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_by: string | null
          created_at: string
          from_branch_id: string
          id: string
          medicine_id: string
          notes: string | null
          quantity: number
          requested_by: string
          status: Database["public"]["Enums"]["transfer_status"]
          to_branch_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          from_branch_id: string
          id?: string
          medicine_id: string
          notes?: string | null
          quantity: number
          requested_by: string
          status?: Database["public"]["Enums"]["transfer_status"]
          to_branch_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          from_branch_id?: string
          id?: string
          medicine_id?: string
          notes?: string | null
          quantity?: number
          requested_by?: string
          status?: Database["public"]["Enums"]["transfer_status"]
          to_branch_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      medicine_category:
        | "tablet"
        | "capsule"
        | "syrup"
        | "injection"
        | "ointment"
        | "drops"
        | "inhaler"
        | "other"
      transfer_status: "pending" | "approved" | "rejected" | "completed"
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
      app_role: ["admin", "user"],
      medicine_category: [
        "tablet",
        "capsule",
        "syrup",
        "injection",
        "ointment",
        "drops",
        "inhaler",
        "other",
      ],
      transfer_status: ["pending", "approved", "rejected", "completed"],
    },
  },
} as const
