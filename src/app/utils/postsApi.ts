import { supabase } from "../../lib/supabase";
import type { FeedPostShape } from "./feedPosts";
import { USER_POSTS_KEY } from "./feedPosts";

type RawPost = {
  id: string;
  created_at?: string;
  user_id?: string;
  coin?: string;
  coin_name?: string;
  direction?: string;
  target?: string;
  timeframe?: string;
  text?: string;
  chart_data?: any;
  images?: string[];
  current_price?: string;
  price_change?: string;
  positive?: boolean;
  likes?: number;
  comments?: number;
  reposts?: number;
  accuracy?: string;
  user_profiles?: any;
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
  if (!raw?.id || !raw.user_id) return null;
  const createdAtMs = raw.created_at ? new Date(raw.created_at).getTime() : Date.now();
  
  const user = raw.user_profiles || {};
  
  return {
    id: raw.id,
    user: {
      id: raw.user_id,
      username: user.username || "user",
      displayName: user.display_name || user.username || "User",
      avatar: user.avatar_url || "",
      verified: Boolean(user.verified),
      exchange: user.exchange || "Binance",
      winRate: Number(user.win_rate) || 0,
      pnl: user.pnl || "0%",
      pnlPositive: Boolean(user.pnl_positive) || true,
    },
    coin: raw.coin || "BTC",
    coinName: raw.coin_name || raw.coin || "BTC",
    direction: raw.direction === "SHORT" ? "SHORT" : "LONG",
    target: raw.target || "—",
    timeframe: raw.timeframe || "—",
    text: raw.text || "",
    chartData: Array.isArray(raw.chart_data) ? raw.chart_data : [],
    images: Array.isArray(raw.images) ? raw.images : [],
    currentPrice: raw.current_price || "$0",
    priceChange: raw.price_change || "0%",
    positive: Boolean(raw.positive),
    likes: Number(raw.likes) || 0,
    comments: Number(raw.comments) || 0,
    reposts: Number(raw.reposts) || 0,
    timeAgo: formatTimeAgo(createdAtMs),
    accuracy: raw.accuracy || "—",
    liked: false,
  };
}

export const DEFAULT_SEED_POSTS: FeedPostShape[] = [
  {
    id: "post_seed_1",
    user: {
      id: "seeder_1",
      username: "satoshi_hunter",
      displayName: "Satoshi Hunter",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=satoshi_hunter",
      verified: true,
      exchange: "Binance",
      winRate: 84,
      pnl: "+324.5%",
      pnlPositive: true
    },
    coin: "BTC",
    coinName: "Bitcoin",
    direction: "LONG",
    target: "$74,500",
    timeframe: "12ч",
    text: "Биткоин тестирует ключевой уровень поддержки на 4H таймфрейме. Наблюдаем сильный откуп от зоны покупателя и формирование бычьего поглощения. Ожидаю продолжения восходящего движения к целям в районе $74,500 в ближайшие дни.",
    chartData: [
      {t: 0, p: 67300},
      {t: 2, p: 67100},
      {t: 4, p: 67600},
      {t: 6, p: 68200},
      {t: 8, p: 67900},
      {t: 10, p: 69100},
      {t: 12, p: 69800},
      {t: 14, p: 70900}
    ],
    images: [],
    currentPrice: "$69,820",
    priceChange: "+2.4%",
    positive: true,
    likes: 56,
    comments: 14,
    reposts: 8,
    timeAgo: "6ч назад",
    accuracy: "93% win",
    liked: false
  },
  {
    id: "post_seed_2",
    user: {
      id: "seeder_2",
      username: "eth_whale",
      displayName: "Ethereum Whale",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=eth_whale",
      verified: false,
      exchange: "Bybit",
      winRate: 72,
      pnl: "+112.3%",
      pnlPositive: true
    },
    coin: "ETH",
    coinName: "Ethereum",
    direction: "SHORT",
    target: "$3,240",
    timeframe: "24ч",
    text: "Эфириум показывает слабость после ложного пробития уровня сопротивления $3,600. RSI на часовом графике перекуплен, объемы падают. Открываю шорт позицию с близким стопом. Цель снижения лежит на уровне локальной поддержки $3,240.",
    chartData: [
      {t: 0, p: 3580},
      {t: 2, p: 3595},
      {t: 4, p: 3550},
      {t: 6, p: 3490},
      {t: 8, p: 3420},
      {t: 10, p: 3445},
      {t: 12, p: 3380}
    ],
    images: [],
    currentPrice: "$3,380",
    priceChange: "-4.12%",
    positive: false,
    likes: 28,
    comments: 9,
    reposts: 3,
    timeAgo: "8ч назад",
    accuracy: "81% win",
    liked: false
  },
  {
    id: "post_seed_3",
    user: {
      id: "seeder_3",
      username: "sol_enjoyer",
      displayName: "Solana Enjoyer",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=sol_enjoyer",
      verified: true,
      exchange: "OKX",
      winRate: 79,
      pnl: "+580.4%",
      pnlPositive: true
    },
    coin: "SOL",
    coinName: "Solana",
    direction: "LONG",
    target: "$195.0",
    timeframe: "3дня",
    text: "SOL выглядит невероятно сильно. Сформирован бычий вымпел на дневном графике. Видим пробитие верхней границы паттерна на повышенных объемах. При закреплении выше $170 открыта дорога к круглому значению $200. Локальная цель на $195.",
    chartData: [
      {t: 0, p: 142.5},
      {t: 2, p: 148.0},
      {t: 4, p: 151.2},
      {t: 6, p: 159.4},
      {t: 8, p: 168.1},
      {t: 10, p: 172.5}
    ],
    images: [],
    currentPrice: "$172.50",
    priceChange: "+12.18%",
    positive: true,
    likes: 84,
    comments: 22,
    reposts: 19,
    timeAgo: "1д назад",
    accuracy: "90% win",
    liked: false
  }
];

export function getFallbackPosts(): FeedPostShape[] {
  try {
    const raw = localStorage.getItem(USER_POSTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return DEFAULT_SEED_POSTS;
  } catch (e) {
    return DEFAULT_SEED_POSTS;
  }
}

export async function fetchFeedPosts(): Promise<FeedPostShape[]> {
  try {
    const res = await fetch('/api/posts');
    if (!res.ok) throw Error(`Fetch failed ${res.status}`);
    const posts = await res.json();
    
    if (!posts || posts.length === 0) {
      return getFallbackPosts();
    }

    const mapped = posts.map((p: any) => mapRawPostToFeedShape(p)).filter((p: any): p is FeedPostShape => p !== null);
    
    try {
      localStorage.setItem(USER_POSTS_KEY, JSON.stringify(mapped));
    } catch (e) {
      console.warn("Writing to localStorage failed:", e);
    }
    return mapped;
  } catch (err) {
    console.error("fetchFeedPosts error:", err);
    return getFallbackPosts();
  }
}

export async function fetchPostsByUser(userId: string): Promise<FeedPostShape[]> {
  if (!userId) return [];
  try {
    const res = await fetch(`/api/posts?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw Error(`Fetch failed ${res.status}`);
    const posts = await res.json();

    const mapped = posts.map((p: any) => mapRawPostToFeedShape(p)).filter((p: any): p is FeedPostShape => p !== null);
    return mapped;
  } catch (err) {
    return getFallbackPosts().filter((p: FeedPostShape) => p.user.id === userId);
  }
}

export async function createServerPost(
  post: Omit<FeedPostShape, "id" | "timeAgo" | "liked">,
  userId: string,
  profileSecret?: string
): Promise<FeedPostShape> {

  const mockId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const mockPost: FeedPostShape = {
    ...post,
    id: mockId,
    timeAgo: "только что",
    liked: false
  };

  try {
    const res = await fetch('/api/posts', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ post, userId, profileSecret })
    });
    
    if (!res.ok) throw Error(`Create post failed ${res.status}`);
    
    const data = await res.json();
    mockPost.id = data.id || mockId;

    try {
      const currentRaw = localStorage.getItem(USER_POSTS_KEY);
      let current = currentRaw ? JSON.parse(currentRaw) : [];
      current.unshift(mockPost);
      localStorage.setItem(USER_POSTS_KEY, JSON.stringify(current));
    } catch (e) {}

    return mockPost;
  } catch (error) {
    console.warn("API request failed, saved to local fallback", error);
    try {
      const currentRaw = localStorage.getItem(USER_POSTS_KEY);
      let current = currentRaw ? JSON.parse(currentRaw) : [];
      current.unshift(mockPost);
      localStorage.setItem(USER_POSTS_KEY, JSON.stringify(current));
    } catch (e) {}
    
    return mockPost;
  }
}

export async function syncLocalPostsToSupabase(user: { id: string; username: string; displayName: string; avatar: string; verified: boolean }) {
  // Deprecated - we no longer do complex batch syncing natively since our Postgres API 
  // is extremely robust now! 
}


