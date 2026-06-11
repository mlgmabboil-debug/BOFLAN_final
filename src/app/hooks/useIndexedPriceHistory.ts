import { useState, useEffect } from "react";
import { COIN_MAP } from "./useMarketPrices";

export type IndexedPoint = { label: string; value: number; price: number };

const cache = new Map<string, { ts: number; data: IndexedPoint[] }>();
const TTL = 120_000;

function monthLabelRu(ms: number): string {
  return new Date(ms).toLocaleDateString("ru", { month: "short" }).replace(".", "");
}

/**
 * История цены с CoinGecko, нормализованная к индексу 100 в первой точке (как PnL-шкала).
 */
export function useIndexedPriceHistory(
  symbol: string | undefined,
  days: number,
  bucketCount: number
): { data: IndexedPoint[]; loading: boolean; error: string | null } {
  const [data, setData] = useState<IndexedPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const symUpper = symbol ? symbol.toUpperCase() : "";
  const id = (symbol && symUpper in COIN_MAP) ? COIN_MAP[symUpper as keyof typeof COIN_MAP] : undefined;
  const key = id ? `${id}:${days}:${bucketCount}` : "";

  useEffect(() => {
    if (!id) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < TTL) {
      setData(hit.data);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { prices?: [number, number][] }) => {
        const prices = j.prices || [];
        if (prices.length < 2) throw new Error("Мало данных");

        const bucketSize = Math.max(1, Math.floor(prices.length / bucketCount));
        const buckets: [number, number][][] = [];
        for (let i = 0; i < prices.length; i += bucketSize) {
          buckets.push(prices.slice(i, i + bucketSize));
        }
        const sampled = buckets
          .filter((b) => b.length)
          .map((b) => b[b.length - 1])
          .slice(-bucketCount);

        const base = sampled[0]?.[1] ?? 1;
        const out: IndexedPoint[] = sampled.map(([ts, p]) => {
          const price = Number(p);
          return {
            label: monthLabelRu(ts),
            value: (price / base) * 100,
            price,
          };
        });

        if (cancelled) return;
        cache.set(key, { ts: Date.now(), data: out });
        setData(out);
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setData([]);
          setError(e.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, days, bucketCount, key]);

  return { data, loading, error };
}
