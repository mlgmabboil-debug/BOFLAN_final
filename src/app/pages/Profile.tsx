import { useState, useId, useMemo, useEffect } from "react";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { FeedCard } from "../components/FeedCard";
import { BoflanLogoLoader } from "../components/BoflanLogoLoader";
import { useUser, type AppUser } from "../context/UserContext";
import { useNotifications } from "../hooks/useNotifications";
import { useMarketPrices, getPrice } from "../hooks/useMarketPrices";
import { useIndexedPriceHistory } from "../hooks/useIndexedPriceHistory";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import {
  Settings, Share2, ShieldCheck, TrendingUp, TrendingDown,
  BarChart2, Award, Calendar, Link as LinkIcon, Key, Eye, EyeOff,
  UserCircle, LogOut, CheckCircle, Loader, X, Wallet,
  AlertCircle, RefreshCw, PlugZap, Unplug,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useParams, Link } from "react-router";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { type FeedPostShape } from "../utils/feedPosts";
import { fetchPostsByUser } from "../utils/postsApi";
import { sanitizeAvatarUrl, sanitizeEthAddress } from "../utils/sanitize";
import { fetchPublicProfileByUsername, upsertServerProfile, type PublicProfile } from "../utils/profileApi";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6d3e2891`;

const PNL_HISTORY = [
  { month: "Сен", value: 100 },
  { month: "Окт", value: 118 },
  { month: "Ноя", value: 109 },
  { month: "Дек", value: 142 },
  { month: "Янв", value: 138 },
  { month: "Фев", value: 154 },
  { month: "Мар", value: 154.2 },
];

const TABS = ["Прогнозы", "Сделки", "Портфель"];


export function Profile() {
  const pChartGradId = useId().replace(/:/g, "");
  const { username } = useParams();
  const { user, setUser, logout } = useUser();
  const { addNotification } = useNotifications(user?.id);
  const [activeTab, setActiveTab] = useState("Прогнозы");
  const { allPrices } = useMarketPrices();
  const { data: pnlSeries, loading: pnlChartLoading, error: pnlChartError } = useIndexedPriceHistory(
    "BTC",
    180,
    8
  );
  const pnlChartData = useMemo(() => {
    if (pnlSeries.length > 0) return pnlSeries.map((d) => ({ month: d.label, value: d.value }));
    return PNL_HISTORY;
  }, [pnlSeries]);
  const pnlIndexChange =
    pnlSeries.length >= 2 ? pnlSeries[pnlSeries.length - 1].value - 100 : null;

  const [profilePosts, setProfilePosts] = useState<FeedPostShape[]>([]);
  const [profilePostsLoading, setProfilePostsLoading] = useState(false);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);

  const isOwnProfile =
    !username || (user?.username && user.username.toLowerCase() === username.toLowerCase());

  useEffect(() => {
    if (!username || !user?.username || user.username.toLowerCase() === username.toLowerCase()) {
      setPublicProfile(null);
      setPublicError(null);
      setPublicLoading(false);
      return;
    }
    let cancelled = false;
    setPublicLoading(true);
    setPublicError(null);
    fetchPublicProfileByUsername(username).then((r) => {
      if (cancelled) return;
      setPublicLoading(false);
      if (r.ok) {
        setPublicProfile(r.profile);
      } else {
        setPublicProfile(null);
        setPublicError((r as any).error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [username, user?.username]);

  const [manualPortfolioValue, setManualPortfolioValue] = useState<string>("$15,500");

  useEffect(() => {
    if (!user) return;
    try {
      const storageKey = `boflan_portfolio_${user.id || 'guest'}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          let total = 0;
          parsed.forEach((coin) => {
            const priceData = allPrices?.find((p: any) => p.id === coin.id);
            const currentPrice = priceData?.current_price || coin.avgBuyPrice || 0;
            total += (Number(coin.amount || 0) * currentPrice);
          });
          setManualPortfolioValue(`$${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}`);
        }
      } else {
        // Default demo portfolios for nice visual appeal
        const btcPrice = allPrices?.find((p: any) => p.symbol === 'btc')?.current_price || 65000;
        const ethPrice = allPrices?.find((p: any) => p.symbol === 'eth')?.current_price || 3500;
        const total = (0.25 * btcPrice) + (2.5 * ethPrice);
        setManualPortfolioValue(`$${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}`);
      }
    } catch {
      // ignore
    }
  }, [user, allPrices]);

  const profileAuthorId = useMemo(() => {
    if (!isOwnProfile && publicProfile?.userId) return publicProfile.userId;
    if (isOwnProfile && user && !user.isGuest) return user.id;
    return null;
  }, [isOwnProfile, publicProfile?.userId, user?.id, user?.isGuest]);

  useEffect(() => {
    if (!profileAuthorId) {
      setProfilePosts([]);
      return;
    }
    let cancelled = false;
    setProfilePostsLoading(true);
    fetchPostsByUser(profileAuthorId).then((posts) => {
      if (!cancelled) {
        setProfilePosts(posts);
        setProfilePostsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profileAuthorId]);

  if (!user) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 py-20 text-center text-white/40 text-sm">
        Войдите или продолжите как гость, чтобы открыть профиль.
      </div>
    );
  }

  if (!isOwnProfile && publicLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 py-20 flex flex-col items-center justify-center gap-3">
        <BoflanLogoLoader size={48} />
        <p className="text-white/40 text-sm">Загрузка профиля…</p>
      </div>
    );
  }

  if (!isOwnProfile && publicError) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 py-20 text-center space-y-3">
        <p className="text-white/60 text-sm">{publicError}</p>
        <p className="text-white/35 text-xs">
          Пользователь ещё не опубликовал профиль или имя указано неверно.
        </p>
      </div>
    );
  }

  const displayUser: AppUser = !isOwnProfile && publicProfile
    ? {
        id: publicProfile.userId,
        username: publicProfile.username,
        displayName: publicProfile.displayName,
        avatar: publicProfile.avatar,
        isGuest: false,
        verified: publicProfile.verified,
        exchange: publicProfile.exchange || undefined,
        pnl: "—",
        portfolioValue: "$0",
        followers: 0,
        following: 0,
        winRate: 0,
        totalTrades: 0,
        bio: publicProfile.bio,
      }
    : user;
  const profileAvatar = sanitizeAvatarUrl(displayUser.avatar);
  const portfolioStatValue = manualPortfolioValue;


  const handleLogout = () => {
    if (
      !window.confirm(
        "Выйти из аккаунта? Сессия на этом устройстве будет завершена."
      )
    ) {
      return;
    }
    logout();
    window.location.reload();
  };

  const handleShareProfile = async () => {
    const path = `/profile/${encodeURIComponent(displayUser.username)}`;
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      if (isOwnProfile && user?.id) {
        await addNotification("Ссылка на профиль скопирована", "system");
      }
    } catch {
      window.prompt("Ссылка на публичный профиль:", url);
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 py-6">
      {/* Guest Banner */}
      {user?.isGuest && isOwnProfile && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 mb-5 flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <UserCircle size={18} className="text-yellow-400 flex-shrink-0" />
            <div>
              <div className="text-yellow-400 text-sm font-medium">Гостевой режим</div>
              <div className="text-yellow-400/50 text-xs">
                Вы вошли как гость. Зарегистрируйтесь для доступа ко всем функциям.
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-sm text-sm transition-colors"
          >
            <LogOut size={13} />
            Выйти и зарегистрироваться
          </button>
        </motion.div>
      )}

      {!isOwnProfile && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-5 text-blue-200/90 text-xs leading-relaxed">
          Вы смотрите публичный профиль. Отображаются только данные, которые пользователь опубликовал (публичный
          адрес и баланс из блокчейна). Приватные ключи на сервер не передаются.
        </div>
      )}

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111111] border border-[#1e1e1e] rounded-lg overflow-hidden mb-5"
      >
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-blue-900/40 via-purple-900/20 to-black relative">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "linear-gradient(45deg, #0066ff22 25%, transparent 25%), linear-gradient(-45deg, #0066ff22 25%, transparent 25%)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <div className="px-6 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              {profileAvatar ? (
                <img
                  src={profileAvatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full object-cover border-4 border-[#111111]"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#1e1e1e] border-4 border-[#111111] flex items-center justify-center">
                  <UserCircle size={40} className="text-white/30" />
                </div>
              )}
              {(displayUser as any).verified && (
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#111111]">
                  <ShieldCheck size={12} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pb-1 flex-wrap">
              <button
                type="button"
                onClick={() => void handleShareProfile()}
                className="p-2 rounded-sm bg-[#1a1a1a] hover:bg-[#222] text-white/60 hover:text-white transition-colors"
                title="Скопировать ссылку на профиль"
              >
                <Share2 size={15} />
              </button>
              <Link 
                to="/settings"
                className="p-2 rounded-sm bg-[#1a1a1a] hover:bg-[#222] text-white/60 hover:text-white transition-colors block"
                title="Настройки"
              >
                <Settings size={15} />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-sm bg-[#1a1a1a] hover:bg-red-500/10 text-white/60 hover:text-red-400 transition-colors"
                title="Выйти"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-white font-semibold text-xl">{displayUser.displayName}</h2>
              {displayUser.verified && (
                <VerifiedBadge
                  size="md"
                  exchange={displayUser.exchange}
                />
              )}
              {user?.isGuest && isOwnProfile && (
                <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                  Гость
                </span>
              )}
            </div>
            <div className="text-white/40 text-sm mt-0.5">@{displayUser.username}</div>
          </div>

          <p className="text-white/60 text-sm mb-4 leading-relaxed">{displayUser.bio}</p>

          <div className="flex items-center gap-4 text-xs text-white/40 mb-4 flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>На платформе с {new Date().toLocaleDateString("ru", { month: "long", year: "numeric" })}</span>
            </div>
            <div className="flex items-center gap-1">
              <LinkIcon size={12} />
              <span className="text-blue-400">boflan.io/@{displayUser.username}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <span className="text-white font-semibold">{(displayUser as any).followers?.toLocaleString() || 0}</span>
              <span className="text-white/40 text-sm ml-1.5">подписчиков</span>
            </div>
            <div>
              <span className="text-white font-semibold">{(displayUser as any).following?.toLocaleString() || 0}</span>
              <span className="text-white/40 text-sm ml-1.5">подписок</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "PnL за 30 дней",
            value: displayUser.isGuest ? "N/A" : (displayUser as any).pnl || "+0.0%",
            color: "text-emerald-400",
            icon: <TrendingUp size={14} className="text-emerald-400" />,
          },
          {
            label: "Win Rate",
            value: displayUser.isGuest ? "N/A" : `${(displayUser as any).winRate || 0}%`,
            color: "text-blue-400",
            icon: <Award size={14} className="text-blue-400" />,
          },
          {
            label: "Всего сделок",
            value: displayUser.isGuest ? "0" : `${(displayUser as any).totalTrades || 0}`,
            color: "text-white",
            icon: <BarChart2 size={14} className="text-white/40" />,
          },
          {
            label: "Портфель",
            value: portfolioStatValue,
            color: "text-white",
            icon: <ShieldCheck size={14} className="text-blue-400" />,
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-4"
          >
            <div className="flex items-center gap-1.5 mb-2">
              {stat.icon}
              <span className="text-white/40 text-xs">{stat.label}</span>
            </div>
            <div className={`font-mono font-bold text-lg ${stat.color}`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Web3 wallet connections have been removed from Profile page as requested */}

      {/* PnL Chart — только свой профиль, не гость */}
      {isOwnProfile && !user?.isGuest && (
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-4 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-white/80 text-sm font-medium mb-0.5">Доходность (индекс BTC)</div>
              <div className="text-white/40 text-xs">
                Реальные данные ~6 мес. (CoinGecko)
              </div>
              {pnlChartError && pnlSeries.length === 0 && (
                <div className="text-amber-400/70 text-[10px] mt-1">График: офлайн, показан демо-ряд</div>
              )}
            </div>
            <div
              className={`font-mono font-bold ${
                pnlIndexChange != null
                  ? pnlIndexChange >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                  : "text-emerald-400"
              }`}
            >
              {pnlIndexChange != null
                ? `${pnlIndexChange >= 0 ? "+" : ""}${pnlIndexChange.toFixed(1)}%`
                : "—"}
            </div>
          </div>
          <div className="h-40 relative">
            {pnlChartLoading && pnlSeries.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <BoflanLogoLoader size={48} />
                <span className="text-white/30 text-[10px]">Загрузка графика…</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pnlChartData}>
                  <defs>
                    <linearGradient id={pChartGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d091" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00d091" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: "#ffffff40", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#ffffff60" }}
                    formatter={(val: number) => [`${(val - 100).toFixed(2)}% к базе`, "Индекс"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#00d091"
                    strokeWidth={2}
                    fill={`url(#${pChartGradId})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[#1a1a1a] pb-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? "text-white border-blue-500"
                : "text-white/40 border-transparent hover:text-white/60"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Прогнозы" && (
        <div className="flex flex-col gap-4">
          {user?.isGuest && isOwnProfile ? (
            <div className="text-center py-12 text-white/20">
              <UserCircle size={32} className="mx-auto mb-2 opacity-20" />
              Зарегистрируйтесь для публикации прогнозов
            </div>
          ) : profilePostsLoading ? (
            <div className="text-center py-12 text-white/30 text-sm">Загрузка прогнозов…</div>
          ) : profilePosts.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">
              {isOwnProfile
                ? "Здесь появятся ваши посты из ленты. Опубликуйте прогноз на главной."
                : "У пользователя пока нет публичных прогнозов."}
            </div>
          ) : (
            profilePosts.map((post) => <FeedCard key={post.id} post={post} />)
          )}
        </div>
      )}

      {activeTab === "Сделки" && (
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg overflow-hidden">
          {!isOwnProfile ? (
            <div className="px-4 py-16 text-center text-white/30 text-sm">
              Сделки доступны только владельцу аккаунта.
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[1fr_80px_1fr_1fr_1fr_80px_100px] gap-4 px-4 py-2.5 border-b border-[#1a1a1a]">
                {["Монета", "Позиция", "Вход", "Выход", "ROI", "Статус", "Дата"].map((h) => (
                  <span key={h} className="text-white/30 text-xs">
                    {h}
                  </span>
                ))}
              </div>
              <div className="px-4 py-16 text-center text-white/30 text-sm">
                История сделок будет доступна после верификации через Smart Contract
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "Портфель" && (
        <PortfolioTab 
          isOwnProfile={!!isOwnProfile} 
          user={user} 
          allPrices={allPrices}
        />
      )}

    </div>
  );
}

// Portfolio Tab Component - ручное добавление монет
interface PortfolioCoin {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  avgBuyPrice: number;
}

function PortfolioTab({ isOwnProfile, user, allPrices }: { isOwnProfile: boolean; user: any; allPrices: any[] }) {
  const storageKey = user?.isGuest ? 'boflan_portfolio_guest' : `boflan_portfolio_${user?.id || 'guest'}`;
  const [portfolio, setPortfolio] = useState<PortfolioCoin[]>([
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', amount: 0.25, avgBuyPrice: 42000 },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', amount: 2.5, avgBuyPrice: 2800 },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState('');
  const [coinSearch, setCoinSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const normalized = parsed
        .filter((x) => x && typeof x === "object")
        .map((x) => ({
          id: String(x.id || ''),
          symbol: String(x.symbol || '').toUpperCase(),
          name: String(x.name || ''),
          amount: Number(x.amount || 0),
          avgBuyPrice: Number(x.avgBuyPrice || 0),
        }))
        .filter((x) => x.id && x.symbol && x.amount > 0 && x.avgBuyPrice > 0);
      if (normalized.length > 0) setPortfolio(normalized);
    } catch {
      // ignore broken local state
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(portfolio));
    } catch {
      // ignore quota/storage errors
    }
  }, [portfolio, storageKey]);

  const portfolioWithPrices = useMemo(() => {
    return portfolio.map(coin => {
      const priceData = allPrices.find((p: any) => p.id === coin.id);
      const currentPrice = priceData?.current_price || coin.avgBuyPrice;
      const value = coin.amount * currentPrice;
      const invested = coin.amount * coin.avgBuyPrice;
      const pnl = value - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
      return { ...coin, currentPrice, value, pnl, pnlPercent };
    });
  }, [portfolio, allPrices]);

  const totalValue = portfolioWithPrices.reduce((sum, c) => sum + c.value, 0);
  const totalInvested = portfolioWithPrices.reduce((sum, c) => sum + (c.amount * c.avgBuyPrice), 0);
  const totalPnl = totalValue - totalInvested;

  const coinOptions = useMemo(() => {
    const q = coinSearch.trim().toLowerCase();
    const list = [...allPrices]
      .sort((a: any, b: any) => (b.market_cap || 0) - (a.market_cap || 0))
      .filter((c: any) => {
        if (!q) return true;
        return (
          String(c.symbol || '').toLowerCase().includes(q) ||
          String(c.name || '').toLowerCase().includes(q)
        );
      });
    return list.slice(0, 80);
  }, [allPrices, coinSearch]);

  const handleAddCoin = () => {
    if (!selectedCoin || !amount || !buyPrice) {
      setFormError('Выберите монету и заполните количество/цену.');
      return;
    }
    const coin = allPrices.find((c: any) => c.id === selectedCoin);
    const amountNum = Number(amount);
    const buyPriceNum = Number(buyPrice);
    if (!coin || !Number.isFinite(amountNum) || !Number.isFinite(buyPriceNum) || amountNum <= 0 || buyPriceNum <= 0) {
      setFormError('Введите корректные числовые значения больше нуля.');
      return;
    }
    setFormError(null);
    setPortfolio(prev => {
      const existing = prev.find((p) => p.id === coin.id);
      if (!existing) {
        return [...prev, {
          id: coin.id,
          symbol: String(coin.symbol || '').toUpperCase(),
          name: coin.name,
          amount: amountNum,
          avgBuyPrice: buyPriceNum,
        }];
      }
      const nextAmount = existing.amount + amountNum;
      const weightedBuyPrice = ((existing.amount * existing.avgBuyPrice) + (amountNum * buyPriceNum)) / nextAmount;
      return prev.map((p) => p.id === existing.id ? { ...p, amount: nextAmount, avgBuyPrice: weightedBuyPrice } : p);
    });
    setShowAddModal(false);
    setSelectedCoin('');
    setCoinSearch('');
    setAmount('');
    setBuyPrice('');
  };

  const handleDeleteCoin = (id: string) => {
    setPortfolio(prev => prev.filter(c => c.id !== id));
  };

  if (!isOwnProfile) {
    return (
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-5">
        <div className="text-center py-10 text-white/30 text-sm">
          Портфель пользователя скрыт
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <div className="text-white/40 text-xs mb-1">Стоимость</div>
          <div className="text-white font-bold">${totalValue.toLocaleString()}</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <div className="text-white/40 text-xs mb-1">Инвестировано</div>
          <div className="text-white font-bold">${totalInvested.toLocaleString()}</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <div className="text-white/40 text-xs mb-1">P&L</div>
          <div className={`font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full mb-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
      >
        + Добавить монету
      </button>

      {/* Coins list */}
      <div className="space-y-2">
        {portfolioWithPrices.map((coin) => (
          <div key={coin.id} className="flex items-center justify-between bg-[#1a1a1a] rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                {coin.symbol.charAt(0)}
              </div>
              <div>
                <div className="text-white font-medium">{coin.symbol}</div>
                <div className="text-white/40 text-xs">{coin.amount} монет</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-mono">${coin.value.toFixed(0)}</div>
              <div className={`text-xs ${coin.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {coin.pnlPercent >= 0 ? '+' : ''}{coin.pnlPercent.toFixed(1)}%
              </div>
            </div>
            <button
              onClick={() => handleDeleteCoin(coin.id)}
              className="ml-2 text-white/30 hover:text-red-400"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5 w-full max-w-sm"
          >
            <h3 className="text-white font-medium mb-4">Добавить монету</h3>
            <input
              value={coinSearch}
              onChange={(e) => setCoinSearch(e.target.value)}
              placeholder="Поиск монеты (BTC, ETH, Solana...)"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm mb-3"
            />
            <div className="max-h-40 overflow-y-auto border border-[#2a2a2a] rounded-lg mb-3">
              {coinOptions.map((coin: any) => (
                <button
                  key={coin.id}
                  type="button"
                  onClick={() => {
                    setSelectedCoin(coin.id);
                    if (!buyPrice) setBuyPrice(String(coin.current_price || ''));
                  }}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-[#1a1a1a] last:border-b-0 transition-colors ${
                    selectedCoin === coin.id ? 'bg-blue-600/20 text-blue-300' : 'text-white/80 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <span className="font-medium">{String(coin.symbol || '').toUpperCase()}</span>
                  <span className="text-white/40 ml-2">{coin.name}</span>
                  <span className="text-white/50 float-right">${Number(coin.current_price || 0).toFixed(2)}</span>
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Количество"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm mb-3"
            />
            <input
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="Цена покупки ($)"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm mb-4"
            />
            {formError && (
              <p className="text-red-400/80 text-xs mb-3">{formError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormError(null);
                }}
                className="flex-1 py-2 bg-[#2a2a2a] text-white rounded-lg text-sm"
              >
                Отмена
              </button>
              <button
                onClick={handleAddCoin}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                Добавить
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
