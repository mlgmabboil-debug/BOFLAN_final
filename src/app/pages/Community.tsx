import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { GroupChat } from "../components/GroupChat";
import { GroupChannel } from "../components/GroupChannel";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { useUser } from "../context/UserContext";
import { useMarketPrices, formatPrice, getPrice } from "../hooks/useMarketPrices";
import { useGroupsCatalog } from "../hooks/useGroupsCatalog";
import { useGroupSubscriptions } from "../hooks/useGroupSubscriptions";
import { getLimitedContentCutoffTs } from "../utils/groupSubscriptionsStore";
import { Crown, MessageCircle, Search, Users, ExternalLink, Megaphone } from "lucide-react";
import { motion } from "motion/react";

function getEthAmountFromPrice(priceLabel: string): number | null {
  const match = priceLabel.match(/([0-9]+(?:[.,][0-9]+)?)\s*ETH/i);
  if (!match) return null;
  return Number(match[1].replace(",", "."));
}

export function Community() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { groups } = useGroupsCatalog();
  const { getFor } = useGroupSubscriptions();
  const { allPrices } = useMarketPrices();
  const ethUsd = getPrice("ETH", allPrices)?.current_price ?? null;

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"channel" | "chat">("channel");
  const [mobileActiveView, setMobileActiveView] = useState<"list" | "chat">("list");

  const groupIdParam = searchParams.get("group") || "";
  const active = groups.find((g) => g.id === groupIdParam) ?? null;

  useEffect(() => {
    if (groups.length === 0) return;
    const gid = searchParams.get("group");
    if (!gid || !groups.some((g) => g.id === gid)) {
      setSearchParams({ group: groups[0].id }, { replace: true });
    }
  }, [groups, searchParams, setSearchParams]);

  useEffect(() => {
    setTab("channel");
  }, [groupIdParam]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.owner.username.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [groups, query]);

  const selectGroup = (id: string) => {
    setSearchParams({ group: id });
    setMobileActiveView("chat");
  };

  const isOwner =
    !!user && !!active && user.id === active.owner.id;
  const sub = user && active ? getFor(user.id, active.id) : null;
  const limitedAccess =
    !isOwner &&
    !!user &&
    !user.isGuest &&
    !!active?.premium &&
    sub?.phase === "pending_creator_payout";
  const recentCutoff = limitedAccess ? getLimitedContentCutoffTs() : null;
  const accessNotice = limitedAccess
    ? "Ограниченный доступ: видны посты и сообщения не старше 7 дней. Полный доступ — после перевода ETH автору (шаг 2 в «Группах», не раньше чем через 24 ч с комиссии платформы)."
    : null;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 py-4 flex flex-col min-h-0 flex-1">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h1 className="text-white text-xl font-semibold tracking-tight mb-1">Сообщества</h1>
          <p className="text-white/45 text-sm">Канал и чат выбранной группы</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/groups")}
          className="text-xs text-blue-400/90 hover:text-blue-300 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] backdrop-blur-md"
        >
          <ExternalLink size={12} />
          Каталог групп
        </button>
      </div>

      <div className="flex flex-1 min-h-[520px] rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/80 backdrop-blur-2xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
        <aside className={`w-full sm:w-[300px] lg:w-[320px] flex-col border-r border-white/[0.06] bg-black/40 backdrop-blur-xl flex-shrink-0 ${
          mobileActiveView === "chat" ? "hidden sm:flex" : "flex"
        }`}>
          <div className="p-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 bg-white/[0.05] rounded-xl px-3 py-2 border border-white/[0.06]">
              <Search size={14} className="text-white/35 flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск…"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="p-4 text-white/30 text-xs leading-relaxed">
                Нет групп. Добавьте их в разделе «Группы».
              </div>
            ) : (
              filtered.map((g) => {
                const ethAmt = getEthAmountFromPrice(g.price);
                const usd =
                  g.usdtPerMonth != null
                    ? formatPrice(g.usdtPerMonth)
                    : g.premium && ethAmt != null && ethUsd != null
                      ? formatPrice(ethAmt * ethUsd)
                      : g.premium
                        ? g.priceUsd
                        : "—";
                const sel = g.id === active?.id;
                return (
                  <motion.button
                    key={g.id}
                    type="button"
                    layout
                    onClick={() => selectGroup(g.id)}
                    className={`w-full text-left px-3 py-3 flex gap-3 border-b border-white/[0.04] transition-colors ${
                      sel ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <img
                      src={g.owner.avatar}
                      alt=""
                      className="w-11 h-11 rounded-2xl object-cover border border-white/[0.08] flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-sm font-medium truncate">{g.name}</span>
                        {g.premium && <Crown size={12} className="text-amber-400 flex-shrink-0" />}
                      </div>
                      <div className="text-white/35 text-[11px] truncate">@{g.owner.username}</div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40">
                        <span className="inline-flex items-center gap-0.5">
                          <Users size={10} />
                          {g.members}/{g.maxMembers}
                        </span>
                        {g.premium && <span className="font-mono text-emerald-400/80">{usd}/мес</span>}
                      </div>
                    </div>
                    {sel && <MessageCircle size={14} className="text-blue-400 flex-shrink-0 mt-1" />}
                  </motion.button>
                );
              })
            )}
          </div>
        </aside>

        <section className={`flex-1 flex-col min-w-0 min-h-[480px] bg-[#080808]/60 ${
          mobileActiveView === "list" ? "hidden sm:flex" : "flex"
        }`}>
          {groups.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/35 text-sm px-6 text-center gap-3">
              <p>Здесь появятся канал и чат после создания группы.</p>
              <button
                type="button"
                onClick={() => navigate("/groups")}
                className="text-blue-400/90 text-sm hover:underline"
              >
                Перейти в «Группы»
              </button>
            </div>
          ) : active ? (
            <>
              <header className="flex flex-col gap-3 px-4 py-3 border-b border-white/[0.06] bg-black/30 backdrop-blur-xl flex-shrink-0">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileActiveView("list")}
                    className="sm:hidden text-blue-400 hover:text-blue-300 flex items-center gap-1 mr-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs flex-shrink-0"
                  >
                    ← Назад
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-white font-semibold text-sm truncate">{active.name}</h2>
                      {active.premium && <Crown size={14} className="text-amber-400" />}
                      {active.owner.verified && (
                        <VerifiedBadge size="sm" exchange={active.owner.exchange} />
                      )}
                    </div>
                    <div className="text-white/40 text-xs flex items-center gap-2 flex-wrap">
                      <span>@{active.owner.username}</span>
                      <span className="text-white/20">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Users size={11} />
                        {active.members}/{active.maxMembers}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex rounded-xl bg-black/40 p-0.5 border border-white/[0.06] w-full max-w-md">
                  <button
                    type="button"
                    onClick={() => setTab("channel")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      tab === "channel" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <Megaphone size={13} />
                    Канал
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("chat")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      tab === "chat" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <MessageCircle size={13} />
                    Чат
                  </button>
                </div>
              </header>
              <div className="flex-1 min-h-0 flex flex-col">
                {tab === "channel" ? (
                  <GroupChannel
                    groupId={active.id}
                    ownerUserId={active.owner.id}
                    ownerUsername={active.owner.username}
                    ownerAvatar={active.owner.avatar}
                    recentContentCutoffTs={recentCutoff}
                    accessNotice={accessNotice}
                  />
                ) : (
                  <GroupChat
                    groupId={active.id}
                    groupName={active.name}
                    embedded
                    recentContentCutoffTs={recentCutoff}
                    accessNotice={accessNotice}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Выберите группу</div>
          )}
        </section>
      </div>
    </div>
  );
}
