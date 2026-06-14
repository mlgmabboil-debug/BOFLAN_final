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

export function getFallbackPosts(): FeedPostShape[] {
  try {
    const raw = localStorage.getItem(USER_POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function fetchFeedPosts(): Promise<FeedPostShape[]> {
  try {
    let { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        user_profiles (
          user_id,
          username,
          display_name,
          avatar_url,
          verified
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
        console.warn("Foreign relationship select failed in fetchFeedPosts, fetching separately...");
        const { data: postsOnly, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (postsError || !postsOnly) {
          console.error(postsError);
          return getFallbackPosts();
        }
        
        const userIds = Array.from(new Set(postsOnly.map((p: any) => p.user_id).filter(Boolean)));
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, username, display_name, avatar_url, verified')
            .in('user_id', userIds);
            
          if (!profilesError && profiles) {
            const profileMap = new Map(profiles.map((prof: any) => [prof.user_id, prof]));
            posts = postsOnly.map((p: any) => ({
              ...p,
              user_profiles: profileMap.get(p.user_id) || null
            }));
          } else {
            posts = postsOnly.map((p: any) => ({ ...p, user_profiles: null }));
          }
        } else {
          posts = postsOnly.map((p: any) => ({ ...p, user_profiles: null }));
        }
      } else {
        console.error(error);
        return getFallbackPosts();
      }
    }
    
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
    let { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        user_profiles (
          user_id,
          username,
          display_name,
          avatar_url,
          verified
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
        console.warn("Foreign relationship select failed in fetchPostsByUser, fetching separately...");
        const { data: postsOnly, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (postsError || !postsOnly) {
          console.error(postsError);
          return getFallbackPosts().filter((p: FeedPostShape) => p.user.id === userId);
        }
        
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, username, display_name, avatar_url, verified')
          .eq('user_id', userId);
          
        const profile = (!profilesError && profiles && profiles.length > 0) ? profiles[0] : null;
        posts = postsOnly.map((p: any) => ({
          ...p,
          user_profiles: profile
        }));
      } else {
        console.error(error);
        return getFallbackPosts().filter((p: FeedPostShape) => p.user.id === userId);
      }
    }
    
    return posts.map((p: any) => mapRawPostToFeedShape(p)).filter((p: any): p is FeedPostShape => p !== null);
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
    // First ensure the user profile exists (required for the guest foreign key constraint)
    const { error: profileError } = await supabase.from('user_profiles').upsert({
      user_id: userId,
      username: post.user.username,
      display_name: post.user.displayName,
      avatar_url: post.user.avatar,
      verified: post.user.verified
    }, { onConflict: 'user_id' });
    
    if (profileError) {
       console.warn("Could not upsert user profile:", profileError);
    }

    let insertedData: any = null;
    try {
      const { data, error } = await supabase.from('posts').insert({
        user_id: userId,
        coin: post.coin,
        coin_name: post.coinName,
        direction: post.direction,
        target: post.target,
        timeframe: post.timeframe,
        text: post.text,
        chart_data: post.chartData,
        images: post.images,
        current_price: post.currentPrice,
        price_change: post.priceChange,
        positive: post.positive,
        likes: post.likes || 0,
        comments: post.comments || 0,
        reposts: post.reposts || 0,
        accuracy: post.accuracy
      }).select(`
        *,
        user_profiles (
          user_id,
          username,
          display_name,
          avatar_url,
          verified
        )
      `).single();
      
      if (error) {
        if (error.code === 'PGRST200' || error.message?.includes('relationship')) {
          console.warn("Foreign relationship select failed inside createServerPost, inserting without join...");
          const { data: simpleData, error: simpleError } = await supabase.from('posts').insert({
            user_id: userId,
            coin: post.coin,
            coin_name: post.coinName,
            direction: post.direction,
            target: post.target,
            timeframe: post.timeframe,
            text: post.text,
            chart_data: post.chartData,
            images: post.images,
            current_price: post.currentPrice,
            price_change: post.priceChange,
            positive: post.positive,
            likes: post.likes || 0,
            comments: post.comments || 0,
            reposts: post.reposts || 0,
            accuracy: post.accuracy
          }).select('*').single();
          
          if (simpleError) {
            throw simpleError;
          }
          
          // Manually bind the profile
          const { data: profiles } = await supabase.from('user_profiles')
            .select('user_id, username, display_name, avatar_url, verified')
            .eq('user_id', userId);
            
          const profileObj = (profiles && profiles.length > 0) ? profiles[0] : null;
          insertedData = {
            ...simpleData,
            user_profiles: profileObj
          };
        } else {
          throw error;
        }
      } else {
        insertedData = data;
      }
    } catch (insertErr) {
       console.error("Simple insert fallback also failed:", insertErr);
       throw insertErr;
    }
    
    if (!insertedData) {
      throw new Error("Некорректный ответ сервера");
    }
    return mapRawPostToFeedShape(insertedData) || mockPost;
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

export async function syncLocalPostsToSupabase(user: { id: string; username: string; displayName: string; avatar: string; verified: boolean }) {
  try {
    const raw = localStorage.getItem(USER_POSTS_KEY);
    if (!raw) return;
    const localPosts: FeedPostShape[] = JSON.parse(raw);
    if (!Array.isArray(localPosts) || localPosts.length === 0) return;

    // Filter posts that are local-only (e.g. have a custom/non-UUID id or start with user_)
    const localOnlyPosts = localPosts.filter(p => p.id.startsWith("user_") || !p.id.includes("-"));
    if (localOnlyPosts.length === 0) return;

    console.log(`Syncing ${localOnlyPosts.length} local posts to Supabase...`);

    // Ensure user profile exists in database
    await supabase.from('user_profiles').upsert({
      user_id: user.id,
      username: user.username,
      display_name: user.displayName,
      avatar_url: user.avatar,
      verified: user.verified
    }, { onConflict: 'user_id' });

    // Insert them one by one
    for (const post of localOnlyPosts) {
      const { data, error } = await supabase.from('posts').insert({
        user_id: user.id,
        coin: post.coin,
        coin_name: post.coinName,
        direction: post.direction,
        target: post.target,
        timeframe: post.timeframe,
        text: post.text,
        chart_data: post.chartData,
        images: post.images,
        current_price: post.currentPrice,
        price_change: post.priceChange,
        positive: post.positive,
        likes: post.likes || 0,
        comments: post.comments || 0,
        reposts: post.reposts || 0,
        accuracy: post.accuracy
      }).select('*').single();

      if (error) {
        console.error("Failed to sync local post:", error);
      } else if (data) {
        const parsedSynced = mapRawPostToFeedShape(data);
        if (parsedSynced) {
          const index = localPosts.findIndex(p => p.id === post.id);
          if (index !== -1) {
            localPosts[index] = parsedSynced;
          }
        }
      }
    }

    // Save updated posts back to localStorage
    localStorage.setItem(USER_POSTS_KEY, JSON.stringify(localPosts));
  } catch (e) {
    console.warn("syncLocalPostsToSupabase failed safely:", e);
  }
}

