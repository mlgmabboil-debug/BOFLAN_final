import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useMarketPrices, formatPrice, formatVolume } from "../hooks/useMarketPrices";
import { MiniChart } from "../components/MiniChart";
import { fetchFeedPosts } from "../utils/postsApi";
import { FeedPostShape } from "../utils/feedPosts";
import { FeedCard } from "../components/FeedCard";
import { PostInput } from "../components/PostInput";
import { useUser } from "../context/UserContext";
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, BarChart3 } from "lucide-react";
import { motion } from "motion/react";

export default function CoinDetails() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { prices, loading: pricesLoading } = useMarketPrices();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("Top");

  const [posts, setPosts] = useState<FeedPostShape[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Sentiment State
  const [sentiment, setSentiment] = useState({ bullish: 0, bearish: 0 });
  const [userVote, setUserVote] = useState<'bullish' | 'bearish' | null>(() => {
    // try to get from localStorage to remember what the user specifically voted for locally
    try {
      const v = localStorage.getItem(`vote_${symbol}`);
      if (v === 'bullish' || v === 'bearish') return v;
    } catch(e){}
    return null;
  });

  const rawSymbol = symbol || "BTC";
  const upperSymbol = rawSymbol.toUpperCase();

  const coinData = useMemo(() => {
    return prices.find((p) => p.symbol.toUpperCase() === upperSymbol) || {
       symbol: upperSymbol,
       name: upperSymbol,
       current_price: 0,
       price_change_percentage_24h: 0,
       market_cap: 0,
       total_volume: 0,
       market_cap_rank: 999
    };
  }, [prices, upperSymbol]);

  useEffect(() => {
    if (!upperSymbol) return;

    fetch(`/api/sentiment/${upperSymbol}`)
      .then(res => res.json())
      .then(data => {
        setSentiment({ bullish: data.bullish || 0, bearish: data.bearish || 0 });
      })
      .catch(console.error);

    fetchFeedPosts().then((allPosts) => {
      // Filter for this coin specifically
      const coinPosts = allPosts.filter(
        p => (p.coin || "").toUpperCase() === upperSymbol || (p.coinName || "").toUpperCase().includes(upperSymbol)
      );
      setPosts(coinPosts);
      setLoadingPosts(false);
    });
  }, [upperSymbol]);

  const handleVote = (vote: 'bullish' | 'bearish') => {
    if (userVote) return; // already voted
    setUserVote(vote);
    try {
      localStorage.setItem(`vote_${upperSymbol}`, vote);
    } catch(e){}

    setSentiment(prev => ({ ...prev, [vote]: prev[vote] + 1 }));

    fetch(`/api/sentiment/${upperSymbol}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote })
    })
      .then(res => res.json())
      .then(data => setSentiment({ bullish: data.bullish, bearish: data.bearish }))
      .catch(console.error);
  };

  const totalVotes = sentiment.bullish + sentiment.bearish;
  const bullishPct = totalVotes === 0 ? 50 : Math.round((sentiment.bullish / totalVotes) * 100);
  const bearishPct = 100 - bullishPct;

  const isPositive = (coinData.price_change_percentage_24h ?? 0) >= 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto h-[calc(100vh-60px)] overflow-y-auto custom-scrollbar">
      {/* Left Column: Coin Info & Chart */}
      <div className="flex-1 flex flex-col gap-6">
        <button 
          onClick={() => navigate('/market')}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors w-fit text-sm"
        >
          <ArrowLeft size={16} />
          Назад к рынку
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111111] p-6 rounded-xl border border-[#1e1e1e]">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-full bg-[#1e1e1e] flex items-center justify-center text-xl font-bold text-white uppercase border border-white/5 shadow-md">
              {upperSymbol.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white leading-none">{coinData.name}</h1>
                <span className="text-sm font-mono text-white/40 bg-white/5 px-2.5 py-0.5 rounded-md">
                  {upperSymbol}
                </span>
                <span className="text-[10px] font-mono text-white/30 border border-white/10 px-1.5 py-0.5 rounded">
                  #{coinData.market_cap_rank}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-3xl font-mono font-bold text-white">
                  {formatPrice(coinData.current_price)}
                </span>
                <span className={`text-md font-mono font-semibold flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {(coinData.price_change_percentage_24h ?? 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-6 md:border-l border-[#222222] md:pl-6">
            <div className="flex flex-col gap-1">
              <span className="text-white/40 text-xs">Market Cap</span>
              <span className="text-white text-sm font-mono">{formatVolume(coinData.market_cap)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-white/40 text-xs">Volume (24h)</span>
              <span className="text-white text-sm font-mono">{formatVolume(coinData.total_volume)}</span>
            </div>
          </div>
        </div>

        {/* Big Chart Wrapper */}
        <div className="bg-[#111111] p-4 rounded-xl border border-[#1e1e1e] h-[400px] flex flex-col relative">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => navigate(`/charts?coin=${encodeURIComponent(upperSymbol)}`)}
              className="flex items-center gap-2 bg-[#222] hover:bg-[#333] border border-[#333] hover:border-[#444] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <BarChart3 size={16} className="text-emerald-400" />
              График
            </button>
          </div>
          <div className="w-full h-full">
             <MiniChart symbol={upperSymbol} height={360} timeframe="1h" />
          </div>
        </div>

        {/* Global info/News mock area */}
        <div className="bg-gradient-to-r from-[#0052D4]/20 to-[#4364F7]/20 border border-[#4364F7]/30 rounded-xl p-6 relative overflow-hidden">
          <h3 className="text-white font-bold flex items-center gap-2 mb-2">
            <span className="text-xl">🔥</span> Особенности токена
          </h3>
          <p className="text-white/80 text-sm leading-relaxed max-w-2xl relative z-10">
            Этот токен активно торгуется на крупнейших биржах и обладает огромной ликвидностью.
            Следите за мнением сообщества справа, чтобы быстро принимать торговые решения!
          </p>
        </div>
      </div>

      {/* Right Column: Sentiment & Discussion */}
      <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col gap-6">
        
        {/* Sentiment Block */}
        <div className="bg-[#111111] p-6 rounded-xl border border-[#1e1e1e]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">Community sentiment</h3>
            <span className="text-xs text-white/40">{totalVotes} голосов</span>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="font-mono text-xl font-bold flex items-center gap-1 text-emerald-400 w-16">
              <TrendingUp size={16}/> {bullishPct}%
            </div>
            <div className="flex-1 h-3 rounded-full overflow-hidden flex bg-[#1a1a1a]">
              <motion.div 
                animate={{ width: `${bullishPct}%` }} 
                transition={{ duration: 0.5 }}
                className="h-full bg-emerald-500" 
              />
              <motion.div 
                animate={{ width: `${bearishPct}%` }} 
                transition={{ duration: 0.5 }}
                className="h-full bg-red-500" 
              />
            </div>
            <div className="font-mono text-xl font-bold flex items-center gap-1 text-red-400 w-16 justify-end">
              {bearishPct}% <TrendingDown size={16}/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleVote('bullish')}
              disabled={userVote !== null}
              className={`py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-all border ${
                userVote === 'bullish' 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                  : userVote === 'bearish'
                  ? 'bg-transparent border-[#222222] text-white/20'
                  : 'bg-transparent border-[#333333] hover:border-emerald-500/50 text-white/80 hover:text-emerald-400'
              }`}
            >
              <TrendingUp size={18} />
              Bullish
            </button>
            <button 
              onClick={() => handleVote('bearish')}
              disabled={userVote !== null}
              className={`py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-all border ${
                userVote === 'bearish' 
                  ? 'bg-red-500/20 border-red-500 text-red-400' 
                  : userVote === 'bullish'
                  ? 'bg-transparent border-[#222222] text-white/20'
                  : 'bg-transparent border-[#333333] hover:border-red-500/50 text-white/80 hover:text-red-400'
              }`}
            >
              <TrendingDown size={18} />
              Bearish
            </button>
          </div>
        </div>

        {/* Discussion */}
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-[#222222]">
            <div className="bg-[#1a1a1a] p-1 rounded-lg flex">
              {['Top', 'Latest'].map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === t ? 'bg-[#2a2a2a] text-white shadow' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
             {loadingPosts ? (
               <div className="flex items-center justify-center h-20 text-white/50">
                 <RefreshCw className="animate-spin" size={16} />
               </div>
             ) : posts.length === 0 ? (
               <div className="text-center py-8 text-white/40 text-sm">
                 Пока нет постов о {upperSymbol}. Будьте первым!
               </div>
             ) : (
               <div className="space-y-4">
                 {(() => {
                   const sorted = [...posts].sort((a, b) => {
                     if (activeTab === 'Top') return (b.likes + b.comments) - (a.likes + a.comments);
                     return 0; // Latest is default ordering from backend
                   });
                   return sorted.map(p => (
                     <FeedCard
                       key={p.id}
                       post={p}
                     />
                   ));
                 })()}
               </div>
             )}
          </div>

          <div className="p-4 border-t border-[#222222]">
             {user ? (
               <PostInput onPostSuccess={() => {
                 fetchFeedPosts().then((allPosts) => {
                   const coinPosts = allPosts.filter(
                     p => (p.coin || "").toUpperCase() === upperSymbol || (p.coinName || "").toUpperCase().includes(upperSymbol)
                   );
                   setPosts(coinPosts);
                 });
               }} defaultCoin={upperSymbol} />
             ) : (
               <div className="text-center p-3 text-xs text-white/50 bg-[#1a1a1a] rounded">
                 Войдите, чтобы оставить мнение о {upperSymbol}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
