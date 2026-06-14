import { createContext, useContext, useState, ReactNode } from "react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { sanitizeAvatarUrl, sanitizeEthAddress, sanitizePlainText, sanitizeUsername } from "../utils/sanitize";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6d3e2891`;

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isGuest: boolean;
  exchange?: string;
  verified: boolean;
  pnl: string;
  portfolioValue: string;
  followers: number;
  following: number;
  winRate: number;
  totalTrades: number;
  bio: string;
  /** Публичный ETH-адрес только для отображения баланса (без Web3-подключения). */
  watchedEthAddress?: string;
  /**
   * Секрет для изменения публичного профиля на сервере (не передаётся другим пользователям).
   * Хранится только у владельца в localStorage.
   */
  profileSecret?: string;
  /** Web3 кошелек пользователя */
  wallet_address?: string;
  /** Верифицирован ли Web3 кошелек */
  wallet_verified?: boolean;
}

interface UserContextValue {
  user: AppUser | null;
  setUser: (user: AppUser) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

const STORAGE_KEY = "boflan_user";

function diceAvatar(seed: string) {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed.slice(0, 64))}`;
}

function clampInt(n: unknown, min: number, max: number, fallback = 0): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function sanitizeProfileSecret(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const t = input.trim();
  if (!/^[a-f0-9]{64}$/.test(t)) return undefined;
  return t;
}

function generateUUID(): string {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return '00000000-0000-4000-8000-' + String(Date.now() + Math.floor(Math.random() * 100000)).padStart(12, '0');
  }
}

function isValidUUID(str: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
}

/** Восстановление пользователя из localStorage без доверия к подделанным полям. */
function parseStoredUser(json: string): AppUser | null {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    let id = typeof o.id === "string" ? o.id.replace(/[^\w-]/g, "").slice(0, 80) : "";
    const username = sanitizeUsername(o.username, 32);
    if (!id || !username) return null;

    // Migrate non-UUID ID to strict UUID
    if (!isValidUUID(id)) {
      const oldId = id;
      id = generateUUID();
      try {
        const oldPortfolioKey = `boflan_portfolio_${oldId}`;
        const newPortfolioKey = `boflan_portfolio_${id}`;
        const portfolioData = localStorage.getItem(oldPortfolioKey);
        if (portfolioData) {
          localStorage.setItem(newPortfolioKey, portfolioData);
          localStorage.removeItem(oldPortfolioKey);
        }
      } catch (e) {
        console.warn("Portfolio migration failed:", e);
      }
    }

    const av = sanitizeAvatarUrl(o.avatar);
    return {
      id,
      username,
      displayName: sanitizePlainText(o.displayName, 64) || username,
      avatar: av || diceAvatar(username),
      isGuest: Boolean(o.isGuest),
      exchange: o.exchange ? sanitizePlainText(o.exchange, 24) : undefined,
      verified: Boolean(o.verified),
      pnl: sanitizePlainText(o.pnl, 24) || "0%",
      portfolioValue: sanitizePlainText(o.portfolioValue, 24) || "$0",
      followers: clampInt(o.followers, 0, 1_000_000_000, 0),
      following: clampInt(o.following, 0, 1_000_000_000, 0),
      winRate: clampInt(o.winRate, 0, 100, 0),
      totalTrades: clampInt(o.totalTrades, 0, 1_000_000_000, 0),
      bio: sanitizePlainText(o.bio, 500),
      watchedEthAddress: sanitizeEthAddress(o.watchedEthAddress) || undefined,
      profileSecret: sanitizeProfileSecret(o.profileSecret),
      wallet_address: sanitizeEthAddress(o.wallet_address) || undefined,
      wallet_verified: Boolean(o.wallet_verified),
    };
  } catch {
    return null;
  }
}

function normalizeUserForSave(u: AppUser): AppUser {
  const username = sanitizeUsername(u.username, 32) || "user";
  const av = sanitizeAvatarUrl(u.avatar);
  const rawId = typeof u.id === "string" ? u.id : "";
  return {
    ...u,
    id: isValidUUID(rawId) ? rawId : generateUUID(),
    username,
    displayName: sanitizePlainText(u.displayName, 64) || username,
    avatar: av || diceAvatar(username),
    exchange: u.exchange ? sanitizePlainText(u.exchange, 24) : undefined,
    pnl: sanitizePlainText(u.pnl, 24) || "0%",
    portfolioValue: sanitizePlainText(u.portfolioValue, 24) || "$0",
    bio: sanitizePlainText(u.bio, 500),
    followers: clampInt(u.followers, 0, 1_000_000_000, 0),
    following: clampInt(u.following, 0, 1_000_000_000, 0),
    winRate: clampInt(u.winRate, 0, 100, 0),
    totalTrades: clampInt(u.totalTrades, 0, 1_000_000_000, 0),
    watchedEthAddress: u.watchedEthAddress ? sanitizeEthAddress(u.watchedEthAddress) || undefined : undefined,
    profileSecret: u.profileSecret ? sanitizeProfileSecret(u.profileSecret) : undefined,
    wallet_address: u.wallet_address ? sanitizeEthAddress(u.wallet_address) || undefined : undefined,
    wallet_verified: Boolean(u.wallet_verified),
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseStoredUser(saved);
        if (parsed) {
          // If parsed modified the ID to UUID, persist the update back to localStorage
          const oldObj = JSON.parse(saved);
          if (oldObj.id !== parsed.id) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const setUser = (u: AppUser) => {
    const safe = normalizeUserForSave(u);
    setUserState(safe);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch (e) {
      console.warn("localStorage.setItem failed", e);
    }
    const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
    if (isSupabaseValid) {
      fetch(`${API_BASE}/notifications/${safe.id}/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
      }).catch(() => {});
    }
  };

  const logout = () => {
    setUserState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

export function createGuestUser(): AppUser {
  const num = Math.floor(Math.random() * 9000) + 1000;
  const seed = `guest${num}`;
  
  let newId;
  try {
    newId = crypto.randomUUID();
  } catch (e) {
    newId = '00000000-0000-4000-8000-' + String(Date.now()).padStart(12, '0');
  }

  return {
    id: newId,
    username: `guest${num}`,
    displayName: `Гость ${num}`,
    avatar: diceAvatar(seed),
    isGuest: true,
    verified: false,
    pnl: "N/A",
    portfolioValue: "N/A",
    followers: 0,
    following: 0,
    winRate: 0,
    totalTrades: 0,
    bio: "Гостевой аккаунт. Зарегистрируйтесь для полного доступа.",
    exchange: undefined,
  };
}

export function createRegisteredUser(username: string, exchange?: string): AppUser {
  const u = sanitizeUsername(username, 32) || "user";
  return {
    id: generateUUID(),
    username: u,
    displayName: u,
    avatar: diceAvatar(u),
    isGuest: false,
    verified: !!exchange,
    pnl: "+0.0%",
    portfolioValue: "$0",
    followers: 0,
    following: 0,
    winRate: 0,
    totalTrades: 0,
    bio: "Новый участник BOFLAN",
    exchange: exchange ? sanitizePlainText(exchange, 24) : undefined,
  };
}
