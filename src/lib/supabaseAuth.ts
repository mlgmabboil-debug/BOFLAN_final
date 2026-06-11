import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

const createDummyProxy = (): any => {
  const mockAuth = {
    signInWithPassword: async ({ email, password }: any) => {
      const emailName = email ? email.split('@')[0] : "user";
      return {
        data: {
          session: { access_token: "mock-session-id" },
          user: { 
            id: "mock_u_" + emailName + "_" + Math.random().toString(36).slice(2, 7), 
            email: email || "user@example.com",
            user_metadata: {
              display_name: emailName,
              username: emailName
            }
          }
        },
        error: null
      };
    },
    signUp: async ({ email, password }: any) => {
      const emailName = email ? email.split('@')[0] : "user";
      return {
        // Returning session so the app immediately lets user proceed without showing verification constraints
        data: {
          session: { access_token: "mock-session-id" },
          user: { 
            id: "mock_u_" + emailName + "_" + Math.random().toString(36).slice(2, 7), 
            email: email || "user@example.com",
            user_metadata: {
              display_name: emailName,
              username: emailName
            }
          }
        },
        error: null
      };
    },
    getSession: async () => {
      return {
        data: {
          session: { access_token: "mock-session-id" }
        },
        error: null
      };
    },
    updateUser: async ({ data }: any) => {
      return {
        data: {
          user: { id: "mock_user", user_metadata: data }
        },
        error: null
      };
    },
    signOut: async () => {
      return { error: null };
    }
  };

  const dummy: any = () => {};
  return new Proxy(dummy, {
    get(target, prop) {
      if (prop === 'auth') {
        return mockAuth;
      }
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
          console.warn("Supabase keys are missing! Returning a dummy client with auth emulation to prevent crashes.");
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

export const supabaseAuth = createLazySupabaseClient(
  () => `https://${projectId}.supabase.co`,
  () => publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);


export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabaseAuth.auth.getSession();
  return data.session?.access_token ?? null;
}
