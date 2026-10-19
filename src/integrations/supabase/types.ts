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
      clients: {
        Row: {
          address: string | null
          address_number: string | null
          city: string | null
          company: string | null
          complement: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
          cep: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          city?: string | null
          company?: string | null
          complement?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          cep?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          city?: string | null
          company?: string | null
          complement?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          cep?: string | null
        }
        Relationships: []
      }
      pricing_parameters: {
        Row: {
          created_at: string
          default_complexity: number
          default_margin: number
          hourly_rate: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_complexity?: number
          default_margin?: number
          hourly_rate?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_complexity?: number
          default_margin?: number
          hourly_rate?: number
          id?: string
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
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_stages: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          project_id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          project_id: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          project_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          general_notes: string | null
          id: string
          links: string[] | null
          name: string
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          general_notes?: string | null
          id?: string
          links?: string[] | null
          name: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          general_notes?: string | null
          id?: string
          links?: string[] | null
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          budget_number: string
          status: "aguardando" | "aprovado" | "cancelado"
          client_name: string
          client_email: string | null
          project_name: string
          total_value: number
          budget_data: Json
          email_sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          budget_number: string
          status?: "aguardando" | "aprovado" | "cancelado"
          client_name: string
          client_email?: string | null
          project_name: string
          total_value?: number
          budget_data?: Json
          email_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          budget_number?: string
          status?: "aguardando" | "aprovado" | "cancelado"
          client_name?: string
          client_email?: string | null
          project_name?: string
          total_value?: number
          budget_data?: Json
          email_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_counter: {
        Row: {
          id: string
          user_id: string
          year: number
          last_number: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          last_number?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          last_number?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          id: string
          user_id: string
          sku: string | null
          name: string
          description: string | null
          category: string
          unit: string
          quantity: number
          min_quantity: number
          cost_price: number
          sale_price: number
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sku?: string | null
          name: string
          description?: string | null
          category?: string
          unit?: string
          quantity?: number
          min_quantity?: number
          cost_price?: number
          sale_price?: number
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sku?: string | null
          name?: string
          description?: string | null
          category?: string
          unit?: string
          quantity?: number
          min_quantity?: number
          cost_price?: number
          sale_price?: number
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          id: string
          user_id: string
          item_id: string
          movement_type: "entrada" | "saida_orcamento" | "ajuste_manual" | "devolucao"
          quantity: number
          unit_cost: number
          reference_budget_id: string | null
          reference_project_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          movement_type: "entrada" | "saida_orcamento" | "ajuste_manual" | "devolucao"
          quantity: number
          unit_cost?: number
          reference_budget_id?: string | null
          reference_project_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          movement_type?: "entrada" | "saida_orcamento" | "ajuste_manual" | "devolucao"
          quantity?: number
          unit_cost?: number
          reference_budget_id?: string | null
          reference_project_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_reference_budget_id_fkey"
            columns: ["reference_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_reference_project_id_fkey"
            columns: ["reference_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      client_hub_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          project_id: string | null
          budget_id: string | null
          is_active: boolean
          allow_client_approval: boolean
          expires_at: string | null
          last_accessed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token?: string
          project_id?: string | null
          budget_id?: string | null
          is_active?: boolean
          allow_client_approval?: boolean
          expires_at?: string | null
          last_accessed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          project_id?: string | null
          budget_id?: string | null
          is_active?: boolean
          allow_client_approval?: boolean
          expires_at?: string | null
          last_accessed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_hub_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_hub_tokens_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          }
        ]
      }
      operational_expenses: {
        Row: {
          id: string
          user_id: string
          description: string
          category: "administrativa" | "software_cloud" | "ferramentas_oficina" | "infraestrutura" | "comercial_marketing" | "tributos_taxas" | "outros"
          amount: number
          expense_date: string
          is_recurring: boolean
          recurring_period: "mensal" | "anual" | "avulso" | null
          project_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          description: string
          category?: "administrativa" | "software_cloud" | "ferramentas_oficina" | "infraestrutura" | "comercial_marketing" | "tributos_taxas" | "outros"
          amount: number
          expense_date?: string
          is_recurring?: boolean
          recurring_period?: "mensal" | "anual" | "avulso" | null
          project_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          description?: string
          category?: "administrativa" | "software_cloud" | "ferramentas_oficina" | "infraestrutura" | "comercial_marketing" | "tributos_taxas" | "outros"
          amount?: number
          expense_date?: string
          is_recurring?: boolean
          recurring_period?: "mensal" | "anual" | "avulso" | null
          project_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_client_hub_data: {
        Args: {
          p_token: string
        }
        Returns: Json
      }
      get_next_budget_number: {
        Args: {
          p_user_id: string
          p_year: number
        }
        Returns: number
      }
      ping: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      project_status: "em_andamento" | "concluido" | "pausado" | "cancelado"
      inventory_movement_type: "entrada" | "saida_orcamento" | "ajuste_manual" | "devolucao"
      expense_category: "administrativa" | "software_cloud" | "ferramentas_oficina" | "infraestrutura" | "comercial_marketing" | "tributos_taxas" | "outros"
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
      project_status: ["em_andamento", "concluido", "pausado", "cancelado"],
    },
  },
} as const
