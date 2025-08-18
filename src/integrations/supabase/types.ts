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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string | null
          customer_id: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          scheduled_date: string
          scheduled_time: string
          service_name: string
          service_price: number
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          scheduled_date: string
          scheduled_time: string
          service_name: string
          service_price: number
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string
          service_name?: string
          service_price?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          cpf_cnpj: string | null
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          id: string
          is_active: boolean | null
          nome: string
          pontos_fidelidade: number | null
          telefone: string | null
          total_compras: number | null
          ultima_compra: string | null
          updated_at: string | null
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
          pontos_fidelidade?: number | null
          telefone?: string | null
          total_compras?: number | null
          ultima_compra?: string | null
          updated_at?: string | null
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
          pontos_fidelidade?: number | null
          telefone?: string | null
          total_compras?: number | null
          ultima_compra?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          preco_unitario: number
          product_id: string
          quantidade: number
          subtotal: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          preco_unitario: number
          product_id: string
          quantidade: number
          subtotal: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          preco_unitario?: number
          product_id?: string
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_id: string | null
          desconto: number | null
          endereco_entrega: string | null
          id: string
          numero_pedido: number
          observacoes: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          taxa_entrega: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          desconto?: number | null
          endereco_entrega?: string | null
          id?: string
          numero_pedido?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          taxa_entrega?: number | null
          total: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          desconto?: number | null
          endereco_entrega?: string | null
          id?: string
          numero_pedido?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          taxa_entrega?: number | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          categoria: Database["public"]["Enums"]["product_category"]
          codigo_barras: string | null
          created_at: string | null
          descricao: string | null
          estoque_atual: number | null
          estoque_maximo: number | null
          estoque_minimo: number | null
          foto_url: string | null
          id: string
          is_active: boolean | null
          marca: string | null
          margem_lucro: number | null
          nome: string
          preco_custo: number | null
          preco_venda: number
          supplier_id: string | null
          teor_alcoolico: number | null
          updated_at: string | null
          volume: string | null
        }
        Insert: {
          categoria: Database["public"]["Enums"]["product_category"]
          codigo_barras?: string | null
          created_at?: string | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          foto_url?: string | null
          id?: string
          is_active?: boolean | null
          marca?: string | null
          margem_lucro?: number | null
          nome: string
          preco_custo?: number | null
          preco_venda: number
          supplier_id?: string | null
          teor_alcoolico?: number | null
          updated_at?: string | null
          volume?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["product_category"]
          codigo_barras?: string | null
          created_at?: string | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          foto_url?: string | null
          id?: string
          is_active?: boolean | null
          marca?: string | null
          margem_lucro?: number | null
          nome?: string
          preco_custo?: number | null
          preco_venda?: number
          supplier_id?: string | null
          teor_alcoolico?: number | null
          updated_at?: string | null
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          nome: string
          role: Database["public"]["Enums"]["user_role"] | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          is_active?: boolean | null
          nome: string
          role?: Database["public"]["Enums"]["user_role"] | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          nome?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: string
          is_active: boolean | null
          nome: string
          product_id: string | null
          tipo: string | null
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
          product_id?: string | null
          tipo?: string | null
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
          product_id?: string | null
          tipo?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string | null
          desconto: number | null
          id: string
          preco_unitario: number
          product_id: string
          quantidade: number
          sale_id: string
          subtotal: number
        }
        Insert: {
          created_at?: string | null
          desconto?: number | null
          id?: string
          preco_unitario: number
          product_id: string
          quantidade: number
          sale_id: string
          subtotal: number
        }
        Update: {
          created_at?: string | null
          desconto?: number | null
          id?: string
          preco_unitario?: number
          product_id?: string
          quantidade?: number
          sale_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          created_at: string | null
          customer_id: string | null
          desconto: number | null
          id: string
          numero_venda: number
          observacoes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["transaction_status"] | null
          subtotal: number
          total: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          desconto?: number | null
          id?: string
          numero_venda?: number
          observacoes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["transaction_status"] | null
          subtotal: number
          total: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          desconto?: number | null
          id?: string
          numero_venda?: number
          observacoes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["transaction_status"] | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string | null
          data_validade: string | null
          estoque_anterior: number
          estoque_atual: number
          id: string
          lote: string | null
          motivo: string | null
          preco_unitario: number | null
          product_id: string
          quantidade: number
          tipo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_validade?: string | null
          estoque_anterior: number
          estoque_atual: number
          id?: string
          lote?: string | null
          motivo?: string | null
          preco_unitario?: number | null
          product_id: string
          quantidade: number
          tipo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_validade?: string | null
          estoque_anterior?: number
          estoque_atual?: number
          id?: string
          lote?: string | null
          motivo?: string | null
          preco_unitario?: number | null
          product_id?: string
          quantidade?: number
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          cnpj: string | null
          contato_responsavel: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          is_active: boolean | null
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          contato_responsavel?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          contato_responsavel?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          categoria: string
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          sale_id: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          supplier_id: string | null
          tipo: string
          user_id: string | null
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          supplier_id?: string | null
          tipo: string
          user_id?: string | null
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          supplier_id?: string | null
          tipo?: string
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      order_status:
        | "aguardando"
        | "preparando"
        | "pronto"
        | "saiu_entrega"
        | "entregue"
        | "cancelado"
      payment_method:
        | "dinheiro"
        | "pix"
        | "cartao_debito"
        | "cartao_credito"
        | "tef"
      product_category:
        | "vinho"
        | "cerveja"
        | "destilado"
        | "espumante"
        | "outros"
      transaction_status: "pendente" | "pago" | "cancelado" | "estornado"
      user_role: "admin" | "gerente" | "operador" | "estoquista"
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
      order_status: [
        "aguardando",
        "preparando",
        "pronto",
        "saiu_entrega",
        "entregue",
        "cancelado",
      ],
      payment_method: [
        "dinheiro",
        "pix",
        "cartao_debito",
        "cartao_credito",
        "tef",
      ],
      product_category: [
        "vinho",
        "cerveja",
        "destilado",
        "espumante",
        "outros",
      ],
      transaction_status: ["pendente", "pago", "cancelado", "estornado"],
      user_role: ["admin", "gerente", "operador", "estoquista"],
    },
  },
} as const
