import { useState, useEffect } from "react";
import { COIN_MAP } from "./useMarketPrices";

export type SparkPoint = { t: number; p: number };

const cache = new Map<string, { ts: number; data: SparkPoint[] }>();
const TTL = 90_000;

export function useCoinSparkline(symbol: string | undefined, maxPoints = 48): SparkPoint[] {
  const [data, setData] = useState<SparkPoint[]>([]);
  const symUpper = symbol ? symbol.toUpperCase() : "";
  const id = (symbol && symUpper in COIN_MAP) ? COIN_MAP[symUpper as keyof typeof COIN_MAP] : undefined;

  useEffect(() => {
    if (!id) {
      setData([]);
      return;
    }
    const hit = cache.get(id);
    if (hit && Date.now() - hit.ts < TTL) {
      setData(hit.data);
      return;
    }

    let cancelled = false;
    fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=1`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { prices?: [number, number][] }) => {
        const prices = j.prices || [];
        const step = Math.max(1, Math.floor(prices.length / maxPoints));
        const sampled: SparkPoint[] = prices
          .filter((_, i) => i % step === 0)
          .slice(-maxPoints)
          .map(([ts, p], i) => ({ t: i, p: Number(p) }));
        if (cancelled) return;
        cache.set(id, { ts: Date.now(), data: sampled });
        setData(sampled);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });

    return () => {
      cancelled = true;
    };
  }, [id, maxPoints]);

  return data;
}
