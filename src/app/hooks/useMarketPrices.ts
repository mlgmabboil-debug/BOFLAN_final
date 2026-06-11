'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

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
const FALLBACK_PRICES: CoinPrice[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', current_price: 66000, price_change_24h: 1540.23, price_change_percentage_24h: 2.39, market_cap: 1300000000000, market_cap_rank: 1, total_volume: 35000000000, circulating_supply: 19600000, last_updated: Date.now() },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', current_price: 3400, price_change_24h: 40.50, price_change_percentage_24h: 1.20, market_cap: 400000000000, market_cap_rank: 2, total_volume: 15000000000, circulating_supply: 120000000, last_updated: Date.now() },
  { id: 'tether', symbol: 'USDT', name: 'Tether', current_price: 1.00, price_change_24h: 0.00, price_change_percentage_24h: 0.01, market_cap: 104000000000, market_cap_rank: 3, total_volume: 45000000000, circulating_supply: 104000000000, last_updated: Date.now() },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', current_price: 580, price_change_24h: -12.4, price_change_percentage_24h: -2.1, market_cap: 89000000000, market_cap_rank: 4, total_volume: 1200000000, circulating_supply: 149000000, last_updated: Date.now() },
  { id: 'solana', symbol: 'SOL', name: 'Solana', current_price: 185, price_change_24h: 12.3, price_change_percentage_24h: 7.1, market_cap: 82000000000, market_cap_rank: 5, total_volume: 5300000000, circulating_supply: 440000000, last_updated: Date.now() },
  { id: 'usdc', symbol: 'USDC', name: 'USDC', current_price: 1.00, price_change_24h: 0.00, price_change_percentage_24h: -0.01, market_cap: 32000000000, market_cap_rank: 6, total_volume: 4100000000, circulating_supply: 32000000000, last_updated: Date.now() },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', current_price: 0.60, price_change_24h: 0.02, price_change_percentage_24h: 3.4, market_cap: 33000000000, market_cap_rank: 7, total_volume: 1200000000, circulating_supply: 55000000000, last_updated: Date.now() },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', current_price: 0.15, price_change_24h: -0.01, price_change_percentage_24h: -6.2, market_cap: 21000000000, market_cap_rank: 8, total_volume: 2100000000, circulating_supply: 140000000000, last_updated: Date.now() },
  { id: 'toncoin', symbol: 'TON', name: 'Toncoin', current_price: 6.80, price_change_24h: 0.40, price_change_percentage_24h: 6.2, market_cap: 21000000000, market_cap_rank: 9, total_volume: 400000000, circulating_supply: 3400000000, last_updated: Date.now() },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', current_price: 0.45, price_change_24h: 0.01, price_change_percentage_24h: 2.2, market_cap: 16000000000, market_cap_rank: 10, total_volume: 400000000, circulating_supply: 35000000000, last_updated: Date.now() },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', current_price: 0.000025, price_change_24h: 0.000001, price_change_percentage_24h: 4.1, market_cap: 14000000000, market_cap_rank: 11, total_volume: 600000000, circulating_supply: 589000000000000, last_updated: Date.now() },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', current_price: 36.5, price_change_24h: 1.2, price_change_percentage_24h: 3.4, market_cap: 13000000000, market_cap_rank: 12, total_volume: 450000000, circulating_supply: 380000000, last_updated: Date.now() },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', current_price: 7.20, price_change_24h: -0.15, price_change_percentage_24h: -2.0, market_cap: 10000000000, market_cap_rank: 13, total_volume: 250000000, circulating_supply: 1400000000, last_updated: Date.now() },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', current_price: 14.50, price_change_24h: 0.80, price_change_percentage_24h: 5.8, market_cap: 8500000000, market_cap_rank: 14, total_volume: 350000000, circulating_supply: 580000000, last_updated: Date.now() },
  { id: 'tron', symbol: 'TRX', name: 'TRON', current_price: 0.12, price_change_24h: 0.00, price_change_percentage_24h: 0.5, market_cap: 10000000000, market_cap_rank: 15, total_volume: 300000000, circulating_supply: 87000000000, last_updated: Date.now() }
]

export function useMarketPrices() {
  const [prices, setPrices] = useState<CoinPrice[]>(FALLBACK_PRICES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCoins, setTotalCoins] = useState(0)

  // Fetch all coins with pagination
  const fetchAllPrices = useCallback(async (page = 1, search = '') => {
    setLoading(true)
    setError(null)

    try {
      const limit = 250 // CoinGecko max per page
      let url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=${page}&sparkline=false&price_change_percentage=24h`
      
      if (search) {
        url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(search)}`
      }

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (search) {
        // Search results
        const coins = data.coins?.map((coin: any) => ({
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          current_price: 0, // Will be fetched individually
          price_change_24h: 0,
          price_change_percentage_24h: 0,
          market_cap: 0,
          market_cap_rank: 0,
          total_volume: 0,
          circulating_supply: 0,
          last_updated: Date.now()
        })) || []

        setPrices(coins)
        setTotalCoins(coins.length)
      } else {
        // Market list
        const coins = data.map((coin: any) => ({
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
        }))

        setPrices(coins)
        setTotalCoins(10000) // CoinGecko has ~10000+ coins
      }

      setCurrentPage(page)
    } catch (e: any) {
      // API may fail due to rate limits or CORS, use fallbacks
      setError(null) 
      setPrices(FALLBACK_PRICES)
    } finally {
      setLoading(false)
    }
  }, [])

  // Real-time updates for top coins
  const fetchTopPrices = useCallback(async () => {
    try {
      const topCoins = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano']
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${topCoins.join(',')}&vs_currencies=usd&include_24hr_change=true`,
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
      // API may fail due to rate limits or CORS, ignore
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchAllPrices(1)
  }, [fetchAllPrices])

  // Real-time updates every 60 seconds (to avoid rate limiting)
  useEffect(() => {
    const interval = setInterval(fetchTopPrices, 60000)
    return () => clearInterval(interval)
  }, [fetchTopPrices])

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
