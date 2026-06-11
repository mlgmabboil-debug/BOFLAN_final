import type { CoinPrice } from "../hooks/useMarketPrices";
import { COIN_MAP, formatPrice } from "../hooks/useMarketPrices";
import { sanitizeAvatarUrl, sanitizePlainText, sanitizeUsername } from "./sanitize";
import type { AppUser } from "../context/UserContext";

export const USER_POSTS_KEY = "boflan_user_posts";
export const MAX_STORED_POSTS = 50;
export const MAX_POST_BODY = 4000;

export type FeedPostShape = {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    verified: boolean;
    exchange?: string;
    winRate: number;
    pnl: string;
    pnlPositive: boolean;
  };
  coin: string;
  coinName: string;
  direction: "LONG" | "SHORT";
  target: string;
  timeframe: string;
  text: string;
  chartData: { t: number; p: number }[];
  images: string[];
  currentPrice: string;
  priceChange: string;
  positive: boolean;
  likes: number;
  comments: number;
  reposts: number;
  timeAgo: string;
  accuracy: string;
  liked: boolean;
};

function defaultAvatar(seed: string) {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
}

function generateChartData(basePrice: number, trend: "up" | "down" | "volatile", points = 20) {
  const data: { t: number; p: number }[] = [];
  let price = basePrice;
  for (let i = 0; i < points; i++) {
    if (trend === "up") price *= 1 + (Math.random() * 0.04 - 0.01);
    else if (trend === "down") price *= 1 + (Math.random() * 0.02 - 0.04);
    else price *= 1 + (Math.random() * 0.06 - 0.03);
    data.push({ t: i, p: Math.round(price * 100) / 100 });
  }
  return data;
}

function sanitizeChartData(raw: unknown): { t: number; p: number }[] {
  if (!Array.isArray(raw)) return [];
  const out: { t: number; p: number }[] = [];
  for (const x of raw.slice(0, 200)) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const t = Number(o.t);
    const p = Number(o.p);
    if (Number.isFinite(t) && Number.isFinite(p)) out.push({ t, p });
  }
  return out;
}

function resolveCoinSymbol(raw: unknown, prices: CoinPrice[]): string {
  const s = String(raw ?? "BTC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  if (s && prices.some((p) => p.symbol === s)) return s;
  if (s && s in COIN_MAP) return s;
  return "BTC";
}

/** Нормализация одной записи из localStorage (защита от подделки и мусора). */
export function normalizeStoredFeedPost(entry: unknown, prices: CoinPrice[]): FeedPostShape | null {
  if (!entry || typeof entry !== "object") return null;
  const e = entry as Record<string, unknown>;
  const id = typeof e.id === "string" ? e.id.replace(/[^\w-]/g, "").slice(0, 80) : "";
  if (!id) return null;

  const userRaw = e.user;
  if (!userRaw || typeof userRaw !== "object") return null;
  const u = userRaw as Record<string, unknown>;
  const uid = typeof u.id === "string" ? u.id.slice(0, 80) : "";
  const uname = sanitizeUsername(u.username, 32);
  if (!uid || !uname) return null;

  const text = sanitizePlainText(e.text ?? e.content, MAX_POST_BODY);
  if (!text) return null;

  const coin = resolveCoinSymbol(e.coin, prices);
  const coinName = prices.find((c) => c.symbol === coin)?.name || coin;
  const live = prices.find((p) => p.symbol === coin);
  const direction: "LONG" | "SHORT" = e.direction === "SHORT" ? "SHORT" : "LONG";
  const basePrice = live?.current_price ?? 100;

  let chartData = sanitizeChartData(e.chartData);
  if (chartData.length < 2) {
    chartData = generateChartData(basePrice, direction === "LONG" ? "up" : "down", 16);
  }

  const av = sanitizeAvatarUrl(u.avatar);
  const winRate = Math.min(100, Math.max(0, Math.floor(Number(u.winRate) || 0)));
  const pnlStr = sanitizePlainText(u.pnl, 24) || "0%";

  return {
    id,
    user: {
      id: uid,
      username: uname,
      displayName: sanitizePlainText(u.displayName, 64) || uname,
      avatar: av || defaultAvatar(uname),
      verified: Boolean(u.verified),
      exchange: typeof u.exchange === "string" ? sanitizePlainText(u.exchange, 24) : undefined,
      winRate,
      pnl: pnlStr,
      pnlPositive: Boolean(u.pnlPositive),
    },
    coin,
    coinName,
    direction,
    target: sanitizePlainText(e.target, 48) || "—",
    timeframe: sanitizePlainText(e.timeframe, 32) || "—",
    text,
    chartData,
    images: Array.isArray(e.images) ? e.images.map(img => typeof img === "string" ? img : "") : [],
    currentPrice: typeof e.currentPrice === "string" ? sanitizePlainText(e.currentPrice, 24) : "$0",
    priceChange: typeof e.priceChange === "string" ? sanitizePlainText(e.priceChange, 16) : "0%",
    positive: Boolean(e.positive),
    likes: Math.min(1e9, Math.max(0, Math.floor(Number(e.likes) || 0))),
    comments: Math.min(1e9, Math.max(0, Math.floor(Number(e.comments) || 0))),
    reposts: Math.min(1e9, Math.max(0, Math.floor(Number(e.reposts) || 0))),
    timeAgo: sanitizePlainText(e.timeAgo, 32) || "ранее",
    accuracy: sanitizePlainText(e.accuracy, 32) || "—",
    liked: Boolean(e.liked),
  };
}

export function loadUserFeedPosts(prices: CoinPrice[], filterAuthorId?: string): FeedPostShape[] {
  try {
    const raw = JSON.parse(localStorage.getItem(USER_POSTS_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    const list = raw
      .slice(0, MAX_STORED_POSTS * 2)
      .map((x) => normalizeStoredFeedPost(x, prices))
      .filter((x): x is FeedPostShape => x !== null)
      .filter((x) => (filterAuthorId ? x.user.id === filterAuthorId : true))
      .slice(0, MAX_STORED_POSTS);
    return list;
  } catch {
    return [];
  }
}

export function saveUserFeedPosts(posts: FeedPostShape[]) {
  const trimmed = posts.slice(0, MAX_STORED_POSTS);
  localStorage.setItem(USER_POSTS_KEY, JSON.stringify(trimmed));
}

export function buildFeedPostFromUser(
  user: AppUser,
  body: string,
  coinSymbol: string,
  direction: "LONG" | "SHORT",
  prices: CoinPrice[]
): FeedPostShape {
  const text = sanitizePlainText(body, MAX_POST_BODY);
  const coin = resolveCoinSymbol(coinSymbol, prices);
  const live = prices.find((p) => p.symbol === coin);
  const coinName = prices.find((c) => c.symbol === coin)?.name || coin;
  const basePrice = live?.current_price ?? 100;
  const chartData = generateChartData(basePrice, direction === "LONG" ? "up" : "down", 16);
  const target =
    live != null
      ? direction === "LONG"
        ? formatPrice(live.current_price * 1.1)
        : formatPrice(live.current_price * 0.9)
      : direction === "LONG"
        ? "+10%"
        : "-10%";

  const av = sanitizeAvatarUrl(user.avatar);

  return {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    user: {
      id: user.id.slice(0, 80),
      username: sanitizeUsername(user.username, 32) || "user",
      displayName: sanitizePlainText(user.displayName, 64) || user.username,
      avatar: av || defaultAvatar(user.username),
      verified: user.verified,
      exchange: user.exchange ? sanitizePlainText(user.exchange, 24) : undefined,
      winRate: Math.min(100, Math.max(0, user.winRate)),
      pnl: sanitizePlainText(user.pnl, 24) || "0%",
      pnlPositive: user.pnl.startsWith("+"),
    },
    coin,
    coinName,
    direction,
    target,
    timeframe: "открыт",
    text,
    chartData,
    images: [],
    currentPrice: live ? formatPrice(live.current_price) : "$0",
    priceChange: live ? `${(live.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}${(live.price_change_percentage_24h ?? 0).toFixed(2)}%` : "0%",
    positive: direction === "LONG",
    likes: 0,
    comments: 0,
    reposts: 0,
    timeAgo: "только что",
    accuracy: user.winRate ? `${user.winRate}% win` : "—",
    liked: false,
  };
}
