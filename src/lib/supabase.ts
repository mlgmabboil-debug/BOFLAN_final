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

function createLazySupabaseClient(urlFunc: () => string, keyFunc: () => string, options?: any) {
  let client: any = null;
  return new Proxy({}, {
    get(target, prop) {
      if (!client) {
        const url = urlFunc();
        const key = keyFunc();
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || ''}.supabase.co`
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createLazySupabaseClient(
  () => supabaseUrl,
  () => supabaseAnonKey || ''
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
