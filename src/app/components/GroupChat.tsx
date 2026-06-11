import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, X, MessageCircle, Loader, UserCircle, TrendingUp, AtSign, Hash, Zap } from "lucide-react";
import { BoflanLogoLoader } from "./BoflanLogoLoader";
import { projectId, publicAnonKey, isEdgeFunctionOnline } from "../../../utils/supabase/info";
import { useUser } from "../context/UserContext";
import { sanitizeAvatarUrl, sanitizePlainText } from "../utils/sanitize";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6d3e2891`;

const CHAT_STORAGE_PREFIX = "boflan_chat_";

const DEFAULT_GROUP_MESSAGES: Record<string, Omit<ChatMessage, "id">[]> = {
  general: [
    {
      groupId: "general",
      userId: "boflan_system",
      username: "BOFLAN_BOT",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=system",
      text: "Добро пожаловать в общий чат комьюнити BOFLAN! Запрещен спам и прямая реклама.",
      timestamp: Date.now() - 3600000 * 2,
    },
    {
      groupId: "general",
      userId: "trader_aleks",
      username: "aleks_crypto",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=aleks",
      text: "Всем привет! Открыл лонг по биткоину на пробой зоны сопротивления. Кто со мной?",
      timestamp: Date.now() - 3600000,
    },
    {
      groupId: "general",
      userId: "eth_queen",
      username: "queen_eth",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=queen",
      text: "Привет! Эфир тоже сильно смотрится, взял лонг по $3480 со стопом ниже $3350.",
      timestamp: Date.now() - 1800000,
    }
  ],
  signals: [
    {
      groupId: "signals",
      userId: "trader_aleks",
      username: "aleks_crypto",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=aleks",
      text: "SIGNAL: LONG BTC @ $96,400",
      timestamp: Date.now() - 3600000,
      type: 'signal',
      signalData: {
        symbol: "BTC",
        direction: 'buy',
        entryPrice: 96400,
        targetPrice: 102500,
        stopLoss: 94000,
        confidence: 85
      }
    }
  ]
};

function getLocalMessages(gId: string): ChatMessage[] {
  try {
    const stored = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${gId}`);
    if (stored) return JSON.parse(stored);
    
    const defaults = DEFAULT_GROUP_MESSAGES[gId] || [];
    const formatted = defaults.map((m, idx) => ({
      ...m,
      id: `default_chat_${gId}_${idx}`
    })) as ChatMessage[];
    localStorage.setItem(`${CHAT_STORAGE_PREFIX}${gId}`, JSON.stringify(formatted));
    return formatted;
  } catch {
    return [];
  }
}

function saveLocalMessages(gId: string, list: ChatMessage[]) {
  try {
    localStorage.setItem(`${CHAT_STORAGE_PREFIX}${gId}`, JSON.stringify(list));
  } catch (err) {
    console.error(err);
  }
}

interface ChatMessage {
  id: string;
  groupId: string;
  userId: string;
  username: string;
  avatar?: string | null;
  text: string;
  timestamp: number;
  isGuest?: boolean;
  type?: 'text' | 'signal';
  signalData?: {
    symbol: string;
    direction: 'buy' | 'sell' | 'hold';
    entryPrice: number;
    targetPrice: number;
    stopLoss: number;
    confidence: number;
  };
}

interface GroupChatProps {
  groupId: string;
  groupName: string;
  onClose?: () => void;
  embedded?: boolean;
  recentContentCutoffTs?: number | null;
  accessNotice?: string | null;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (diff < 60000) return "только что";
  if (m < 60) return `${m} мин.`;
  if (h < 24) return `${h} ч.`;
  return `${Math.floor(h / 24)} д.`;
}

export function GroupChat({
  groupId,
  groupName,
  onClose,
  embedded = false,
  recentContentCutoffTs,
  accessNotice,
}: GroupChatProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [signalData, setSignalData] = useState({
    symbol: '',
    direction: 'buy' as 'buy' | 'sell' | 'hold',
    entryPrice: '',
    targetPrice: '',
    stopLoss: '',
    confidence: 80
  });
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
    if (!isSupabaseValid || !(await isEdgeFunctionOnline(API_BASE, publicAnonKey))) {
      const local = getLocalMessages(groupId);
      setMessages(local);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const resp = await fetch(`${API_BASE}/chat/${groupId}/messages`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (json.success) {
        setMessages(json.messages || []);
        saveLocalMessages(groupId, json.messages || []);
      } else {
        throw new Error(json.error);
      }
      setError(null);
    } catch {
      console.warn("Chat fetch failed, pulling local chat messages");
      const local = getLocalMessages(groupId);
      setMessages(local);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;
    if (!user) return;

    const text = sanitizePlainText(inputText, 500);
    if (!text) return;
    setInputText("");
    setSending(true);

    const optimistic: ChatMessage = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      groupId,
      userId: user.id,
      username: user.username,
      avatar: user.avatar || null,
      text,
      timestamp: Date.now(),
      isGuest: user.isGuest,
    };

    const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
    if (!isSupabaseValid) {
      const current = getLocalMessages(groupId);
      const updated = [...current, optimistic];
      saveLocalMessages(groupId, updated);
      setMessages(updated);
      setSending(false);
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    setMessages((prev) => [...prev, optimistic]);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const resp = await fetch(`${API_BASE}/chat/${groupId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          avatar: user.avatar || null,
          text,
          isGuest: user.isGuest,
        }),
      });
      clearTimeout(timeoutId);

      const json = await resp.json();
      if (!json.success) throw new Error(json.error);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? json.message : m))
      );
    } catch {
      console.warn("Message send failed server-side, preserving locally");
      const current = getLocalMessages(groupId).filter(m => m.id !== optimistic.id);
      const updated = [...current, optimistic];
      saveLocalMessages(groupId, updated);
      setMessages(updated);
    } finally {
      setSending(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === "@") {
      setShowMentions(true);
      setMentionQuery('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);

    const lastAt = value.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === value.length - 1) {
      setShowMentions(true);
      setMentionQuery('');
    } else if (lastAt !== -1 && !value.slice(lastAt).includes(' ')) {
      setMentionQuery(value.slice(lastAt + 1));
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username: string) => {
    const lastAt = inputText.lastIndexOf('@');
    const before = inputText.slice(0, lastAt);
    setInputText(before + '@' + username + ' ');
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const sendSignal = async () => {
    if (!user || !signalData.symbol) return;

    const signalMsg: ChatMessage = {
      id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      groupId,
      userId: user.id,
      username: user.username,
      avatar: user.avatar || null,
      text: `SIGNAL: ${signalData.direction.toUpperCase()} ${signalData.symbol} @ ${signalData.entryPrice || 'MARKET'}`,
      timestamp: Date.now(),
      isGuest: user.isGuest,
      type: 'signal',
      signalData: {
        symbol: signalData.symbol.toUpperCase(),
        direction: signalData.direction as any,
        entryPrice: parseFloat(signalData.entryPrice) || 0,
        targetPrice: parseFloat(signalData.targetPrice) || 0,
        stopLoss: parseFloat(signalData.stopLoss) || 0,
        confidence: signalData.confidence
      }
    };

    setShowSignalModal(false);
    setSignalData({
      symbol: '', direction: 'buy', entryPrice: '', targetPrice: '', stopLoss: '', confidence: 80
    });

    const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
    if (!isSupabaseValid) {
      const current = getLocalMessages(groupId);
      const updated = [...current, signalMsg];
      saveLocalMessages(groupId, updated);
      setMessages(updated);
      return;
    }

    setMessages(prev => [...prev, signalMsg]);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const resp = await fetch(`${API_BASE}/chat/${groupId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          avatar: user.avatar || null,
          text: signalMsg.text,
          isGuest: user.isGuest,
          type: 'signal',
          signalData: signalMsg.signalData,
        }),
      });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error('Failed');
    } catch {
      console.warn('Signal send Failed to sync with server, keeping locally.');
      const current = getLocalMessages(groupId).filter(m => m.id !== signalMsg.id);
      const updated = [...current, signalMsg];
      saveLocalMessages(groupId, updated);
      setMessages(updated);
    }
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(@\w+|#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-blue-400 font-medium hover:underline cursor-pointer">{part}</span>;
      }
      if (part.startsWith('#')) {
        return <span key={i} className="text-emerald-400 font-medium hover:underline cursor-pointer">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const isMe = (msg: ChatMessage) => msg.userId === user?.id;

  const visibleMessages = useMemo(() => {
    if (recentContentCutoffTs == null) return messages;
    return messages.filter((m) => m.timestamp >= recentContentCutoffTs);
  }, [messages, recentContentCutoffTs]);

  const containerClass = embedded
    ? "flex flex-col h-full"
    : "flex flex-col h-[500px]";

  return (
    <div className={containerClass}>
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] bg-[#0d0d0d] flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle size={15} className="text-blue-400" />
            <span className="text-white text-sm font-medium">{groupName}</span>
            <span className="text-white/30 text-xs">• Чат</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {accessNotice && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-[11px] leading-relaxed">
            {accessNotice}
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            <BoflanLogoLoader size={56} />
            <span className="text-white/30 text-xs">Загрузка сообщений…</span>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-4">
            <p className="text-red-400/60 text-xs mb-2">{error}</p>
            <button onClick={fetchMessages} className="text-blue-400 text-xs hover:underline">
              Повторить
            </button>
          </div>
        )}

        {!loading && !error && visibleMessages.length === 0 && messages.length > 0 && recentContentCutoffTs != null && (
          <div className="text-center py-6 text-white/35 text-xs px-2">
            Сообщения старше 7 дней скрыты до завершения оплаты подписки.
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <MessageCircle size={28} className="text-white/10 mb-3" />
            <p className="text-white/30 text-sm">Будьте первым — напишите что-нибудь!</p>
          </div>
        )}

        {visibleMessages.map((msg) => {
          const mine = isMe(msg);
          const peerAv = !mine ? sanitizeAvatarUrl(msg.avatar) : "";
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              {!mine && (
                <div className="w-7 h-7 rounded-full bg-[#1e1e1e] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {peerAv ? (
                    <img
                      src={peerAv}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle size={18} className="text-white/30" />
                  )}
                </div>
              )}

              <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                {!mine && (
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-white/50 text-[10px] font-medium">{msg.username}</span>
                    {msg.isGuest && (
                      <span className="text-[9px] text-white/20 bg-[#1a1a1a] px-1 rounded">гость</span>
                    )}
                  </div>
                )}
                <div
                  className={`px-3 py-2 rounded-xl text-sm leading-relaxed break-words ${
                    msg.type === 'signal'
                      ? mine
                        ? "bg-emerald-600/90 text-white rounded-br-sm border border-emerald-500/30"
                        : "bg-emerald-900/40 text-emerald-100 rounded-bl-sm border border-emerald-500/20"
                      : mine
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-[#1a1a1a] text-white/85 rounded-bl-sm border border-[#2a2a2a]"
                  }`}
                >
                  {msg.type === 'signal' && (
                    <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-white/10">
                      <Zap size={12} className="text-yellow-300" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-300">Trading Signal</span>
                      {msg.signalData && (
                        <span className={`text-[10px] font-bold ml-auto px-1.5 py-0.5 rounded ${
                          msg.signalData.direction === 'buy' ? 'bg-green-500/20 text-green-300' :
                          msg.signalData.direction === 'sell' ? 'bg-red-500/20 text-red-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {msg.signalData.direction.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                  {msg.type === 'signal' && msg.signalData ? (
                    <div className="space-y-1">
                      <div className="font-bold text-base">{msg.signalData.symbol}</div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] mt-1">
                        <div>
                          <div className="text-white/50">Entry</div>
                          <div className="font-mono">${msg.signalData.entryPrice}</div>
                        </div>
                        <div>
                          <div className="text-white/50">Target</div>
                          <div className="font-mono text-green-300">${msg.signalData.targetPrice}</div>
                        </div>
                        <div>
                          <div className="text-white/50">Stop</div>
                          <div className="font-mono text-red-300">${msg.signalData.stopLoss}</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-white/40 mt-1">Confidence: {msg.signalData.confidence}%</div>
                    </div>
                  ) : (
                    <div>{renderMessageText(msg.text)}</div>
                  )}
                </div>
                <span className="text-[10px] text-white/20 px-1">{timeAgo(msg.timestamp)}</span>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-[#1a1a1a] bg-[#0d0d0d] flex-shrink-0">
        {!user ? (
          <div className="text-center text-white/30 text-xs py-2">
            Войдите, чтобы отправлять сообщения
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 focus-within:border-blue-500/40 transition-colors relative">
              <input
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={user.isGuest ? `${user.username}: напишите сообщение...` : "Напишите сообщение..."}
                maxLength={500}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/20"
              />
              {showMentions && (
                <div className="absolute bottom-full left-0 mb-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 min-w-[160px]">
                  <div className="px-3 py-2 text-[10px] text-white/40 border-b border-[#2a2a2a]">Mentions</div>
                  {['trader1', 'admin', 'signal_bot', 'analyst'].filter(u => u.includes(mentionQuery.toLowerCase())).map(u => (
                    <button
                      key={u}
                      onClick={() => insertMention(u)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-blue-500/10 hover:text-white transition-colors"
                    >
                      <AtSign size={12} className="text-blue-400" />
                      {u}
                    </button>
                  ))}
                </div>
              )}
              {inputText.length > 400 && (
                <span className="text-white/20 text-[10px]">{inputText.length}/500</span>
              )}
            </div>
            <button
              onClick={() => setShowSignalModal(true)}
              className="w-9 h-9 bg-emerald-600/80 hover:bg-emerald-600 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
              title="Send signal"
            >
              <TrendingUp size={14} className="text-white" />
            </button>
            <button
              onClick={sendMessage}
              disabled={!inputText.trim() || sending}
              className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            >
              {sending ? (
                <Loader size={14} className="animate-spin text-white" />
              ) : (
                <Send size={14} className="text-white" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Signal Modal */}
      {showSignalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Zap size={16} className="text-yellow-400" />
                Trading Signal
              </h3>
              <button onClick={() => setShowSignalModal(false)} className="text-white/40 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(['buy','sell','hold'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setSignalData(prev => ({ ...prev, direction: d }))}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      signalData.direction === d
                        ? d === 'buy' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          d === 'sell' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-[#1a1a1a] text-white/40 border border-[#2a2a2a]'
                    }`}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>

              <input
                placeholder="Symbol (BTC, ETH...)"
                value={signalData.symbol}
                onChange={e => setSignalData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/40"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Entry"
                  value={signalData.entryPrice}
                  onChange={e => setSignalData(prev => ({ ...prev, entryPrice: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/40"
                />
                <input
                  type="number"
                  placeholder="Target"
                  value={signalData.targetPrice}
                  onChange={e => setSignalData(prev => ({ ...prev, targetPrice: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/40"
                />
                <input
                  type="number"
                  placeholder="Stop"
                  value={signalData.stopLoss}
                  onChange={e => setSignalData(prev => ({ ...prev, stopLoss: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/40"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-xs">Confidence</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={signalData.confidence}
                  onChange={e => setSignalData(prev => ({ ...prev, confidence: parseInt(e.target.value) }))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-emerald-400 text-xs font-mono w-8">{signalData.confidence}%</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowSignalModal(false)}
                className="flex-1 py-2 bg-[#1a1a1a] text-white/60 rounded-lg text-sm hover:bg-[#2a2a2a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendSignal}
                disabled={!signalData.symbol}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Send Signal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
