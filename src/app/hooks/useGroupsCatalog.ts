import { useCallback, useEffect, useState } from "react";
import type { GroupListing } from "../data/mockData";

const STORAGE_KEY = "boflan_groups_catalog_v1";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function parseCatalog(raw: string | null): GroupListing[] {
  if (!raw) return [];
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    const out: GroupListing[] = [];
    for (const item of j) {
      if (!isRecord(item)) continue;
      const owner = item.owner;
      if (!isRecord(owner)) continue;
      const id = typeof item.id === "string" ? item.id.replace(/[^\w-]/g, "").slice(0, 80) : "";
      const name = typeof item.name === "string" ? item.name.slice(0, 200) : "";
      if (!id || !name) continue;
      const oid = typeof owner.id === "string" ? owner.id.replace(/[^\w-]/g, "").slice(0, 80) : "";
      const ouser = typeof owner.username === "string" ? owner.username.slice(0, 64) : "";
      if (!oid || !ouser) continue;
      const usdt =
        typeof item.usdtPerMonth === "number" && Number.isFinite(item.usdtPerMonth)
          ? Math.max(0, item.usdtPerMonth)
          : undefined;
      out.push({
        id,
        name,
        description: typeof item.description === "string" ? item.description.slice(0, 2000) : "",
        owner: {
          id: oid,
          username: ouser,
          displayName:
            typeof owner.displayName === "string" ? owner.displayName.slice(0, 128) : ouser,
          avatar: typeof owner.avatar === "string" ? owner.avatar.slice(0, 2048) : "",
          verified: Boolean(owner.verified),
          exchange: typeof owner.exchange === "string" ? owner.exchange.slice(0, 32) : undefined,
        },
        creatorPayoutEth:
          typeof item.creatorPayoutEth === "string" ? item.creatorPayoutEth.slice(0, 128) : undefined,
        price: typeof item.price === "string" ? item.price.slice(0, 64) : "Бесплатно",
        priceUsd: typeof item.priceUsd === "string" ? item.priceUsd.slice(0, 32) : "—",
        members: Math.max(0, Math.floor(Number(item.members)) || 0),
        maxMembers: Math.max(1, Math.min(1_000_000, Math.floor(Number(item.maxMembers)) || 1000)),
        tags: Array.isArray(item.tags)
          ? item.tags.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 32))
          : [],
        joined: Boolean(item.joined),
        premium: Boolean(item.premium),
        usdtPerMonth: usdt,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function read(): GroupListing[] {
  if (typeof window === "undefined") return [];
  return parseCatalog(localStorage.getItem(STORAGE_KEY));
}

function write(next: GroupListing[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function useGroupsCatalog() {
  const [groups, setGroupsState] = useState<GroupListing[]>(read);

  useEffect(() => {
    setGroupsState(read());
  }, []);

  const setGroups = useCallback((next: GroupListing[]) => {
    write(next);
    setGroupsState(next);
  }, []);

  const addGroup = useCallback((g: GroupListing) => {
    setGroupsState((prev) => {
      const next = [g, ...prev.filter((x) => x.id !== g.id)];
      write(next);
      return next;
    });
  }, []);

  const updateGroup = useCallback((id: string, patch: Partial<GroupListing>) => {
    setGroupsState((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, ...patch } : x));
      write(next);
      return next;
    });
  }, []);

  return { groups, setGroups, addGroup, updateGroup };
}
