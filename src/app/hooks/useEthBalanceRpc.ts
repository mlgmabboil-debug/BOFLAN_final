import { useCallback, useEffect, useState } from "react";

const RPC_URL = "https://cloudflare-eth.com";

/** Баланс ETH по публичному адресу — без подключения кошелька (только чтение через публичный RPC). */
export async function fetchEthBalanceEth(address: string): Promise<number | null> {
  const a = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) return null;
  try {
    const r = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [a, "latest"],
        id: 1,
      }),
    });
    const j = (await r.json()) as { result?: string; error?: { message?: string } };
    if (j.error?.message || !j.result) return null;
    const wei = BigInt(j.result);
    return Number(wei) / 1e18;
  } catch {
    return null;
  }
}

export function useEthBalanceRpc(address: string | undefined) {
  const [eth, setEth] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
      setEth(null);
      setErr(null);
      return;
    }
    setLoading(true);
    setErr(null);
    const v = await fetchEthBalanceEth(address.trim());
    setLoading(false);
    if (v == null) {
      setEth(null);
      setErr("Не удалось получить баланс (сеть или CORS). Попробуйте позже.");
    } else {
      setEth(v);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ethBalance: eth, loading, error: err, refresh };
}
