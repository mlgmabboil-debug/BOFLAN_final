import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { GroupListing } from "../data/mockData";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { useUser } from "../context/UserContext";
import { useMarketPrices, formatPrice, getPrice } from "../hooks/useMarketPrices";
import { useWeb3Wallet } from "../hooks/useWeb3Wallet";
import { useGroupsCatalog } from "../hooks/useGroupsCatalog";
import { useGroupSubscriptions } from "../hooks/useGroupSubscriptions";
import { PLATFORM_FEE_PCT, PLATFORM_TREASURY_TRON } from "../constants/platform";
import { sendPlatformFeeUsdtTrc20, hasTronLink } from "../utils/tronPlatformFee";
import { sanitizeEthAddress } from "../utils/sanitize";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock, Users, TrendingUp, Plus, Crown, CheckCircle, X,
  MessageCircle, UserCircle, Loader, AlertTriangle,
} from "lucide-react";

function getEthAmountFromPrice(priceLabel: string): number | null {
  const match = priceLabel.match(/([0-9]+(?:[.,][0-9]+)?)\s*ETH/i);
  if (!match) return null;
  return Number(match[1].replace(",", "."));
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "можно отправлять";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин ${sec} с`;
  return `${sec} с`;
}

function GroupCard({
  group,
  walletConnected,
  ethUsd,
  onJoinedChange,
}: {
  group: GroupListing;
  walletConnected: boolean;
  ethUsd: number | null;
  onJoinedChange: (id: string, joined: boolean) => void;
}) {
  const { user } = useUser();
  const navigate = useNavigate();
  const { connect } = useWeb3Wallet();
  const { getFor, upsert, completeCreator } = useGroupSubscriptions();
  const sub = user ? getFor(user.id, group.id) : null;

  const [joined, setJoined] = useState(group.joined);
  useEffect(() => {
    setJoined(group.joined);
  }, [group.id, group.joined]);

  const [showModal, setShowModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [payRulesAccepted, setPayRulesAccepted] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (!showModal) {
      setPayRulesAccepted(false);
      setPayError(null);
    }
  }, [showModal]);

  useEffect(() => {
    if (!sub || sub.phase !== "pending_creator_payout") return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sub]);

  const ethAmount = getEthAmountFromPrice(group.price);
  const grossUsdNum =
    group.usdtPerMonth != null
      ? group.usdtPerMonth
      : ethAmount != null && ethUsd != null
        ? ethAmount * ethUsd
        : null;
  const platformUsdNum = grossUsdNum != null ? grossUsdNum * (PLATFORM_FEE_PCT / 100) : null;
  const creatorUsdNum = grossUsdNum != null ? grossUsdNum * (1 - PLATFORM_FEE_PCT / 100) : null;

  const payEthFull: number | null =
    group.usdtPerMonth != null && ethUsd != null && ethUsd > 0
      ? group.usdtPerMonth / ethUsd
      : ethAmount;

  const creatorAddrResolved = sanitizeEthAddress(group.creatorPayoutEth || "") || "";

  const openMessenger = () => navigate(`/community?group=${encodeURIComponent(group.id)}`);

  const handleJoin = () => {
    if (group.premium) {
      setShowModal(true);
      return;
    }
    const next = !joined;
    setJoined(next);
    onJoinedChange(group.id, next);
  };

  /** Шаг 1: только USDT на казну; ETH автору — через 24 ч (шаг 2). */
  const startPremiumPayment = async () => {
    if (!user || user.isGuest) return;
    if (!payRulesAccepted) {
      setPayError("Подтвердите условия оплаты.");
      return;
    }
    if (
      !window.confirm(
        "Списать комиссию платформы в USDT (Tron) и вступить в группу? Перевод ETH автору будет доступен через 24 часа."
      )
    ) {
      return;
    }

    if (!walletConnected) {
      await connect();
      setPayError("Подключите EVM-кошелёк и повторите шаг.");
      return;
    }

    if (payEthFull == null || payEthFull <= 0) {
      setPayError("Не удалось определить сумму оплаты.");
      return;
    }

    if (!creatorAddrResolved) {
      setPayError("У группы не указан адрес ETH для выплат. Попросите владельца обновить настройки.");
      return;
    }

    if (!window.ethereum) {
      setPayError("Нужен Ethereum-кошелёк (MetaMask и др.) для второго шага.");
      return;
    }

    if (!hasTronLink()) {
      setPayError(
        "Установите TronLink для комиссии BOFLAN в USDT (TRC20). ETH автору вы отправите на шаге 2 через 24 ч."
      );
      return;
    }

    if (grossUsdNum == null || platformUsdNum == null) {
      setPayError("Не удалось оценить сумму в USD. Подождите загрузки курса ETH.");
      return;
    }

    const weiTotal = BigInt(Math.floor(payEthFull * 1e18));
    const creatorWei = (weiTotal * BigInt(100 - PLATFORM_FEE_PCT)) / 100n;
    if (creatorWei <= 0n) {
      setPayError("Некорректная сумма для выплаты автору.");
      return;
    }

    const unlockAt = Date.now() + 24 * 60 * 60 * 1000;

    setPaying(true);
    setPayError(null);
    try {
      await sendPlatformFeeUsdtTrc20(platformUsdNum);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка USDT (комиссия BOFLAN)";
      setPayError(msg);
      setPaying(false);
      return;
    }

    upsert({
      userId: user.id,
      groupId: group.id,
      subscribedAt: Date.now(),
      phase: "pending_creator_payout",
      creatorUnlockAt: unlockAt,
      pendingCreatorWei: creatorWei.toString(),
      creatorAddr: creatorAddrResolved,
      platformFeePaidAt: Date.now(),
    });

    setJoined(true);
    onJoinedChange(group.id, true);
    setTxHash(null);
    setShowModal(false);
    setPaying(false);
  };

  const sendDeferredEth = async () => {
    if (!user || !sub || sub.phase !== "pending_creator_payout") return;
    if (Date.now() < sub.creatorUnlockAt) {
      setPayError("Перевод ETH автору будет доступен после окончания периода удержания.");
      return;
    }
    if (!window.confirm("Отправить ETH на адрес владельца группы? Проверьте сумму в кошельке.")) return;

    if (!window.ethereum) {
      setPayError("Ethereum-кошелёк не найден.");
      return;
    }

    setPaying(true);
    setPayError(null);
    try {
      const [from] = (await (window as any).ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (!from) throw new Error("Кошелёк не подключён.");

      const wei = BigInt(sub.pendingCreatorWei);
      const tx = (await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: sub.creatorAddr,
            value: `0x${wei.toString(16)}`,
          },
        ],
      })) as string;

      setTxHash(tx);
      completeCreator(user.id, group.id);
      setShowModal(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка перевода ETH";
      setPayError(msg);
    } finally {
      setPaying(false);
    }
  };

  const pending = sub?.phase === "pending_creator_payout";
  const canSendEth = pending && nowTick >= (sub?.creatorUnlockAt ?? 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-5 hover:border-[#2a2a2a] transition-colors"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <img
              src={group.owner.avatar}
              alt={group.owner.displayName}
              className="w-11 h-11 rounded-full object-cover border border-[#2a2a2a] flex-shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{group.name}</span>
                {group.premium && <Crown size={13} className="text-yellow-400" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-white/40 text-xs">@{group.owner.username}</span>
                {group.owner.verified && <VerifiedBadge size="sm" />}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-white font-semibold text-sm">{group.price}</div>
            {group.premium && <div className="text-white/30 text-xs">{group.priceUsd}</div>}
          </div>
        </div>

        <p className="text-white/60 text-sm leading-relaxed mb-4">{group.description}</p>

        {group.tags.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {group.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-[#1a1a1a] text-white/50 px-2 py-0.5 rounded-sm border border-[#2a2a2a]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {joined && pending && (
          <div className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-amber-200/90 text-[11px] leading-relaxed flex gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-100/95 mb-1">Подписка: удержание 24 ч</p>
              <p>
                Комиссия платформы списана. Перевод ETH владельцу — через{" "}
                {canSendEth ? (
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="text-blue-300 underline hover:text-blue-200"
                  >
                    завершите шаг 2
                  </button>
                ) : (
                  <span className="font-mono">{formatCountdown((sub?.creatorUnlockAt ?? 0) - nowTick)}</span>
                )}
                . До этого в сообществах видна история не глубже 7 дней.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleJoin}
            className={`flex-1 py-2.5 rounded-sm text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              joined
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                : group.premium
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-[#1e1e1e] text-white/70 hover:bg-[#252525]"
            }`}
          >
            {joined ? (
              <>
                <CheckCircle size={14} /> Вы участник
              </>
            ) : group.premium ? (
              <>
                <Lock size={14} /> Вступить · {group.priceUsd}/мес.
              </>
            ) : (
              <>
                <Users size={14} /> Вступить бесплатно
              </>
            )}
          </button>

          <button
            type="button"
            onClick={openMessenger}
            className="px-3 py-2.5 bg-[#1a1a1a] hover:bg-[#222] text-white/50 hover:text-blue-400 border border-[#2a2a2a] hover:border-blue-500/30 rounded-sm transition-all flex items-center gap-1.5 text-sm"
          >
            <MessageCircle size={14} />
            <span className="hidden sm:inline">Сообщества</span>
          </button>
        </div>

        {joined && pending && canSendEth && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-2 w-full py-2 rounded-sm text-xs font-medium bg-blue-600/90 hover:bg-blue-600 text-white"
          >
            Шаг 2: отправить ETH владельцу
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-semibold">
                  {joined && group.premium && !pending
                    ? "Подписка активна"
                    : pending && canSendEth
                      ? "Шаг 2: ETH владельцу"
                      : pending
                        ? "Подписка: ожидание"
                        : "Подписка на группу"}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <img src={group.owner.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <div className="text-white font-medium">{group.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/40 text-xs">@{group.owner.username}</span>
                    {group.owner.verified && <VerifiedBadge size="sm" />}
                  </div>
                </div>
              </div>

              {joined && group.premium && !pending ? (
                <p className="text-white/50 text-sm leading-relaxed">
                  У вас полный доступ к каналу и чату. Отмена подписки по согласованию с автором.
                </p>
              ) : pending && canSendEth ? (
                <>
                  <p className="text-white/50 text-xs mb-4 leading-relaxed">
                    Период удержания истёк. Подтвердите перевод ETH на адрес владельца (сумма — доля автору после
                    комиссии платформы).
                  </p>
                  {payError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded p-2.5 mb-3">
                      {payError}
                    </div>
                  )}
                  {txHash && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded p-2.5 mb-3 font-mono break-all">
                      TX: {txHash}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={sendDeferredEth}
                    disabled={paying}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {paying ? <Loader size={14} className="animate-spin" /> : null}
                    Отправить ETH автору
                  </button>
                </>
              ) : pending && !canSendEth ? (
                <p className="text-white/50 text-sm">
                  До перевода ETH автору осталось:{" "}
                  <span className="text-white font-mono">
                    {formatCountdown((sub?.creatorUnlockAt ?? 0) - nowTick)}
                  </span>
                </p>
              ) : (
                <>
                  <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Подписка</span>
                      <span className="text-white">{group.price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">В USD</span>
                      <span className="text-white font-mono">{group.priceUsd}</span>
                    </div>
                    {grossUsdNum != null && platformUsdNum != null && creatorUsdNum != null && (
                      <>
                        <div className="border-t border-[#2a2a2a] pt-2 flex justify-between text-sm">
                          <span className="text-white/40">Сумма (gross)</span>
                          <span className="text-white font-mono text-xs">{formatPrice(grossUsdNum)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/40">Комиссия BOFLAN ({PLATFORM_FEE_PCT}%)</span>
                          <span className="text-amber-400/90 font-mono text-xs">{formatPrice(platformUsdNum)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/40">Автору ({100 - PLATFORM_FEE_PCT}%)</span>
                          <span className="text-emerald-400/90 font-mono text-xs">{formatPrice(creatorUsdNum)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/20 rounded p-3 mb-4 space-y-2">
                    <p className="text-blue-400/80 text-xs leading-relaxed">
                      <span className="font-semibold text-white/90">Шаг 1:</span> {PLATFORM_FEE_PCT}% — в{" "}
                      <span className="text-white/90">USDT (TRC20)</span> на казну BOFLAN (
                      <span className="font-mono text-[10px] break-all">{PLATFORM_TREASURY_TRON}</span>
                      ).<br />
                      <span className="font-semibold text-white/90">Шаг 2:</span> через 24 ч — перевод ETH автору из
                      вашего EVM-кошелька. До шага 2 в чатах и канале доступна история не глубже 7 дней.
                    </p>
                  </div>

                  <label className="flex items-start gap-2 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payRulesAccepted}
                      onChange={(e) => setPayRulesAccepted(e.target.checked)}
                      className="mt-1 rounded border-[#2a2a2a]"
                    />
                    <span className="text-white/45 text-[11px] leading-relaxed">
                      Понимаю порядок оплаты: сначала комиссия в USDT (Tron), затем не раньше чем через 24 ч — ETH автору;
                      ограничение контента 7 дней до завершения ETH.
                    </span>
                  </label>

                  {payError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded p-2.5 mb-3">
                      {payError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={startPremiumPayment}
                    disabled={paying || !payRulesAccepted}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {paying ? <Loader size={14} className="animate-spin" /> : null}
                    Шаг 1: оплатить комиссию и вступить
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function Groups() {
  const { user } = useUser();
  const { state: wallet } = useWeb3Wallet();
  const { allPrices } = useMarketPrices();
  const ethPrice = getPrice("ETH", allPrices)?.current_price ?? null;
  const navigate = useNavigate();
  const { groups, addGroup, updateGroup } = useGroupsCatalog();
  const { subs } = useGroupSubscriptions();

  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupPrice, setGroupPrice] = useState("");
  const [groupMax, setGroupMax] = useState("");
  const [groupTags, setGroupTags] = useState("");
  const [creatorPayoutEth, setCreatorPayoutEth] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const groupsWithLivePrice = useMemo(() => {
    if (!ethPrice) return groups;
    return groups.map((group) => {
      if (group.usdtPerMonth != null) {
        return { ...group, priceUsd: formatPrice(group.usdtPerMonth) };
      }
      const ethAmount = getEthAmountFromPrice(group.price);
      if (!ethAmount) return group;
      return { ...group, priceUsd: formatPrice(ethAmount * ethPrice) };
    });
  }, [groups, ethPrice]);

  const handleJoinedChange = (id: string, joined: boolean) => {
    updateGroup(id, { joined });
  };

  const pendingForUser = useMemo(() => {
    if (!user || user.isGuest) return [];
    return subs.filter((s) => s.userId === user.id && s.phase === "pending_creator_payout");
  }, [subs, user]);

  const handleCreateGroup = () => {
    setCreateError(null);
    if (!user || user.isGuest || !groupName.trim()) return;
    const priceNum = Math.max(0, Number(groupPrice) || 0);
    const maxM = Math.max(1, Math.min(100_000, Math.floor(Number(groupMax) || 1000)));
    const payout = sanitizeEthAddress(creatorPayoutEth);
    if (priceNum > 0 && !payout) {
      setCreateError("Для платной группы укажите ваш ETH-адрес для выплат (0x…).");
      return;
    }

    const tags = groupTags
      .split(/[,#\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);

    const id = `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    const row: GroupListing = {
      id,
      name: groupName.trim(),
      description: groupDesc.trim() || "Без описания.",
      owner: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        verified: user.verified,
        exchange: user.exchange,
      },
      creatorPayoutEth: payout || undefined,
      price: priceNum === 0 ? "Бесплатно" : `${priceNum} USDT / мес.`,
      priceUsd: priceNum === 0 ? "—" : formatPrice(priceNum),
      members: 0,
      maxMembers: maxM,
      tags,
      joined: false,
      premium: priceNum > 0,
      usdtPerMonth: priceNum > 0 ? priceNum : undefined,
    };
    addGroup(row);
    setGroupName("");
    setGroupDesc("");
    setGroupPrice("");
    setGroupMax("");
    setGroupTags("");
    setCreatorPayoutEth("");
    setShowCreate(false);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-semibold mb-1">Приватные группы</h1>
          <p className="text-white/40 text-sm">Закрытые сообщества и подписки авторов</p>
        </div>
        {user && !user.isGuest && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Создать группу
          </button>
        )}
        {user?.isGuest && (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400/70">
            <UserCircle size={13} />
            Войдите для создания групп
          </div>
        )}
      </div>

      {pendingForUser.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-amber-100/90 text-xs leading-relaxed">
          <span className="font-medium">Незавершённые подписки:</span> завершите перевод ETH владельцу по кнопке в
          карточке группы (доступно через 24 ч после комиссии в USDT).
        </div>
      )}

      <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Crown size={14} className="text-yellow-400" />
          <span className="text-white/60 text-xs">Платная группа требует ваш ETH-адрес для выплат</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-400" />
          <span className="text-white/60 text-xs">Комиссия {PLATFORM_FEE_PCT}% (USDT), затем ETH автору с задержкой 24 ч</span>
        </div>
      </div>

      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => navigate("/community")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1] backdrop-blur-xl transition-colors"
        >
          <MessageCircle size={15} className="text-blue-400" />
          Сообщества
        </button>
      </div>

      {groupsWithLivePrice.length === 0 ? (
        <div className="rounded-xl border border-[#1e1e1e] bg-[#111111] px-6 py-16 text-center text-white/35 text-sm">
          <p className="mb-2 text-white/50">Пока нет групп</p>
          <p className="text-white/30 max-w-md mx-auto">
            Создайте свою или дождитесь публикаций в каталоге.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {groupsWithLivePrice.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              walletConnected={!!wallet.account}
              ethUsd={ethPrice}
              onJoinedChange={handleJoinedChange}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-semibold">Создать группу</h3>
                <button type="button" onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-white/40 text-xs block mb-1.5">Название</label>
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Название"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 placeholder-white/20"
                  />
                </div>
                <div>
                  <label className="text-white/40 text-xs block mb-1.5">Описание</label>
                  <textarea
                    rows={3}
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Тема, правила, формат"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 placeholder-white/20 resize-none"
                  />
                </div>
                <div>
                  <label className="text-white/40 text-xs block mb-1.5">Теги (через запятую)</label>
                  <input
                    value={groupTags}
                    onChange={(e) => setGroupTags(e.target.value)}
                    placeholder="BTC, альты, DeFi"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 placeholder-white/20"
                  />
                </div>
                <div>
                  <label className="text-white/40 text-xs block mb-1.5">Цена (USDT/мес.)</label>
                  <div className="flex items-center gap-2">
                    <input
                      value={groupPrice}
                      onChange={(e) => setGroupPrice(e.target.value)}
                      placeholder="0"
                      type="number"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 placeholder-white/20"
                    />
                    <span className="text-white/40 text-sm whitespace-nowrap">USDT</span>
                  </div>
                  <p className="text-white/20 text-xs mt-1">0 — бесплатно</p>
                </div>
                <div>
                  <label className="text-white/40 text-xs block mb-1.5">
                    Ваш ETH-адрес для выплат{" "}
                    {Number(groupPrice) > 0 && <span className="text-amber-400/80">(обязательно)</span>}
                  </label>
                  <input
                    value={creatorPayoutEth}
                    onChange={(e) => setCreatorPayoutEth(e.target.value)}
                    placeholder="0x…"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2.5 text-white text-sm font-mono outline-none focus:border-blue-500/50 placeholder-white/20"
                  />
                </div>
                <div>
                  <label className="text-white/40 text-xs block mb-1.5">Лимит участников</label>
                  <input
                    value={groupMax}
                    onChange={(e) => setGroupMax(e.target.value)}
                    placeholder="1000"
                    type="number"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 placeholder-white/20"
                  />
                </div>
              </div>

              {createError && (
                <div className="text-red-400/90 text-xs mb-3">{createError}</div>
              )}

              <div className="bg-[#1a1a1a] rounded p-3 mb-4 text-xs text-white/40">
                Комиссия BOFLAN: <span className="text-white/60">{PLATFORM_FEE_PCT}%</span> с подписки. Подписчики
                отправляют ETH на указанный адрес (шаг 2, через 24 ч после USDT).
              </div>

              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={!groupName.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white rounded-sm font-medium transition-colors"
              >
                Создать группу
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
