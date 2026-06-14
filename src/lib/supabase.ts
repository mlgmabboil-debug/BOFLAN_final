import { createClient } from '@supabase/supabase-js'

const createDummyProxy = (): any => {
  const dummy: any = () => {};
  return new Proxy(dummy, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: any) => resolve({
          data: new Proxy({}, { get: (t, p) => p === 'session' ? null : (p === 'publicUrl' ? "" : {}) }),
          error: null
        });
      }
      return createDummyProxy();
    },
    apply() {
      return createDummyProxy();
    }
  });
};

const DEFAULT_SUPABASE_URL = "https://cqsquukhdztmpruspoqr.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxc3F1dWtoZHp0bXBydXNwb3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDIwMzcsImV4cCI6MjA4Nzk3ODAzN30._id-OteAqWSI7WZnr7CjP5w7b6b33rFKdA_edMvX9iM";

export const getSupabaseConfig = () => {
  if (typeof window !== "undefined") {
    const localUrl = localStorage.getItem("boflan_supabase_url");
    const localKey = localStorage.getItem("boflan_supabase_anon_key");
    if (localUrl && localKey) {
      return { url: localUrl.trim(), key: localKey.trim() };
    }
  }
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (envUrl && envKey && !envUrl.includes("undefined") && !envKey.includes("undefined")) {
    return { url: envUrl.trim(), key: envKey.trim() };
  }
  return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_ANON_KEY };
};

function createLazySupabaseClient(urlFunc: () => string, keyFunc: () => string, options?: any) {
  let client: any = null;
  let lastUrl = '';
  let lastKey = '';
  return new Proxy({}, {
    get(target, prop) {
      const url = urlFunc();
      const key = keyFunc();
      
      if (!client || url !== lastUrl || key !== lastKey) {
        lastUrl = url;
        lastKey = key;
        if (!url || url.includes('undefined') || !url.replace('https://', '').replace('.supabase.co', '') || !key) {
          console.warn("Supabase keys are missing! Returning a dummy client to prevent crashes.");
          client = createDummyProxy();
        } else {
          client = createClient(url, key, options);
        }
      }
      
      const val = client[prop];
      if (typeof val === 'function') {
        return val.bind(client);
      }
      return val;
    }
  }) as any;
}

export const supabase = createLazySupabaseClient(
  () => getSupabaseConfig().url,
  () => getSupabaseConfig().key
)


// Database types
export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          price_usd: number
          price_eth: string | null
          max_members: number
          tags: string[] | null
          premium: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          price_usd?: number
          price_eth?: string | null
          max_members?: number
          tags?: string[] | null
          premium?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          price_usd?: number
          price_eth?: string | null
          max_members?: number
          tags?: string[] | null
          premium?: boolean
          updated_at?: string
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      group_posts: {
        Row: {
          id: string
          group_id: string
          user_id: string
          content: string
          post_type: string
          coin_symbol: string | null
          direction: string | null
          entry_price: number | null
          target_price: number | null
          stop_loss: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          content: string
          post_type?: string
          coin_symbol?: string | null
          direction?: string | null
          entry_price?: number | null
          target_price?: number | null
          stop_loss?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          content?: string
          post_type?: string
          coin_symbol?: string | null
          direction?: string | null
          entry_price?: number | null
          target_price?: number | null
          stop_loss?: number | null
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          group_id: string
          user_id: string
          amount_usd: number
          amount_eth: number | null
          tx_hash: string | null
          status: string
          platform_fee: number
          creator_payout: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          amount_usd: number
          amount_eth?: number | null
          tx_hash?: string | null
          status?: string
          platform_fee: number
          creator_payout: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          amount_usd?: number
          amount_eth?: number | null
          tx_hash?: string | null
          status?: string
          platform_fee?: number
          creator_payout?: number
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          verified?: boolean
          updated_at?: string
        }
      }
      portfolio: {
        Row: {
          id: string
          user_id: string
          coin_symbol: string
          coin_name: string | null
          amount: number
          avg_buy_price: number
          current_price: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          coin_symbol: string
          coin_name?: string | null
          amount: number
          avg_buy_price: number
          current_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          coin_symbol?: string
          coin_name?: string | null
          amount?: number
          avg_buy_price?: number
          current_price?: number | null
          updated_at?: string
        }
      }
    }
  }
}
