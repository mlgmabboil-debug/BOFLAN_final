import { projectId, publicAnonKey, isEdgeFunctionOnline } from "../../../utils/supabase/info";
import { getAccessToken } from "../../lib/supabaseAuth";
import type { FeedPostShape } from "./feedPosts";
import { USER_POSTS_KEY, normalizeStoredFeedPost } from "./feedPosts";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6d3e2891`;

type RawPost = {
  id: string;
  createdAt?: number;
  userId?: string;
  user?: FeedPostShape["user"];
  coin?: string;
  coinName?: string;
  direction?: "LONG" | "SHORT";
  target?: string;
  timeframe?: string;
  text?: string;
  chartData?: { t: number; p: number }[];
  images?: string[];
  currentPrice?: string;
  priceChange?: string;
  positive?: boolean;
  likes?: number;
  comments?: number;
  reposts?: number;
  accuracy?: string;
};

function formatTimeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "только что";
  if (diffMins < 60) return `${diffMins}м назад`;
  if (diffHours < 24) return `${diffHours}ч назад`;
  return `${diffDays}д назад`;
}

export function mapRawPostToFeedShape(raw: RawPost): FeedPostShape | null {
  if (!raw?.id || !raw.user?.id || !raw.user?.username) return null;
  const createdAt = raw.createdAt ?? Date.now();
  return {
    id: raw.id,
    user: {
      id: raw.user.id,
      username: raw.user.username,
      displayName: raw.user.displayName || raw.user.username,
      avatar: raw.user.avatar || "",
      verified: Boolean(raw.user.verified),
      exchange: raw.user.exchange,
      winRate: Number(raw.user.winRate) || 0,
      pnl: raw.user.pnl || "0%",
      pnlPositive: Boolean(raw.user.pnlPositive),
    },
    coin: raw.coin || "BTC",
    coinName: raw.coinName || raw.coin || "BTC",
    direction: raw.direction === "SHORT" ? "SHORT" : "LONG",
    target: raw.target || "—",
    timeframe: raw.timeframe || "—",
    text: raw.text || "",
    chartData: Array.isArray(raw.chartData) ? raw.chartData : [],
    images: Array.isArray(raw.images) ? raw.images : [],
    currentPrice: raw.currentPrice || "$0",
    priceChange: raw.priceChange || "0%",
    positive: Boolean(raw.positive),
    likes: Number(raw.likes) || 0,
    comments: Number(raw.comments) || 0,
    reposts: Number(raw.reposts) || 0,
    timeAgo: formatTimeAgo(createdAt),
    accuracy: raw.accuracy || "—",
    liked: false,
  };
}

async function apiHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    Authorization: `Bearer ${token || publicAnonKey}`,
    Accept: "application/json",
  };
}

export function getFallbackPosts(): FeedPostShape[] {
  let localPosts: FeedPostShape[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem(USER_POSTS_KEY) || "[]");
    if (Array.isArray(raw)) {
      localPosts = raw
        .map((x) => normalizeStoredFeedPost(x, []))
        .filter((x): x is FeedPostShape => x !== null);
    }
  } catch (e) {
    console.error("Failed to parse local posts", e);
  }

  // Predefined mock posts to make feed gorgeous
  const defaults: FeedPostShape[] = [
    {
      id: "fallback_btc_1",
      user: {
        id: "trader_aleks",
        username: "aleks_crypto",
        displayName: "Александр (PRO)",
        avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=aleks",
        verified: true,
        exchange: "Binance",
        winRate: 82,
        pnl: "+145.4%",
        pnlPositive: true,
      },
      coin: "BTC",
      coinName: "Bitcoin",
      direction: "LONG",
      target: "$102,500",
      timeframe: "1-2 недели",
      text: "Биткоин протестировал ключевую зону поддержки $94,000 и сформировал бычий пин-бар на дневном таймфрейме. Ожидаю продолжения восходящего тренда к психологической отметке $100k+ в течение следующих недель. Объемы растут, RSI в нейтральной зоне.",
      chartData: [
        { t: 0, p: 94000 }, { t: 1, p: 93800 }, { t: 2, p: 94500 }, 
        { t: 3, p: 94200 }, { t: 4, p: 95100 }, { t: 5, p: 96000 },
        { t: 6, p: 95800 }, { t: 7, p: 96400 }, { t: 8, p: 97500 }
      ],
      images: [],
      currentPrice: "$96,400",
      priceChange: "+2.4%",
      positive: true,
      likes: 42,
      comments: 18,
      reposts: 7,
      timeAgo: "2ч назад",
      accuracy: "82% win",
      liked: false,
    },
    {
      id: "fallback_eth_1",
      user: {
        id: "eth_queen",
        username: "eth_queen",
        displayName: "Анна Смирнова",
        avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=queen",
        verified: true,
        exchange: "Bybit",
        winRate: 74,
        pnl: "+67.8%",
        pnlPositive: true,
      },
      coin: "ETH",
      coinName: "Ethereum",
      direction: "LONG",
      target: "$3,850",
      timeframe: "3 дня",
      text: "Эфир выглядит сильнее остального рынка на фоне ожидания притока ликвидности в L2. Пробой нисходящего клина подтвержден повышенными объемами торгов. Вхожу в лонг со стопом ниже $3,350.",
      chartData: [
        { t: 0, p: 3380 }, { t: 1, p: 3360 }, { t: 2, p: 3400 }, 
        { t: 3, p: 3390 }, { t: 4, p: 3450 }, { t: 5, p: 3490 },
        { t: 6, p: 3510 }, { t: 7, p: 3480 }
      ],
      images: [],
      currentPrice: "$3,490",
      priceChange: "+1.2%",
      positive: true,
      likes: 19,
      comments: 5,
      reposts: 2,
      timeAgo: "5ч назад",
      accuracy: "74% win",
      liked: false,
    },
    {
      id: "fallback_sol_1",
      user: {
        id: "whale_vlad",
        username: "vlad_whale",
        displayName: "Владислав К.",
        avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=vlad",
        verified: false,
        exchange: "OKX",
        winRate: 61,
        pnl: "+24.1%",
        pnlPositive: true,
      },
      coin: "SOL",
      coinName: "Solana",
      direction: "SHORT",
      target: "$180.00",
      timeframe: "24 часа",
      text: "Солана перекуплена на 4-часовом графике по индикатору Stochastic RSI. Замечаю формирование дивергенции. Возможна локальная коррекция к уровню поддержки $180 перед новым витком роста.",
      chartData: [
        { t: 0, p: 198 }, { t: 1, p: 201 }, { t: 2, p: 199 }, 
        { t: 3, p: 197 }, { t: 4, p: 195 }, { t: 5, p: 193 },
        { t: 6, p: 191 }
      ],
      images: [],
      currentPrice: "$193.50",
      priceChange: "-3.1%",
      positive: false,
      likes: 12,
      comments: 9,
      reposts: 0,
      timeAgo: "8ч назад",
      accuracy: "61% win",
      liked: false,
    }
  ];

  const filteredDefaults = defaults.filter(d => !localPosts.some(lp => lp.id === d.id));
  return [...localPosts, ...filteredDefaults];
}

export async function fetchFeedPosts(): Promise<FeedPostShape[]> {
  const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
  if (!isSupabaseValid || !(await isEdgeFunctionOnline(API_BASE, publicAnonKey))) {
    return getFallbackPosts();
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const resp = await fetch(`${API_BASE}/posts`, { 
      headers: await apiHeaders(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const json = (await resp.json().catch(() => ({}))) as { success?: boolean; posts?: RawPost[] };
    if (!resp.ok || !json.success || !Array.isArray(json.posts)) {
      return getFallbackPosts();
    }
    return json.posts.map(mapRawPostToFeedShape).filter((p): p is FeedPostShape => p !== null);
  } catch {
    return getFallbackPosts();
  }
}

export async function fetchPostsByUser(userId: string): Promise<FeedPostShape[]> {
  if (!userId) return [];
  
  const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
  if (!isSupabaseValid || !(await isEdgeFunctionOnline(API_BASE, publicAnonKey))) {
    return getFallbackPosts().filter(p => p.user.id === userId);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const resp = await fetch(`${API_BASE}/posts/user/${encodeURIComponent(userId)}`, {
      headers: await apiHeaders(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const json = (await resp.json().catch(() => ({}))) as { success?: boolean; posts?: RawPost[] };
    if (!resp.ok || !json.success || !Array.isArray(json.posts)) {
      return getFallbackPosts().filter(p => p.user.id === userId);
    }
    return json.posts.map(mapRawPostToFeedShape).filter((p): p is FeedPostShape => p !== null);
  } catch {
    return getFallbackPosts().filter(p => p.user.id === userId);
  }
}

export async function createServerPost(
  post: Omit<FeedPostShape, "id" | "timeAgo" | "liked">,
  userId: string,
  profileSecret?: string
): Promise<FeedPostShape> {
  const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
  const mockId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const mockPost: FeedPostShape = {
    ...post,
    id: mockId,
    timeAgo: "только что",
    liked: false
  };

  if (!isSupabaseValid || !(await isEdgeFunctionOnline(API_BASE, publicAnonKey))) {
    // Save to local storage
    const current = getFallbackPosts();
    const updated = [mockPost, ...current];
    try {
      localStorage.setItem(USER_POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    return mockPost;
  }

  try {
    const token = await getAccessToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const resp = await fetch(`${API_BASE}/posts`, {
      method: "POST",
      headers: {
        ...(await apiHeaders()),
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || publicAnonKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        userId,
        profileSecret,
        user: post.user,
        coin: post.coin,
        coinName: post.coinName,
        direction: post.direction,
        target: post.target,
        timeframe: post.timeframe,
        text: post.text,
        chartData: post.chartData,
        images: post.images,
        currentPrice: post.currentPrice,
        priceChange: post.priceChange,
        positive: post.positive,
        likes: post.likes,
        comments: post.comments,
        reposts: post.reposts,
        accuracy: post.accuracy,
      }),
    });
    clearTimeout(timeoutId);

    const json = (await resp.json().catch(() => ({}))) as { success?: boolean; post?: RawPost; error?: string };
    if (!resp.ok || !json.success || !json.post) {
      throw new Error(json.error || "Не удалось опубликовать пост в API");
    }
    const mapped = mapRawPostToFeedShape(json.post);
    if (!mapped) throw new Error("Некорректный ответ сервера");
    return mapped;
  } catch (e) {
    console.warn("Using local storage fallback for publishing:", e);
    const current = getFallbackPosts();
    const updated = [mockPost, ...current];
    try {
      localStorage.setItem(USER_POSTS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    return mockPost;
  }
}
