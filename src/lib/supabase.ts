// Requires: npm install @supabase/supabase-js
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const hasSupabaseConfig = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(env.supabaseUrl, env.supabaseAnonKey)
  : null;

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          tagline: string;
          description: string;
          category: "bottled-water" | "coolers" | "dispensers" | "accessories";
          price: number;
          cost: number;
          unit: string;
          stock: number;
          reserved_stock: number;
          image: string;
          features: string[];
          featured: boolean;
          volume_ml: number | null;
          visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          name: string;
          tagline: string;
          description: string;
          category: "bottled-water" | "coolers" | "dispensers" | "accessories";
          price: number;
          cost?: number;
          unit: string;
          stock?: number;
          reserved_stock?: number;
          image: string;
          features?: string[];
          featured?: boolean;
          volume_ml?: number | null;
          visible?: boolean;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          tagline?: string;
          description?: string;
          category?: "bottled-water" | "coolers" | "dispensers" | "accessories";
          price?: number;
          cost?: number;
          unit?: string;
          stock?: number;
          reserved_stock?: number;
          image?: string;
          features?: string[];
          featured?: boolean;
          volume_ml?: number | null;
          visible?: boolean;
        };
      };
      orders: {
        Row: {
          id: string;
          order_ref: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          delivery_address: string | null;
          delivery_city: string | null;
          delivery_postal_code: string | null;
          delivery_notes: string | null;
          delivery_method: "delivery" | "collection";
          subtotal: number;
          delivery_fee: number;
          total: number;
          status: "pending_payment" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "expired";
          payfast_payment_id: string | null;
          whatsapp_optin: boolean;
          reservation_expires_at: string | null;
          checkout_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_ref: string;
          customer_name: string;
          customer_email: string;
          customer_phone?: string | null;
          delivery_address?: string | null;
          delivery_city?: string | null;
          delivery_postal_code?: string | null;
          delivery_notes?: string | null;
          delivery_method?: "delivery" | "collection";
          subtotal: number;
          delivery_fee?: number;
          total: number;
          status?: "pending_payment" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "expired";
          payfast_payment_id?: string | null;
          whatsapp_optin?: boolean;
          reservation_expires_at?: string | null;
          checkout_token?: string;
        };
        Update: {
          id?: string;
          order_ref?: string;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string | null;
          delivery_address?: string | null;
          delivery_city?: string | null;
          delivery_postal_code?: string | null;
          delivery_notes?: string | null;
          delivery_method?: "delivery" | "collection";
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          status?: "pending_payment" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "expired";
          payfast_payment_id?: string | null;
          whatsapp_optin?: boolean;
          reservation_expires_at?: string | null;
          checkout_token?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_price: number;
          quantity: number;
          line_total: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_price: number;
          quantity: number;
          line_total: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          product_price?: number;
          quantity?: number;
          line_total?: number;
        };
      };
      order_status_events: {
        Row: {
          id: string;
          order_id: string;
          status: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: string;
          note?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: string;
          note?: string | null;
        };
      };
    };
  };
}
