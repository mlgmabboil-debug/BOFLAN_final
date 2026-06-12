import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Plus, TrendingUp, TrendingDown, Filter, Flame, Users, BarChart2 } from "lucide-react";
import { FeedCard } from "../components/FeedCard";
import { MiniChart } from "../components/MiniChart";
import { ImageUpload } from "../components/ImageUpload";
import { useMarketPrices, formatPrice } from "../hooks/useMarketPrices";
import { useUser } from "../context/UserContext";
import { useSupabasePosts } from "../../hooks/useSupabasePosts";
import { useNavigate } from "react-router";
import {
  buildFeedPostFromUser,
  type FeedPostShape,
  MAX_POST_BODY,
} from "../utils/feedPosts";

const FILTERS = ["Все", "Верифицированные", "BTC", "ETH", "Альткоины"];

export function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("Все");
  const [postText, setPostText] = useState("");
  const [postCoin, setPostCoin] = useState("BTC");
  const [postDirection, setPostDirection] = useState<"LONG" | "SHORT">("LONG");
  const [postImages, setPostImages] = useState<string[]>([]);
  const { prices } = useMarketPrices();
  const { posts, loading, error, createPost } = useSupabasePosts();
  const [publishError, setPublishError] = useState<string | null>(null);

  const marketSentiment = useMemo(() => {
    if (prices.length === 0) return { greedScore: 50, longPct: 50, shortPct: 50 };
    const avg = prices.reduce((s, p) => s + (p.price_change_percentage_24h ?? 0), 0) / prices.length;
    const greedScore = Math.round(Math.min(88, Math.max(12, 50 + avg * 4.5)));
    const greens = prices.filter((p) => (p.price_change_percentage_24h ?? 0) > 0).length;
    const longPct = Math.round((greens / prices.length) * 100);
    return { greedScore, longPct, shortPct: 100 - longPct };
  }, [prices]);

  const topCoins = prices.slice(0, 5).map((coin) => {
    const change = coin.price_change_percentage_24h ?? 0;
    return {
      symbol: coin.symbol,
      name: coin.name,
      price: formatPrice(coin.current_price),
      change24h: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
      positive: change >= 0,
    };
  });

  const feedPosts = useMemo(() => posts, [posts]);

  const visibleFeed = useMemo(() => {
    if (activeFilter === "Все") return feedPosts;
    if (activeFilter === "Верифицированные") return feedPosts.filter((p: FeedPostShape) => p.user.verified);
    if (activeFilter === "BTC") return feedPosts.filter((p: FeedPostShape) => p.coin === "BTC");
    if (activeFilter === "ETH") return feedPosts.filter((p: FeedPostShape) => p.coin === "ETH");
    if (activeFilter === "Альткоины") return feedPosts.filter((p: FeedPostShape) => p.coin !== "BTC" && p.coin !== "ETH");
    return feedPosts;
  }, [feedPosts, activeFilter]);

  const publishPost = async () => {
    if (!user || !postText.trim()) return;

    const next = buildFeedPostFromUser(user, postText, postCoin, postDirection, prices);
    next.images = postImages;

    setPublishError(null);
    try {
      await createPost(next, user.id, user.profileSecret);
      setPostText("");
      setPostCoin("BTC");
      setPostDirection("LONG");
      setPostImages([]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось опубликовать пост";
      setPublishError(msg);
      console.error("Error publishing post:", e);
    }
  };

  return (
    <div className="flex gap-6 w-full max-w-[1400px] mx-auto px-4 py-6">
      {/* LEFT: Feed */}
      <div className="flex-1 min-w-0 max-w-[680px] mx-auto xl:mx-0">
        {/* Stories */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass card-hover rounded-xl p-4 mb-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
              <Flame size={14} className="text-orange-400" />
            </div>
            <span className="text-white/80 text-xs font-semibold tracking-wide">РЫНОК</span>
          </div>
          <p className="text-white/50 text-xs leading-relaxed">
            Котировки и графики — во вкладке «Рынок». Лента ниже — общие посты всех пользователей BOFLAN (видны и гостям).
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-none pb-1">
          <div className="flex items-center gap-1.5 flex-shrink-0 text-white/40 mr-1">
            <Filter size={13} />
            <span className="text-xs">Фильтр:</span>
          </div>
          {FILTERS.map((f, index) => (
            <motion.button
              key={f}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setActiveFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                activeFilter === f
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "glass-light text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {f}
            </motion.button>
          ))}
        </div>

        {/* Composer */}
        {user && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass card-hover rounded-xl p-4 mb-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-white/70 text-sm">Новый пост в ленту</span>
            </div>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="Поделитесь идеей по рынку..."
              rows={3}
              maxLength={MAX_POST_BODY}
              className="w-full glass-light rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 resize-none transition-smooth"
            />
            
            {/* Image Upload */}
            <ImageUpload 
              images={postImages}
              onImagesChange={setPostImages}
              maxImages={4}
            />
            
            <div className="flex gap-2 mt-3 flex-wrap items-center">
              <div className="flex items-center gap-2 glass-light rounded-lg px-3 py-1.5">
                <span className="text-white/40 text-xs">$</span>
                <input
                  value={postCoin}
                  onChange={(e) => setPostCoin(e.target.value.toUpperCase())}
                  className="bg-transparent text-white text-xs w-16 outline-none"
                  placeholder="BTC"
                />
              </div>
              <select
                value={postDirection}
                onChange={(e) => setPostDirection(e.target.value as "LONG" | "SHORT")}
                className="glass-light rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-blue-500/50 cursor-pointer"
              >
                <option value="LONG" className="bg-[#1a1a1a]">LONG 📈</option>
                <option value="SHORT" className="bg-[#1a1a1a]">SHORT 📉</option>
              </select>
              <button
                onClick={publishPost}
                disabled={!postText.trim()}
                className="ml-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-smooth btn-press shadow-lg shadow-blue-600/20"
              >
                Опубликовать
              </button>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200/90 text-xs">
            {error} — проверьте подключение или обновите страницу.
          </div>
        )}
        {publishError && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-xs">
            {publishError}
          </div>
        )}

        {/* Feed */}
        <div className="flex flex-col gap-4">
          {loading && feedPosts.length === 0 ? (
            <div className="text-center py-16 text-white/40 text-sm glass rounded-xl">
              Загрузка ленты…
            </div>
          ) : visibleFeed.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-white/40 text-sm glass rounded-xl"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Filter size={24} className="text-white/20" />
              </div>
              {feedPosts.length === 0
                ? "Лента пуста. Опубликуйте первый пост или зайдите позже."
                : "Нет постов по выбранному фильтру."}
            </motion.div>
          ) : (
            visibleFeed.map((post: FeedPostShape, index: number) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <FeedCard post={post} />
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Sidebar */}
      <div className="w-72 flex-shrink-0 hidden lg:flex flex-col gap-4">
        {/* Top Coins */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass card-hover rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <BarChart2 size={14} className="text-blue-400" />
              </div>
              <span className="text-white/80 text-xs font-semibold tracking-wide">ТОП МОНЕТЫ</span>
            </div>
            <button 
              onClick={() => navigate("/charts")}
              className="text-blue-400 text-xs hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              Все <span className="text-lg">→</span>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {topCoins.map((coin, index) => (
              <motion.div 
                key={coin.symbol}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2.5 rounded-lg transition-all duration-300 group"
                onClick={() => navigate(`/charts?coin=${encodeURIComponent(coin.symbol)}`)}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600/20 to-blue-400/10 flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform">
                  {coin.symbol.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-xs font-medium">{coin.symbol}</span>
                    <span className="text-white/80 text-xs font-mono">{coin.price}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-white/40 text-[10px]">{coin.name}</span>
                    <span
                      className={`text-[10px] font-mono flex items-center gap-0.5 ${
                        coin.positive ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {coin.positive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                      {coin.change24h}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Top Traders */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass card-hover rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Users size={14} className="text-purple-400" />
            </div>
            <span className="text-white/80 text-xs font-semibold tracking-wide">РЕЙТИНГ ТРЕЙДЕРОВ</span>
          </div>
          <p className="text-white/40 text-xs leading-relaxed">
            Публичный рейтинг появится после подключения бэкенда и верификации сделок. Сейчас отображаются только ваши данные в профиле.
          </p>
        </motion.div>

        {/* Market Sentiment */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass card-hover rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-yellow-500/20 flex items-center justify-center">
              <TrendingUp size={14} className="text-emerald-400" />
            </div>
            <span className="text-white/80 text-xs font-semibold tracking-wide">РЫНОЧНЫЕ НАСТРОЕНИЯ</span>
          </div>
          <p className="text-white/40 text-[10px] mb-3">
            Индекс жадности по среднему 24h; лонг/шорт — доля монет в плюсе за сутки.
          </p>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-400 text-xs font-medium">Жадность</span>
              <span className="text-white/60 text-xs font-mono">
                {marketSentiment.greedScore} / 100
              </span>
            </div>
            <div className="h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <motion.div
                key={marketSentiment.greedScore}
                initial={{ width: 0 }}
                animate={{ width: `${marketSentiment.greedScore}%` }}
                transition={{ duration: 0.8, delay: 0.15 }}
                className="h-full bg-gradient-to-r from-yellow-500 via-emerald-400 to-emerald-500 rounded-full"
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-white/30">Страх</span>
              <span className="text-[10px] text-emerald-400 font-medium">Жадность</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-light rounded-lg p-3 text-center">
              <div className="text-emerald-400 text-lg font-bold font-mono">
                {marketSentiment.longPct}%
              </div>
              <div className="text-white/40 text-[10px] uppercase tracking-wide">Лонгов</div>
            </div>
            <div className="glass-light rounded-lg p-3 text-center">
              <div className="text-red-400 text-lg font-bold font-mono">
                {marketSentiment.shortPct}%
              </div>
              <div className="text-white/40 text-[10px] uppercase tracking-wide">Шортов</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
