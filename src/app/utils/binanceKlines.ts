import { projectId, publicAnonKey, isEdgeFunctionOnline } from "../../../utils/supabase/info";
import { COIN_MAP } from "../hooks/useMarketPrices";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6d3e2891`;

export type ChartTimeframe = "1h" | "4h" | "1d" | "1w" | "1m";

export interface OhlcvBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Binance иногда меняет тикеры (MATIC → POL и т.д.) */
const BINANCE_BASE_ALIASES: Record<string, string[]> = {
  MATIC: ["MATIC", "POL"],
};

const BINANCE_API_BASES = [
  "https://data-api.binance.vision/api/v3",
  "https://api.binance.com/api/v3",
] as const;

export function timeframeToKlineParams(tf: ChartTimeframe): { interval: string; limit: number } {
  switch (tf) {
    case "1h":
      return { interval: "1m", limit: 60 };
    case "4h":
      return { interval: "5m", limit: 48 };
    case "1d":
      return { interval: "15m", limit: 96 };
    case "1w":
      return { interval: "1h", limit: 168 };
    case "1m":
      return { interval: "4h", limit: 180 };
    default:
      return { interval: "15m", limit: 96 };
  }
}

function binancePairs(symbol: string): string[] {
  const base = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const bases = BINANCE_BASE_ALIASES[base] ?? [base];
  return bases.map((b) => `${b}USDT`);
}

function parseKlineRows(rows: unknown[][]): OhlcvBar[] {
  const seen = new Set<number>();
  const bars: OhlcvBar[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const time = Number(row[0]);
    if (!Number.isFinite(time) || seen.has(time)) continue;
    seen.add(time);
    bars.push({
      time,
      open: parseFloat(String(row[1])),
      high: parseFloat(String(row[2])),
      low: parseFloat(String(row[3])),
      close: parseFloat(String(row[4])),
      volume: parseFloat(String(row[5])),
    });
  }
  return bars.sort((a, b) => a.time - b.time);
}

async function fetchFromServer(
  symbol: string,
  interval: string,
  limit: number
): Promise<OhlcvBar[] | null> {
  const isSupabaseValid = projectId && !projectId.includes("undefined") && projectId !== "";
  if (!isSupabaseValid || !(await isEdgeFunctionOnline(API_BASE, publicAnonKey))) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const url = `${API_BASE}/market/klines/${encodeURIComponent(symbol)}?interval=${interval}&limit=${limit}`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!r.ok) return null;
    const j = (await r.json()) as { success?: boolean; data?: unknown[][] };
    if (!j.success || !Array.isArray(j.data)) return null;
    const bars = parseKlineRows(j.data);
    return bars.length >= 2 ? bars : null;
  } catch {
    return null;
  }
}

async function fetchFromBinance(
  symbol: string,
  interval: string,
  limit: number
): Promise<OhlcvBar[] | null> {
  for (const pair of binancePairs(symbol)) {
    for (const base of BINANCE_API_BASES) {
      try {
        const url = `${base}/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
        const r = await fetch(url);
        if (!r.ok) continue;
        const rows = (await r.json()) as unknown;
        if (!Array.isArray(rows)) continue;
        const bars = parseKlineRows(rows as unknown[][]);
        if (bars.length >= 2) return bars;
      } catch {
        /* try next endpoint */
      }
    }
  }
  return null;
}

function coinGeckoDays(tf: ChartTimeframe): number {
  if (tf === "1h" || tf === "4h") return 1;
  if (tf === "1d") return 7;
  if (tf === "1w") return 30;
  return 90;
}

async function fetchFromCoinGecko(
  symbol: string,
  timeframe: ChartTimeframe
): Promise<OhlcvBar[] | null> {
  const geckoId = COIN_MAP[symbol as keyof typeof COIN_MAP];
  if (!geckoId) return null;
  try {
    const days = coinGeckoDays(timeframe);
    const url = `https://api.coingecko.com/api/v3/coins/${geckoId}/ohlc?vs_currency=usd&days=${days}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const rows = (await r.json()) as unknown;
    if (!Array.isArray(rows)) return null;
    const bars: OhlcvBar[] = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 5) continue;
      bars.push({
        time: Number(row[0]),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: 0,
      });
    }
    return bars.length >= 2 ? bars.sort((a, b) => a.time - b.time) : null;
  } catch {
    return null;
  }
}

export async function fetchOhlcvBars(symbol: string, timeframe: ChartTimeframe): Promise<OhlcvBar[]> {
  const sym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!sym) {
    throw new Error("Не указан символ монеты");
  }

  const { interval, limit } = timeframeToKlineParams(timeframe);

  const fromServer = await fetchFromServer(sym, interval, limit);
  if (fromServer) return fromServer;

  const fromBinance = await fetchFromBinance(sym, interval, limit);
  if (fromBinance) return fromBinance;

  const fromGecko = await fetchFromCoinGecko(sym, timeframe);
  if (fromGecko) return fromGecko;

  throw new Error(
    "Не удалось загрузить свечи. Проверьте интернет или попробуйте BTC/ETH. " +
      "Если Binance недоступен в вашем регионе — данные подгрузятся через резервный источник."
  );
}
