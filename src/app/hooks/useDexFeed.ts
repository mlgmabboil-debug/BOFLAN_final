import { useCallback, useEffect, useState } from "react";

export interface DexToken {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  positive: boolean;
  marketCap: number;
  liquidity: number;
  age: string;
  scamScore: number;
  honeypot: boolean;
  rugRisk: "Низкий" | "Средний" | "Высокий" | "Критический";
  source: string;
  url?: string;
}

function formatAge(createdAt?: number): string {
  if (!createdAt) return "новый";
  const diff = Date.now() - createdAt;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} мин.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч.`;
  return `${Math.floor(h / 24)} д.`;
}

function getRisk(scamScore: number): DexToken["rugRisk"] {
  if (scamScore < 20) return "Низкий";
  if (scamScore < 50) return "Средний";
  if (scamScore < 80) return "Высокий";
  return "Критический";
}

export function useDexFeed(refreshMs = 30000) {
  const [tokens, setTokens] = useState<DexToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDex = useCallback(async () => {
    try {
      const latestResp = await fetch("https://api.dexscreener.com/token-boosts/latest/v1");
      if (!latestResp.ok) throw new Error(`Dexscreener boosts HTTP ${latestResp.status}`);
      const latest = (await latestResp.json()) as any[];
      const scoped = latest.slice(0, 12);

      const pairResponses = await Promise.all(
        scoped.map(async (item) => {
          const chainId = item.chainId;
          const tokenAddress = item.tokenAddress;
          const pairResp = await fetch(`https://api.dexscreener.com/token-pairs/v1/${chainId}/${tokenAddress}`);
          if (!pairResp.ok) return null;
          const pairs = (await pairResp.json()) as any[];
          const best = pairs?.[0];
          if (!best) return null;
          const liquidityUsd = Number(best?.liquidity?.usd || 0);
          const fdv = Number(best?.fdv || 0);
          const change24h = Number(best?.priceChange?.h24 || 0);
          const scamScore = Math.max(
            1,
            Math.min(99, Math.round((liquidityUsd < 50000 ? 60 : 15) + (fdv > 0 && liquidityUsd / fdv < 0.03 ? 25 : 0)))
          );
          return {
            symbol: best.baseToken?.symbol || "UNK",
            name: best.baseToken?.name || "Unknown",
            price: Number(best.priceUsd || 0),
            change24h,
            positive: change24h >= 0,
            marketCap: fdv,
            liquidity: liquidityUsd,
            age: formatAge(best.pairCreatedAt),
            scamScore,
            honeypot: scamScore > 90,
            rugRisk: getRisk(scamScore),
            source: "Dexscreener",
            url: best.url,
          } as DexToken;
        })
      );

      const normalized = pairResponses.filter(Boolean) as DexToken[];
      setTokens(normalized);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить DEX-поток");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDex();
    const t = setInterval(fetchDex, refreshMs);
    return () => clearInterval(t);
  }, [fetchDex, refreshMs]);

  return { tokens, loading, error, refresh: fetchDex };
}
