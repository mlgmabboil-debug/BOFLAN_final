// Configuration file for Supabase client
// Imports variables from the environment to prevent leaking secrets in source code.

export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!projectId || !publicAnonKey) {
  console.warn(
    "Supabase configuration is incomplete. Please set VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY in your environment secrets."
  );
}

let apiStatusCache: 'online' | 'offline' | 'unchecked' = 'unchecked';
let lastCheck = 0;

export async function isEdgeFunctionOnline(apiBase: string, key: string): Promise<boolean> {
  const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
  if (!isSupabaseValid) return false;

  if (apiStatusCache === 'offline' && Date.now() - lastCheck < 30000) {
    return false;
  }
  if (apiStatusCache === 'online') {
    return true;
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${apiBase}/posts`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal
    });
    clearTimeout(id);

    const bodyStr = await res.text().catch(() => '');
    if (res.status === 404 || res.status === 400 || bodyStr.includes('Function not found') || bodyStr.includes('not found')) {
      apiStatusCache = 'offline';
      lastCheck = Date.now();
      return false;
    }

    apiStatusCache = 'online';
    return true;
  } catch {
    apiStatusCache = 'offline';
    lastCheck = Date.now();
    return false;
  }
}
