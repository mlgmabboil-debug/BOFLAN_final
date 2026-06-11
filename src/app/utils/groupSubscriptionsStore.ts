export type GroupSubscriptionPhase = "pending_creator_payout" | "active";

/** Подписка на группу: ETH автору откладывается на 24 ч после оплаты комиссии платформы. */
export type GroupSubscriptionRecord = {
  userId: string;
  groupId: string;
  subscribedAt: number;
  phase: GroupSubscriptionPhase;
  /** Когда можно отправить ETH автору (ms). */
  creatorUnlockAt: number;
  pendingCreatorWei: string;
  creatorAddr: string;
  platformFeePaidAt?: number;
  creatorPaidAt?: number;
};

const STORAGE_KEY = "boflan_group_subs_v1";

let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeGroupSubscriptions(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export function readGroupSubscriptions(): GroupSubscriptionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    const out: GroupSubscriptionRecord[] = [];
    for (const item of j) {
      if (!isRecord(item)) continue;
      const userId = typeof item.userId === "string" ? item.userId.replace(/[^\w-]/g, "").slice(0, 80) : "";
      const groupId = typeof item.groupId === "string" ? item.groupId.replace(/[^\w-]/g, "").slice(0, 80) : "";
      const wei = typeof item.pendingCreatorWei === "string" ? item.pendingCreatorWei.replace(/\D/g, "") : "";
      const addr = typeof item.creatorAddr === "string" ? item.creatorAddr.trim().slice(0, 128) : "";
      if (!userId || !groupId || !wei || !/^0x[a-fA-F0-9]{40}$/i.test(addr)) continue;
      const phase = item.phase === "active" ? "active" : "pending_creator_payout";
      out.push({
        userId,
        groupId,
        subscribedAt: Math.max(0, Number(item.subscribedAt) || 0),
        phase,
        creatorUnlockAt: Math.max(0, Number(item.creatorUnlockAt) || 0),
        pendingCreatorWei: wei.slice(0, 100),
        creatorAddr: addr,
        platformFeePaidAt: item.platformFeePaidAt != null ? Number(item.platformFeePaidAt) : undefined,
        creatorPaidAt: item.creatorPaidAt != null ? Number(item.creatorPaidAt) : undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function writeGroupSubscriptions(next: GroupSubscriptionRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

export function getGroupSubscription(
  userId: string | undefined,
  groupId: string
): GroupSubscriptionRecord | null {
  if (!userId) return null;
  return readGroupSubscriptions().find((s) => s.userId === userId && s.groupId === groupId) ?? null;
}

export function upsertGroupSubscription(rec: GroupSubscriptionRecord) {
  const cur = readGroupSubscriptions().filter((s) => !(s.userId === rec.userId && s.groupId === rec.groupId));
  cur.push(rec);
  writeGroupSubscriptions(cur);
}

export function markCreatorPayoutDone(userId: string, groupId: string) {
  const cur = readGroupSubscriptions().map((s) =>
    s.userId === userId && s.groupId === groupId
      ? { ...s, phase: "active" as const, creatorPaidAt: Date.now() }
      : s
  );
  writeGroupSubscriptions(cur);
}

/** Окно контента при ожидании выплаты: только за последние 7 суток. */
export const LIMITED_CONTENT_MS = 7 * 24 * 60 * 60 * 1000;

export function getLimitedContentCutoffTs(): number {
  return Date.now() - LIMITED_CONTENT_MS;
}
