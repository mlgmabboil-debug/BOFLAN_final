'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { resolveCoinGeckoUrl } from '../utils/coingecko'

// CoinGecko ID mappings for popular coins
export const COIN_MAP = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  DOGE: 'dogecoin',
  MATIC: 'polygon-ecosystem-token',
  SHIB: 'shiba-inu',
  LINK: 'chainlink',
  UNI: 'uniswap-protocol',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  LDO: 'lido-dao',
  CRV: 'curve-dao-token',
  AAVE: 'aave',
  COMP: 'compound-governance-token',
  MKR: 'maker',
  SUSHI: 'sushi',
  YFI: 'yearn-finance',
  SNX: 'synthetix-network-token',
  REN: 'republic-protocol',
  BAL: 'balancer',
  ZRX: '0x',
  BAT: 'basic-attention-token',
  MANA: 'decentraland',
  SAND: 'the-sandbox',
  ENJ: 'enjincoin',
  GALA: 'gala',
  AXS: 'axie-infinity',
  CHZ: 'chiliz',
  FLOW: 'flow',
  HBAR: 'hedera-hashgraph',
  ALGO: 'algorand',
  VET: 'vechain',
  THETA: 'theta-token',
  FTM: 'fantom',
  CRO: 'crypto-com-chain',
  KCS: 'kucoin-shares',
  HT: 'huobi-token',
  LUNA: 'terra-luna-2',
  TIA: 'celestia',
  WLD: 'worldcoin-wld',
  FET: 'fetch-ai',
  AGIX: 'singularitynet',
  ORDI: 'ordi',
  ARKM: 'arkham',
  PYTH: 'pyth-network',
  JTO: 'jito-governance-token',
  STRK: 'starknet',
} as const

export interface CoinPrice {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_24h: number
  price_change_percentage_24h: number
  market_cap: number
  market_cap_rank: number
  total_volume: number
  circulating_supply: number
  last_updated: number
}

export interface PriceHistory {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const CACHE_TTL = 30 * 1000 // 30 seconds cache
const STABLECOIN_SYMBOLS = new Set([
  'USDT', 'USDC', 'DAI', 'FDUSD', 'USDE', 'USDP', 'EURA', 'EURC', 'PYUSD', 'TUSD', 'BUSD', 'UST'
])

const FALLBACK_PRICES: CoinPrice[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', current_price: 66000, price_change_24h: 1540.23, price_change_percentage_24h: 2.39, market_cap: 1300000000000, market_cap_rank: 1, total_volume: 35000000000, circulating_supply: 19600000, last_updated: Date.now() },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', current_price: 3400, price_change_24h: 40.50, price_change_percentage_24h: 1.20, market_cap: 400000000000, market_cap_rank: 2, total_volume: 15000000000, circulating_supply: 120000000, last_updated: Date.now() },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', current_price: 580, price_change_24h: -12.4, price_change_percentage_24h: -2.1, market_cap: 89000000000, market_cap_rank: 3, total_volume: 1200000000, circulating_supply: 149000000, last_updated: Date.now() },
  { id: 'solana', symbol: 'SOL', name: 'Solana', current_price: 185, price_change_24h: 12.3, price_change_percentage_24h: 7.1, market_cap: 82000000000, market_cap_rank: 4, total_volume: 5300000000, circulating_supply: 440000000, last_updated: Date.now() },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', current_price: 0.60, price_change_24h: 0.02, price_change_percentage_24h: 3.4, market_cap: 33000000000, market_cap_rank: 5, total_volume: 1200000000, circulating_supply: 55000000000, last_updated: Date.now() },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', current_price: 0.15, price_change_24h: -0.01, price_change_percentage_24h: -6.2, market_cap: 21000000000, market_cap_rank: 6, total_volume: 2100000000, circulating_supply: 140000000000, last_updated: Date.now() },
  { id: 'toncoin', symbol: 'TON', name: 'Toncoin', current_price: 6.80, price_change_24h: 0.40, price_change_percentage_24h: 6.2, market_cap: 21000000000, market_cap_rank: 7, total_volume: 400000000, circulating_supply: 3400000000, last_updated: Date.now() },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', current_price: 0.45, price_change_24h: 0.01, price_change_percentage_24h: 2.2, market_cap: 16000000000, market_cap_rank: 8, total_volume: 400000000, circulating_supply: 35000000000, last_updated: Date.now() },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', current_price: 0.000025, price_change_24h: 0.000001, price_change_percentage_24h: 4.1, market_cap: 14000000000, market_cap_rank: 9, total_volume: 600000000, circulating_supply: 589000000000000, last_updated: Date.now() },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', current_price: 36.5, price_change_24h: 1.2, price_change_percentage_24h: 3.4, market_cap: 13000000000, market_cap_rank: 10, total_volume: 450000000, circulating_supply: 380000000, last_updated: Date.now() },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', current_price: 7.20, price_change_24h: -0.15, price_change_percentage_24h: -2.0, market_cap: 10000000000, market_cap_rank: 11, total_volume: 250000000, circulating_supply: 1400000000, last_updated: Date.now() },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', current_price: 14.50, price_change_24h: 0.80, price_change_percentage_24h: 5.8, market_cap: 8500000000, market_cap_rank: 12, total_volume: 350000000, circulating_supply: 580000000, last_updated: Date.now() },
  { id: 'tron', symbol: 'TRX', name: 'TRON', current_price: 0.12, price_change_24h: 0.00, price_change_percentage_24h: 0.5, market_cap: 10000000000, market_cap_rank: 13, total_volume: 300000000, circulating_supply: 87000000000, last_updated: Date.now() },
  { id: 'polygon', symbol: 'MATIC', name: 'Polygon', current_price: 0.68, price_change_24h: -0.02, price_change_percentage_24h: -2.85, market_cap: 6700000000, market_cap_rank: 14, total_volume: 280000000, circulating_supply: 9900000000, last_updated: Date.now() },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', current_price: 82.50, price_change_24h: 1.45, price_change_percentage_24h: 1.79, market_cap: 6100000000, market_cap_rank: 15, total_volume: 310000000, circulating_supply: 74000000, last_updated: Date.now() },
  { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', current_price: 6.20, price_change_24h: 0.35, price_change_percentage_24h: 5.98, market_cap: 5800000000, market_cap_rank: 16, total_volume: 240000000, circulating_supply: 1050000000, last_updated: Date.now() },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', current_price: 7.80, price_change_24h: -0.12, price_change_percentage_24h: -1.52, market_cap: 4600000000, market_cap_rank: 17, total_volume: 180000000, circulating_supply: 590000000, last_updated: Date.now() },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe', current_price: 0.0000125, price_change_24h: 0.0000012, price_change_percentage_24h: 10.61, market_cap: 5200000000, market_cap_rank: 18, total_volume: 950000000, circulating_supply: 420000000000000, last_updated: Date.now() },
  { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum', current_price: 0.95, price_change_24h: -0.015, price_change_percentage_24h: -1.55, market_cap: 2700000000, market_cap_rank: 19, total_volume: 190000000, circulating_supply: 2600000000, last_updated: Date.now() },
  { id: 'aptos', symbol: 'APT', name: 'Aptos', current_price: 8.40, price_change_24h: 0.22, price_change_percentage_24h: 2.69, market_cap: 3600000000, market_cap_rank: 20, total_volume: 140000000, circulating_supply: 430000000, last_updated: Date.now() },
  { id: 'internet-computer', symbol: 'ICP', name: 'Internet Computer', current_price: 11.20, price_change_24h: -0.45, price_change_percentage_24h: -3.86, market_cap: 5100000000, market_cap_rank: 21, total_volume: 110000000, circulating_supply: 460000000, last_updated: Date.now() },
  { id: 'ethereum-classic', symbol: 'ETC', name: 'Ethereum Classic', current_price: 28.40, price_change_24h: 0.60, price_change_percentage_24h: 2.16, market_cap: 4100000000, market_cap_rank: 22, total_volume: 160000000, circulating_supply: 146000000, last_updated: Date.now() },
  { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos', current_price: 8.10, price_change_24h: 0.08, price_change_percentage_24h: 1.00, market_cap: 3100000000, market_cap_rank: 23, total_volume: 130000000, circulating_supply: 390000000, last_updated: Date.now() },
  { id: 'immutable', symbol: 'IMX', name: 'Immutable', current_price: 1.95, price_change_24h: 0.05, price_change_percentage_24h: 2.63, market_cap: 2800000000, market_cap_rank: 24, total_volume: 90000000, circulating_supply: 1450000000, last_updated: Date.now() },
  { id: 'render-token', symbol: 'RNDR', name: 'Render', current_price: 7.60, price_change_24h: 0.38, price_change_percentage_24h: 5.26, market_cap: 2900000000, market_cap_rank: 25, total_volume: 170000000, circulating_supply: 388000000, last_updated: Date.now() },
  { id: 'the-graph', symbol: 'GRT', name: 'The Graph', current_price: 0.28, price_change_24h: 0.015, price_change_percentage_24h: 5.66, market_cap: 2600000000, market_cap_rank: 26, total_volume: 85000000, circulating_supply: 9500000000, last_updated: Date.now() },
  { id: 'optimism', symbol: 'OP', name: 'Optimism', current_price: 1.85, price_change_24h: -0.04, price_change_percentage_24h: -2.12, market_cap: 2200000000, market_cap_rank: 27, total_volume: 120000000, circulating_supply: 1200000000, last_updated: Date.now() },
  { id: 'filecoin', symbol: 'FIL', name: 'Filecoin', current_price: 4.80, price_change_24h: 0.05, price_change_percentage_24h: 1.05, market_cap: 2600000000, market_cap_rank: 28, total_volume: 95000000, circulating_supply: 540000000, last_updated: Date.now() },
  { id: 'lido-dao', symbol: 'LDO', name: 'Lido DAO', current_price: 1.72, price_change_24h: -0.03, price_change_percentage_24h: -1.71, market_cap: 1500000000, market_cap_rank: 29, total_volume: 110000000, circulating_supply: 890000000, last_updated: Date.now() },
  { id: 'vechain', symbol: 'VET', name: 'VeChain', current_price: 0.032, price_change_24h: 0.001, price_change_percentage_24h: 3.23, market_cap: 2300000000, market_cap_rank: 30, total_volume: 65000000, circulating_supply: 72000000000, last_updated: Date.now() },
  { id: 'fantom', symbol: 'FTM', name: 'Fantom', current_price: 0.72, price_change_24h: 0.045, price_change_percentage_24h: 6.67, market_cap: 2000000000, market_cap_rank: 31, total_volume: 130000000, circulating_supply: 2800000000, last_updated: Date.now() },
  { id: 'theta-token', symbol: 'THETA', name: 'Theta Network', current_price: 1.62, price_change_24h: -0.03, price_change_percentage_24h: -1.82, market_cap: 1600000000, market_cap_rank: 32, total_volume: 45000000, circulating_supply: 1000000000, last_updated: Date.now() },
  { id: 'maker', symbol: 'MKR', name: 'Maker', current_price: 2450, price_change_24h: 82.50, price_change_percentage_24h: 3.48, market_cap: 2250000000, market_cap_rank: 33, total_volume: 75000000, circulating_supply: 920000, last_updated: Date.now() },
  { id: 'sui', symbol: 'SUI', name: 'Sui', current_price: 1.15, price_change_24h: 0.075, price_change_percentage_24h: 6.98, market_cap: 2700000000, market_cap_rank: 34, total_volume: 210000000, circulating_supply: 2300000000, last_updated: Date.now() },
  { id: 'dogwifhat', symbol: 'WIF', name: 'dogwifhat', current_price: 2.15, price_change_24h: -0.18, price_change_percentage_24h: -7.73, market_cap: 2150000000, market_cap_rank: 35, total_volume: 380000000, circulating_supply: 998000000, last_updated: Date.now() },
  { id: 'floki', symbol: 'FLOKI', name: 'Floki', current_price: 0.000185, price_change_24h: 0.000014, price_change_percentage_24h: 8.19, market_cap: 1800000000, market_cap_rank: 36, total_volume: 240000000, circulating_supply: 9500000000000, last_updated: Date.now() },
  { id: 'bonk', symbol: 'BONK', name: 'Bonk', current_price: 0.0000215, price_change_24h: -0.0000012, price_change_percentage_24h: -5.29, market_cap: 1400000000, market_cap_rank: 37, total_volume: 180000000, circulating_supply: 65000000000000, last_updated: Date.now() },
  { id: 'algorand', symbol: 'ALGO', name: 'Algorand', current_price: 0.165, price_change_24h: 0.003, price_change_percentage_24h: 1.85, market_cap: 1350000000, market_cap_rank: 38, total_volume: 55000000, circulating_supply: 8100000000, last_updated: Date.now() },
  { id: 'stacks', symbol: 'STX', name: 'Stacks', current_price: 1.72, price_change_24h: 0.08, price_change_percentage_24h: 4.88, market_cap: 2500000000, market_cap_rank: 39, total_volume: 85000000, circulating_supply: 1450000000, last_updated: Date.now() },
  { id: 'multiversx', symbol: 'EGLD', name: 'MultiversX', current_price: 34.20, price_change_24h: -0.45, price_change_percentage_24h: -1.30, market_cap: 920000000, market_cap_rank: 40, total_volume: 35000000, circulating_supply: 27000000, last_updated: Date.now() },
  { id: 'flow', symbol: 'FLOW', name: 'Flow', current_price: 0.88, price_change_24h: 0.015, price_change_percentage_24h: 1.73, market_cap: 1320000000, market_cap_rank: 41, total_volume: 48000000, circulating_supply: 1500000000, last_updated: Date.now() },
  { id: 'aave', symbol: 'AAVE', name: 'Aave', current_price: 94.50, price_change_24h: 1.80, price_change_percentage_24h: 1.94, market_cap: 1390000000, market_cap_rank: 42, total_volume: 80000000, circulating_supply: 14800000, last_updated: Date.now() },
  { id: 'injective', symbol: 'INJ', name: 'Injective', current_price: 24.80, price_change_24h: 1.15, price_change_percentage_24h: 4.86, market_cap: 2300000000, market_cap_rank: 43, total_volume: 95000000, circulating_supply: 93000000, last_updated: Date.now() },
  { id: 'sei-network', symbol: 'SEI', name: 'Sei', current_price: 0.48, price_change_24h: -0.015, price_change_percentage_24h: -3.03, market_cap: 1380000000, market_cap_rank: 44, total_volume: 110000000, circulating_supply: 2900000000, last_updated: Date.now() },
  { id: 'gala', symbol: 'GALA', name: 'Gala', current_price: 0.038, price_change_24h: 0.0015, price_change_percentage_24h: 4.11, market_cap: 1180000000, market_cap_rank: 45, total_volume: 90000000, circulating_supply: 31000000000, last_updated: Date.now() },
  { id: 'thorchain', symbol: 'RUNE', name: 'THORChain', current_price: 5.40, price_change_24h: 0.28, price_change_percentage_24h: 5.47, market_cap: 1800000000, market_cap_rank: 46, total_volume: 130000000, circulating_supply: 335000000, last_updated: Date.now() },
  { id: 'jupiter', symbol: 'JUP', name: 'Jupiter', current_price: 0.98, price_change_24h: -0.02, price_change_percentage_24h: -2.00, market_cap: 1320000000, market_cap_rank: 47, total_volume: 140000000, circulating_supply: 1350000000, last_updated: Date.now() },
  { id: 'akash-network', symbol: 'AKT', name: 'Akash Network', current_price: 3.45, price_change_24h: 0.12, price_change_percentage_24h: 3.60, market_cap: 820000000, market_cap_rank: 48, total_volume: 25000000, circulating_supply: 240000000, last_updated: Date.now() },
  { id: 'beam', symbol: 'BEAM', name: 'Beam', current_price: 0.022, price_change_24h: -0.0012, price_change_percentage_24h: -5.17, market_cap: 1100000000, market_cap_rank: 49, total_volume: 45000000, circulating_supply: 50000000000, last_updated: Date.now() },
  { id: 'pendle', symbol: 'PENDLE', name: 'Pendle', current_price: 5.12, price_change_24h: 0.42, price_change_percentage_24h: 8.94, market_cap: 780000000, market_cap_rank: 50, total_volume: 68000000, circulating_supply: 150000000, last_updated: Date.now() },
  { id: 'celestia', symbol: 'TIA', name: 'Celestia', current_price: 10.5, price_change_24h: 0.8, price_change_percentage_24h: 8.24, market_cap: 1900000000, market_cap_rank: 51, total_volume: 180000000, circulating_supply: 180000000, last_updated: Date.now() },
  { id: 'worldcoin-wld', symbol: 'WLD', name: 'Worldcoin', current_price: 4.8, price_change_24h: -0.2, price_change_percentage_24h: -4.0, market_cap: 1100000000, market_cap_rank: 52, total_volume: 300000000, circulating_supply: 220000000, last_updated: Date.now() },
  { id: 'fetch-ai', symbol: 'FET', name: 'Fetch.ai', current_price: 2.1, price_change_24h: 0.15, price_change_percentage_24h: 7.69, market_cap: 1800000000, market_cap_rank: 53, total_volume: 250000000, circulating_supply: 850000000, last_updated: Date.now() },
  { id: 'starknet', symbol: 'STRK', name: 'Starknet', current_price: 1.25, price_change_24h: 0.05, price_change_percentage_24h: 4.16, market_cap: 1600000000, market_cap_rank: 54, total_volume: 120000000, circulating_supply: 1300000000, last_updated: Date.now() }
]

export const PROCEED_NAMES = [
  { name: "Sora AI", symbol: "SORA" },
  { name: "DeepSeek Protocol", symbol: "DSEEK" },
  { name: "Antigravity Agent", symbol: "ANTI" },
  { name: "Frog Hat Coin", symbol: "FROG" },
  { name: "NeuraLink Pro", symbol: "NEURA" },
  { name: "Kabosu Tribute", symbol: "KABOSU" },
  { name: "Ethereum 3.0", symbol: "ETH3" },
  { name: "Chill Frog", symbol: "CHILL" },
  { name: "Pump Fun Token", symbol: "PUMPF" },
  { name: "AI Agent Nexus", symbol: "ANEX" },
  { name: "Gemini Inside", symbol: "GEMINI" },
] as const;

export const getCustomCoins = (): CoinPrice[] => {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem("custom_market_coins")
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

export const saveCustomCoins = (coins: CoinPrice[]) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("custom_market_coins", JSON.stringify(coins))
    window.dispatchEvent(new Event("custom_coins_updated"))
  } catch (e) {}
}

export const simulateNewListing = () => {
  if (typeof window === "undefined") return null;
  const custom = getCustomCoins();
  const existingSyms = new Set([
     ...FALLBACK_PRICES.map(f => f.symbol.toUpperCase()),
     ...custom.map(c => c.symbol.toUpperCase())
  ]);
  
  const available = PROCEED_NAMES.filter(p => !existingSyms.has(p.symbol.toUpperCase()));
  if (available.length === 0) return null;
  
  const selected = available[Math.floor(Math.random() * available.length)];
  
  const newCoin: CoinPrice = {
    id: `custom-${selected.symbol.toLowerCase()}`,
    symbol: selected.symbol,
    name: selected.name,
    current_price: 0.12 + Math.random() * 2.3,
    price_change_24h: 0,
    price_change_percentage_24h: Number(((Math.random() - 0.2) * 15).toFixed(2)),
    market_cap: Math.floor(800000 + Math.random() * 4000000),
    market_cap_rank: existingSyms.size + 1,
    total_volume: Math.floor(40000 + Math.random() * 180000),
    circulating_supply: 1000000000,
    last_updated: Date.now()
  };
  
  const updatedCustom = [newCoin, ...custom];
  saveCustomCoins(updatedCustom);
  
  const event = new CustomEvent("new_dex_listing", { detail: newCoin });
  window.dispatchEvent(event);

  return newCoin;
};

export function useMarketPrices() {
  const getInitialPrices = (): CoinPrice[] => {
    const custom = getCustomCoins()
    if (custom.length > 0) {
      const customSyms = new Set(custom.map(c => c.symbol.toUpperCase()))
      return [...custom, ...FALLBACK_PRICES.filter(p => !customSyms.has(p.symbol.toUpperCase()))]
    }
    return FALLBACK_PRICES
  }

  const [prices, setPrices] = useState<CoinPrice[]>(getInitialPrices)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCoins, setTotalCoins] = useState(0)

  // Listen to updates from other instances
  useEffect(() => {
    const handleUpdate = () => {
      setPrices((prev) => {
        const custom = getCustomCoins()
        const customSyms = new Set(custom.map(c => c.symbol.toUpperCase()))
        const filteredPrev = prev.filter(p => !customSyms.has(p.symbol.toUpperCase()))
        return [...custom, ...filteredPrev]
      })
    }
    window.addEventListener("custom_coins_updated", handleUpdate)
    return () => window.removeEventListener("custom_coins_updated", handleUpdate)
  }, [])

  // Fetch all coins with pagination (merging custom coins)
  const fetchAllPrices = useCallback(async (page = 1, search = '') => {
    setLoading(true)
    setError(null)

    try {
      const limit = 250 // CoinGecko max per page
      let url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=${page}&sparkline=false&price_change_percentage=24h`
      
      if (search) {
        url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(search)}`
      }

      const response = await fetch(resolveCoinGeckoUrl(url), {
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      let loaded: CoinPrice[] = []
      
      if (search) {
        // Search results
        loaded = data.coins?.map((coin: any) => ({
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          current_price: 0, 
          price_change_24h: 0,
          price_change_percentage_24h: 0,
          market_cap: 0,
          market_cap_rank: 0,
          total_volume: 0,
          circulating_supply: 0,
          last_updated: Date.now()
        })).filter((coin: any) => !STABLECOIN_SYMBOLS.has(coin.symbol)) || []
        
        setTotalCoins(loaded.length)
      } else {
        // Market list
        loaded = data.map((coin: any) => ({
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          current_price: coin.current_price,
          price_change_24h: coin.price_change_24h,
          price_change_percentage_24h: coin.price_change_percentage_24h,
          market_cap: coin.market_cap,
          market_cap_rank: coin.market_cap_rank || 0,
          total_volume: coin.total_volume,
          circulating_supply: coin.circulating_supply,
          last_updated: coin.last_updated
        })).filter((coin: any) => !STABLECOIN_SYMBOLS.has(coin.symbol))
        
        setTotalCoins(10000)
      }

      // Merge with custom coins
      const custom = getCustomCoins()
      if (custom.length > 0) {
        const customSyms = new Set(custom.map(c => c.symbol.toUpperCase()))
        setPrices([...custom, ...loaded.filter(l => !customSyms.has(l.symbol.toUpperCase()))])
      } else {
        setPrices(loaded)
      }

      setCurrentPage(page)
    } catch (e: any) {
      // API failed, load fallback and merge custom
      setError(null) 
      const custom = getCustomCoins()
      if (custom.length > 0) {
        const customSyms = new Set(custom.map(c => c.symbol.toUpperCase()))
        setPrices([...custom, ...FALLBACK_PRICES.filter(p => !customSyms.has(p.symbol.toUpperCase()))])
      } else {
        setPrices(FALLBACK_PRICES)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Real-time updates for top coins (merging with Coingecko)
  const fetchTopPrices = useCallback(async () => {
    try {
      const topCoins = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano']
      const response = await fetch(
        resolveCoinGeckoUrl(`https://api.coingecko.com/api/v3/simple/price?ids=${topCoins.join(',')}&vs_currencies=usd&include_24hr_change=true`),
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      )

      if (!response.ok) return

      const data = await response.json()
      
      setPrices(prev => prev.map(coin => {
        if (data[coin.id]) {
          return {
            ...coin,
            current_price: data[coin.id].usd,
            price_change_24h: data[coin.id].usd_24h_change || 0,
            price_change_percentage_24h: ((data[coin.id].usd_24h_change || 0) / coin.current_price) * 100,
            last_updated: Date.now()
          }
        }
        return coin
      }))
    } catch (e) {
      // ignore
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchAllPrices(1)
  }, [fetchAllPrices])

  // Real-time updates every 60 seconds (Coingecko fetch)
  useEffect(() => {
    const interval = setInterval(fetchTopPrices, 60000)
    return () => clearInterval(interval)
  }, [fetchTopPrices])

  // Real-time tick fluctuations & random dex listing generations
  useEffect(() => {
    const liveTick = setInterval(() => {
      setPrices((prev) => {
        const updated = prev.map((coin) => {
          if (STABLECOIN_SYMBOLS.has(coin.symbol.toUpperCase())) return coin
          
          // Random walk price fluctuation between -0.3% and +0.35%
          const changePct = (Math.random() - 0.46) * 0.005
          const priceMultiplier = 1 + changePct
          const oldPrice = coin.current_price
          const newPrice = Math.max(0.00000001, oldPrice * priceMultiplier)
          const absDiff = newPrice - oldPrice
          
          return {
            ...coin,
            current_price: newPrice,
            price_change_24h: (coin.price_change_24h || 0) + absDiff,
            price_change_percentage_24h: Number(((coin.price_change_percentage_24h || 0) + changePct * 100).toFixed(4)),
            total_volume: Math.max(1000, (coin.total_volume || 0) + (Math.random() - 0.3) * 10000),
            last_updated: Date.now()
          }
        })

        // Silently sync custom coins state back to localStorage
        const custom = getCustomCoins()
        if (custom.length > 0) {
          const customSyms = new Set(custom.map(c => c.symbol.toUpperCase()))
          const updatedCustom = updated.filter(u => customSyms.has(u.symbol.toUpperCase()))
          if (updatedCustom.length > 0) {
            try {
              localStorage.setItem("custom_market_coins", JSON.stringify(updatedCustom))
            } catch (e) {}
          }
        }

        return updated
      })
    }, 4000)

    // Interval for simulating random DEX listings automatically every 65 seconds
    const listingSimulator = setInterval(() => {
      if (Math.random() < 0.55) {
        simulateNewListing()
      }
    }, 65000)

    return () => {
      clearInterval(liveTick)
      clearInterval(listingSimulator)
    }
  }, [])

  // Search functionality
  const searchedPrices = useMemo(() => {
    if (!searchQuery) return prices
    return prices.filter(coin => 
      coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [prices, searchQuery])

  // Pagination
  const paginatedPrices = useMemo(() => {
    const startIndex = (currentPage - 1) * 50
    return searchedPrices.slice(startIndex, startIndex + 50)
  }, [searchedPrices, currentPage])

  return {
    prices: paginatedPrices,
    allPrices: prices,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalCoins,
    totalPages: Math.ceil(searchedPrices.length / 50),
    refetch: () => fetchAllPrices(currentPage, searchQuery),
    refreshTopPrices: fetchTopPrices
  }
}

// Helper function to get price by symbol
export function getPrice(symbol: string, prices: CoinPrice[] = []): CoinPrice | undefined {
  return prices.find(p => p.symbol === symbol.toUpperCase())
}

// Format price with proper decimals
export function formatPrice(price: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price)
}

// Format percentage
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// Format volume with proper units
export function formatVolume(volume: number): string {
  if (volume >= 1e12) {
    return `$${(volume / 1e12).toFixed(2)}T`
  }
  if (volume >= 1e9) {
    return `$${(volume / 1e9).toFixed(2)}B`
  }
  if (volume >= 1e6) {
    return `$${(volume / 1e6).toFixed(2)}M`
  }
  if (volume >= 1e3) {
    return `$${(volume / 1e3).toFixed(2)}K`
  }
  return `$${volume.toFixed(2)}`
}
