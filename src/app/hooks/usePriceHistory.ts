'use client'

import { useState, useEffect, useCallback } from 'react'
import { PriceHistory } from './useMarketPrices'
import { resolveCoinGeckoUrl } from '../utils/coingecko'

export function usePriceHistory(symbol: string, timeframe: '1h' | '4h' | '1d' | '1w' | '1m' = '1d') {
  const [history, setHistory] = useState<PriceHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!symbol) return

    setLoading(true)
    setError(null)

    try {
      const coinId = symbol.toLowerCase()
      const days = {
        '1h': 1,
        '4h': 1,
        '1d': 1,
        '1w': 7,
        '1m': 30
      }[timeframe] || 1

      const response = await fetch(
        resolveCoinGeckoUrl(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`),
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      const priceHistory: PriceHistory[] = data.prices.map(([timestamp, price]: [number, number]) => ({
        time: timestamp,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0
      }))

      setHistory(priceHistory)
    } catch (e: any) {
      console.error('Error fetching price history:', e)
      setError(e.message)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [symbol, timeframe])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    history,
    loading,
    error,
    refetch: fetchHistory
  }
}
