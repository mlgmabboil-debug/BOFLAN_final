import { useState, useEffect, useCallback } from 'react'

export interface DexToken {
  chainId: string
  tokenAddress: string
  symbol: string
  name: string
  price: number
  priceChange24h: number
  liquidity: number
  fdv: number
  marketCap: number
  pairAddress: string
  pairCreatedAt: number
  txns: {
    m5: number
    h1: number
    h6: number
    h24: number
  }
  volume: {
    h24: number
    h6: number
    h1: number
    m5: number
  }
}

export interface DexPair {
  chainId: string
  dexId: string
  url: string
  pairAddress: string
  baseToken: {
    address: string
    name: string
    symbol: string
  }
  quoteToken: {
    address: string
    name: string
    symbol: string
  }
  priceNative: string
  priceUsd: string
  txns: {
    m5: number
    h1: number
    h6: number
    h24: number
  }
  volume: {
    h24: number
    h6: number
    h1: number
    m5: number
  }
  liquidity: {
    usd: number
    base: number
    quote: number
  }
  pairCreatedAt: number
}

export interface DexAnalysis {
  token: DexToken
  isHoneypot: boolean
  isRugPull: boolean
  liquidityScore: number
  holderScore: number
  trustScore: number
  topHolders: Array<{
    address: string
    balance: number
    percentage: number
  }>
}

const DEXSCREENER_API = 'https://api.dexscreener.com/latest'

export function useDexTokens() {
  const [tokens, setTokens] = useState<DexToken[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchTokens = useCallback(async (query: string) => {
    if (!query) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${DEXSCREENER_API}/dex/search?q=${encodeURIComponent(query)}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.pairs && Array.isArray(data.pairs)) {
        const tokenData: DexToken[] = data.pairs.slice(0, 20).map((pair: any) => ({
          chainId: pair.chainId,
          tokenAddress: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          price: parseFloat(pair.priceUsd) || 0,
          priceChange24h: pair.priceChange?.h24 || 0,
          liquidity: pair.liquidity?.usd || 0,
          fdv: pair.fdv || 0,
          marketCap: pair.marketCap || 0,
          pairAddress: pair.pairAddress,
          pairCreatedAt: pair.pairCreatedAt || 0,
          txns: pair.txns || { m5: 0, h1: 0, h6: 0, h24: 0 },
          volume: pair.volume || { h24: 0, h6: 0, h1: 0, m5: 0 }
        }))

        setTokens(tokenData)
      }
    } catch (e: any) {
      console.error('Error searching tokens:', e)
      setError(e.message)
      setTokens([])
    } finally {
      setLoading(false)
    }
  }, [])

  const getTopTokens = useCallback(async (chainId?: string) => {
    setLoading(true)
    setError(null)

    try {
      const url = chainId 
        ? `${DEXSCREENER_API}/dex/tokens/${chainId}`
        : `${DEXSCREENER_API}/dex/tokens`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.pairs && Array.isArray(data.pairs)) {
        const tokenData: DexToken[] = data.pairs.slice(0, 50).map((pair: any) => ({
          chainId: pair.chainId,
          tokenAddress: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          price: parseFloat(pair.priceUsd) || 0,
          priceChange24h: pair.priceChange?.h24 || 0,
          liquidity: pair.liquidity?.usd || 0,
          fdv: pair.fdv || 0,
          marketCap: pair.marketCap || 0,
          pairAddress: pair.pairAddress,
          pairCreatedAt: pair.pairCreatedAt || 0,
          txns: pair.txns || { m5: 0, h1: 0, h6: 0, h24: 0 },
          volume: pair.volume || { h24: 0, h6: 0, h1: 0, m5: 0 }
        }))

        setTokens(tokenData)
      }
    } catch (e: any) {
      console.error('Error fetching top tokens:', e)
      setError(e.message)
      setTokens([])
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    tokens,
    loading,
    error,
    searchTokens,
    getTopTokens
  }
}

export function useDexPair(pairAddress: string) {
  const [pair, setPair] = useState<DexPair | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPair = useCallback(async () => {
    if (!pairAddress) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${DEXSCREENER_API}/dex/pairs/${pairAddress}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.pair) {
        setPair(data.pair)
      }
    } catch (e: any) {
      console.error('Error fetching pair:', e)
      setError(e.message)
      setPair(null)
    } finally {
      setLoading(false)
    }
  }, [pairAddress])

  useEffect(() => {
    fetchPair()
  }, [fetchPair])

  return {
    pair,
    loading,
    error,
    refetch: fetchPair
  }
}

// Basic token analysis (in production, integrate with real honeypot detectors)
export function useDexAnalysis(tokenAddress: string, chainId: string) {
  const [analysis, setAnalysis] = useState<DexAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeToken = useCallback(async () => {
    if (!tokenAddress || !chainId) return

    setLoading(true)
    setError(null)

    try {
      // Get token data from DexScreener
      const response = await fetch(
        `${DEXSCREENER_API}/dex/tokens/${tokenAddress}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0]
        const liquidity = pair.liquidity?.usd || 0
        const volume24h = pair.volume?.h24 || 0
        const priceChange24h = pair.priceChange?.h24 || 0
        const pairAge = Date.now() - (pair.pairCreatedAt || 0)
        const pairAgeDays = pairAge / (1000 * 60 * 60 * 24)

        // Basic analysis logic (in production, use real honeypot detectors)
        const isHoneypot = liquidity < 1000 // Low liquidity might indicate honeypot
        const isRugPull = pairAgeDays < 1 && volume24h > liquidity * 10 // Suspicious volume on new token
        
        const liquidityScore = Math.min(100, liquidity / 10000)
        const holderScore = 50 // Placeholder - would need real holder data
        const trustScore = (liquidityScore + holderScore) / 2

        setAnalysis({
          token: {
            chainId: pair.chainId,
            tokenAddress: pair.baseToken.address,
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            price: parseFloat(pair.priceUsd) || 0,
            priceChange24h: priceChange24h,
            liquidity: liquidity,
            fdv: pair.fdv || 0,
            marketCap: pair.marketCap || 0,
            pairAddress: pair.pairAddress,
            pairCreatedAt: pair.pairCreatedAt || 0,
            txns: pair.txns || { m5: 0, h1: 0, h6: 0, h24: 0 },
            volume: pair.volume || { h24: 0, h6: 0, h1: 0, m5: 0 }
          },
          isHoneypot,
          isRugPull,
          liquidityScore,
          holderScore,
          trustScore,
          topHolders: [] // Would need real holder data from blockchain
        })
      }
    } catch (e: any) {
      console.error('Error analyzing token:', e)
      setError(e.message)
      setAnalysis(null)
    } finally {
      setLoading(false)
    }
  }, [tokenAddress, chainId])

  useEffect(() => {
    analyzeToken()
  }, [analyzeToken])

  return {
    analysis,
    loading,
    error,
    refetch: analyzeToken
  }
}
