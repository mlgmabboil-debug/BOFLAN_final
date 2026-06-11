import { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { Ticker } from "./Ticker";
import { ToastContainer } from "./Toast";
import { BoflanMark } from "./BoflanMark";
import { useUser } from "../context/UserContext";
import { sanitizeAvatarUrl } from "../utils/sanitize";
import { useNotifications } from "../hooks/useNotifications";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, BarChart2, Zap, Users, User,
  Bell, Search, Menu, X, ShieldCheck, LogOut,
  TrendingUp, UserCircle, MessageCircle, Wallet, MessagesSquare,
  Bot, Shield, Eye, Building2,
} from "lucide-react";

function navItemActive(pathname: string, itemPath: string): boolean {
  if (itemPath === "/profile") return pathname.startsWith("/profile");
  if (itemPath === "/community") return pathname.startsWith("/community");
  if (itemPath === "/exchanges") return pathname.startsWith("/exchanges");
  return pathname === itemPath;
}

const NAV_ITEMS = [
  { path: "/dashboard", label: "Лента", icon: LayoutDashboard },
  { path: "/charts", label: "Рынок", icon: BarChart2 },
  { path: "/dex", label: "DEX", icon: Zap },
  { path: "/groups", label: "Группы", icon: Users },
  { path: "/community", label: "Сообщества", icon: MessagesSquare },
  { path: "/profile", label: "Профиль", icon: User },
];

const MOBILE_NAV_ITEMS = [
  { path: "/dashboard", label: "Лента", icon: LayoutDashboard },
  { path: "/charts", label: "Рынок", icon: BarChart2 },
  { path: "/groups", label: "Группы", icon: Users },
  { path: "/community", label: "Чаты", icon: MessagesSquare },
  { path: "/profile", label: "Профиль", icon: User },
];

const NOTIF_ICONS: Record<string, any> = {
  trade: TrendingUp,
  follow: Users,
  group: MessageCircle,
  price: BarChart2,
  system: Bell,
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (diff < 60000) return "только что";
  if (m < 60) return `${m} мин.`;
  if (h < 24) return `${h} ч.`;
  return `${Math.floor(h / 24)} д.`;
}

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();
  const avatarSafe = user ? sanitizeAvatarUrl(user.avatar) : "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAllRead, markRead } = useNotifications(user?.id);

  // Close notif dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Focus search input
        const searchInput = document.querySelector('input[placeholder*="Поиск"]');
        if (searchInput && searchInput instanceof HTMLInputElement) {
          searchInput.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col">
      <Ticker
        onCoinClick={(symbol) => navigate(`/charts?coin=${symbol.toUpperCase()}`)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex flex-col w-60 border-r border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl flex-shrink-0">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <BoflanMark size={34} className="flex-shrink-0" />
              <span className="text-white font-bold text-lg tracking-wide">BOFLAN</span>
              <span className="text-[9px] text-blue-400/70 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">BETA</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = navItemActive(location.pathname, item.path);
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                    active
                      ? "bg-blue-600/15 text-white border-l-2 border-blue-500 pl-[10px]"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={18} className={active ? "text-blue-400" : ""} />
                  <span className="font-medium">{item.label}</span>
                  {item.path === "/dex" && (
                    <span className="ml-auto text-[9px] bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-mono">
                      NEW
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User card */}
          <div className="p-3 border-t border-white/5 space-y-1">
            <div
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all duration-300"
              onClick={() => navigate("/profile")}
            >
              <div className="relative">
                {avatarSafe ? (
                  <img src={avatarSafe} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                    <UserCircle size={18} className="text-white/60" />
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0a0a]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-medium truncate">{user?.username || "Загрузка..."}</div>
                {user?.isGuest ? (
                  <div className="text-yellow-400/80 text-[10px] font-medium">Гостевой режим</div>
                ) : (
                  <div className="text-emerald-400 text-[10px] font-mono font-medium">{user?.pnl || "+0.0%"}</div>
                )}
              </div>
              {user?.verified ? (
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <ShieldCheck size={12} className="text-blue-400" />
                </div>
              ) : user?.isGuest ? (
                <UserCircle size={13} className="text-yellow-400/60 flex-shrink-0" />
              ) : null}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 text-xs transition-all duration-300"
            >
              <LogOut size={13} />
              Выйти
            </button>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[60] md:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] glass border-r border-white/10 z-[70] flex flex-col"
              >
                <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BoflanMark size={30} />
                    <span className="text-white font-bold text-lg tracking-wide">BOFLAN</span>
                    <span className="text-[9px] text-blue-400/70 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">BETA</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const active = navItemActive(location.pathname, item.path);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => { navigate(item.path); setMobileOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                          active 
                            ? "bg-blue-600/15 text-white" 
                            : "text-white/50 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Icon size={18} className={active ? "text-blue-400" : ""} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
                <div className="p-3 border-t border-white/5">
                  <div className="flex items-center gap-2 p-2.5 mb-1 rounded-xl hover:bg-white/5 transition-colors">
                    {avatarSafe ? (
                      <img src={avatarSafe} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <UserCircle size={18} className="text-white/50" />
                      </div>
                    )}
                    <div>
                      <div className="text-white text-xs font-medium">{user?.username}</div>
                      {user?.isGuest && <div className="text-yellow-400/80 text-[10px] font-medium">Гость</div>}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 text-xs transition-all duration-300 rounded-xl"
                  >
                    <LogOut size={13} />
                    Выйти
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="relative z-50 h-14 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl flex items-center px-4 gap-3 flex-shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-white/50 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>

            {/* Search */}
            <div className="flex items-center gap-2 glass-light rounded-xl px-3 py-2 flex-1 max-w-[200px] sm:max-w-sm transition-smooth focus-within:border-blue-500/30">
              <Search size={14} className="text-white/40 flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    const query = searchQuery.trim();
                    // Username search (starts with @ or is a typical username)
                    if (query.startsWith("@") || /^[a-zA-Z0-9_]{3,20}$/.test(query)) {
                      const username = query.replace(/^@/, "");
                      navigate(`/profile/${username}`);
                    }
                    // Coin search (short uppercase like BTC, ETH)
                    else if (query.length <= 6 && query === query.toUpperCase()) {
                      navigate(`/charts?coin=${encodeURIComponent(query)}`);
                    }
                    // Market search
                    else {
                      navigate(`/market?search=${encodeURIComponent(query)}`);
                    }
                    setSearchQuery("");
                  }
                }}
                placeholder="Поиск..."
                className="bg-transparent text-white/80 text-sm outline-none placeholder-white/30 w-full"
              />
              <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] bg-white/5 text-white/30 px-1.5 py-0.5 rounded border border-white/10">
                <span className="text-[8px]">⌘</span>K
              </kbd>
            </div>

            <div className="flex items-center gap-1 ml-auto">
              {/* Market status */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 glass-light rounded-lg text-xs">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 font-medium">Рынок открыт</span>
              </div>

              {/* Guest badge */}
              {user?.isGuest && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 glass-light rounded-lg text-xs">
                  <UserCircle size={11} className="text-yellow-400" />
                  <span className="text-yellow-400 font-medium">Гость</span>
                </div>
              )}

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-300"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1 min-w-[16px] h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 shadow-lg shadow-blue-500/30"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="fixed left-4 right-4 top-16 sm:absolute sm:-right-2 sm:left-auto sm:top-full mt-2 sm:w-80 max-h-[80vh] flex flex-col glass rounded-xl shadow-2xl z-[100] border border-white/10"
                    >
                      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Bell size={12} className="text-blue-400" />
                          </div>
                          <span className="text-white text-sm font-medium">Уведомления</span>
                          {unreadCount > 0 && (
                            <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
                          >
                            Всё прочитано
                          </button>
                        )}
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto max-h-[60vh] sm:max-h-80">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-white/30 text-sm">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                              <Bell size={20} className="text-white/20" />
                            </div>
                            Нет уведомлений
                          </div>
                        ) : (
                          notifications.map((n) => {
                            const IconComp = NOTIF_ICONS[n.type] || Bell;
                            return (
                              <div
                                key={n.id}
                                onClick={() => !n.read && markRead(n.id)}
                                className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-all duration-300 flex items-start gap-3 ${
                                  !n.read ? "bg-blue-500/5" : ""
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  n.type === "trade" ? "bg-gradient-to-br from-emerald-500/20 to-emerald-400/10" :
                                  n.type === "follow" ? "bg-gradient-to-br from-blue-500/20 to-blue-400/10" :
                                  n.type === "group" ? "bg-gradient-to-br from-purple-500/20 to-purple-400/10" :
                                  "glass-light"
                                }`}>
                                  <IconComp size={14} className={
                                    n.type === "trade" ? "text-emerald-400" :
                                    n.type === "follow" ? "text-blue-400" :
                                    n.type === "group" ? "text-purple-400" :
                                    "text-white/50"
                                  } />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs leading-relaxed ${n.read ? "text-white/50" : "text-white/80 font-medium"}`}>
                                    {n.text}
                                  </p>
                                  <span className="text-white/30 text-[10px] mt-0.5 block">
                                    {timeAgo(n.timestamp)}
                                  </span>
                                </div>
                                {!n.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Avatar */}
              <button 
                onClick={() => navigate("/profile")} 
                className="ml-1 p-0.5 rounded-full hover:bg-white/5 transition-all duration-300"
              >
                {avatarSafe ? (
                  <img
                    src={avatarSafe}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-white/10 hover:border-blue-500/50 transition-colors"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 hover:border-blue-500/50 transition-colors flex items-center justify-center">
                    <UserCircle size={18} className="text-white/50" />
                  </div>
                )}
              </button>
            </div>
          </header>

          {/* Page */}
          <main className="flex-1 overflow-y-auto relative z-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Mobile bottom nav */}
      <nav className="md:hidden glass border-t border-white/10 pb-safe">
        <div className="grid grid-cols-5 items-center justify-items-center w-full px-1 py-1.5">
          {MOBILE_NAV_ITEMS.map((item) => {
            const active = navItemActive(location.pathname, item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 w-full transition-all duration-300 rounded-lg ${
                  active 
                    ? "text-blue-400" 
                    : "text-white/40"
                }`}
              >
                <Icon size={20} className={active ? "text-blue-400" : ""} />
                <span className="text-[9px] sm:text-[10px] whitespace-nowrap font-medium text-center">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}