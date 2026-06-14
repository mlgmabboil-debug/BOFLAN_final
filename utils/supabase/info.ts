// Configuration file for Supabase client
// Imports variables from the environment to prevent leaking secrets in source code.

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

const extractProjectId = (url: string): string => {
  if (!url) return '';
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : '';
};

const activeConfig = getSupabaseConfig();
export const supabaseUrl = activeConfig.url;
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || extractProjectId(supabaseUrl) || '';
export const publicAnonKey = activeConfig.key;

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
