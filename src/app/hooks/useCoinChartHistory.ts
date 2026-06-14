import { useState, useEffect } from "react";
import { resolveCoinGeckoUrl } from "../utils/coingecko";

export type ChartPoint = { timestamp: number; price: number; time: string };

const BINANCE_PAIR: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  BNB: "BNBUSDT",
  SOL: "SOLUSDT",
  XRP: "XRPUSDT",
  DOGE: "DOGEUSDT",
  ADA: "ADAUSDT",
  AVAX: "AVAXUSDT",
  LINK: "LINKUSDT",
  DOT: "DOTUSDT",
  MATIC: "MATICUSDT",
  UNI: "UNIUSDT",
};

function binanceKlineParams(days: number): { interval: string; limit: number } {
  if (days <= 1) return { interval: "1h", limit: 24 };
  if (days <= 7) return { interval: "4h", limit: 48 };
  if (days <= 30) return { interval: "1d", limit: Math.min(30, days + 2) };
  return { interval: "1d", limit: Math.min(90, days + 5) };
}

function formatTimeLabel(ts: number, days: number): string {
  const d = new Date(ts);
  if (days <= 1) {
    return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

function samplePoints(raw: ChartPoint[], maxPoints: number): ChartPoint[] {
  if (raw.length <= maxPoints) return raw;
  const step = Math.ceil(raw.length / maxPoints);
  return raw.filter((_, i) => i % step === 0 || i === raw.length - 1);
}

async function fetchCoinGecko(
  coinId: string,
  days: number,
  maxPoints: number
): Promise<ChartPoint[] | null> {
  const url = resolveCoinGeckoUrl(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
    coinId
  )}/market_chart?vs_currency=usd&days=${days}&precision=full`);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url);
      if (r.status === 429) {
        await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
        continue;
      }
      if (!r.ok) return null;
      const j = (await r.json()) as { prices?: [number, number][] };
      const prices = j.prices;
      if (!Array.isArray(prices) || prices.length === 0) return null;
      const pts: ChartPoint[] = prices.map(([timestamp, price]) => ({
        timestamp,
        price: Number(price),
        time: formatTimeLabel(timestamp, days),
      }));
      return samplePoints(pts, maxPoints);
    } catch {
      return null;
    }
  }
  return null;
}

async function fetchBinance(
  symbol: string,
  days: number,
  maxPoints: number
): Promise<ChartPoint[] | null> {
  const pair = BINANCE_PAIR[symbol.toUpperCase()];
  if (!pair) return null;
  const { interval, limit } = binanceKlineParams(days);
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;

  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const rows = (await r.json()) as unknown[][];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const pts: ChartPoint[] = rows.map((row) => {
      const openTime = Number(row[0]);
      const close = Number(row[4]);
      return {
        timestamp: openTime,
        price: close,
        time: formatTimeLabel(openTime, days),
      };
    });
    return samplePoints(pts, maxPoints);
  } catch {
    return null;
  }
}

export async function loadChartHistory(
  coinId: string,
  symbol: string,
  days: number,
  maxPoints = 220
): Promise<{ points: ChartPoint[]; source: "coingecko" | "binance" } | null> {
  const cg = await fetchCoinGecko(coinId, days, maxPoints);
  if (cg && cg.length >= 2) {
    return { points: cg, source: "coingecko" };
  }
  const bn = await fetchBinance(symbol, days, maxPoints);
  if (bn && bn.length >= 2) {
    return { points: bn, source: "binance" };
  }
  return null;
}

export function useCoinChartHistory(
  coinId: string | undefined,
  symbol: string,
  days: number,
  maxPoints = 220
) {
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"coingecko" | "binance" | null>(null);

  useEffect(() => {
    if (!coinId || !symbol) {
      setPoints([]);
      setError(null);
      setSource(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadChartHistory(coinId, symbol, days, maxPoints).then((res) => {
      if (cancelled) return;
      if (!res) {
        setPoints([]);
        setSource(null);
        setError(
          "Данные графика временно недоступны. Попробуйте другой период или зайдите позже."
        );
      } else {
        setPoints(res.points);
        setSource(res.source);
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [coinId, symbol, days, maxPoints]);

  return { points, loading, error, source };
}
