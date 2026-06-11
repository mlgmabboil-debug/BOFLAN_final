'use client'

import { useMemo, useRef, useCallback, useEffect } from 'react'
import { TrendingUp, TrendingDown, Loader } from 'lucide-react'
import { useMarketPrices, formatPrice, formatPercentage } from '../hooks/useMarketPrices'

interface TickerProps {
  className?: string
  onCoinClick?: (symbol: string) => void
}

export function Ticker({ className = '', onCoinClick }: TickerProps) {
  const { prices, loading } = useMarketPrices()
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false })
  const animationRef = useRef<number>(0)

  const topCoins = useMemo(() => {
    return [...prices].sort((a, b) => b.market_cap - a.market_cap).slice(0, 30)
  }, [prices])

  // Duplicate for infinite scroll 
  const displayCoins = useMemo(() => {
    if (topCoins.length === 0) return []
    return [...topCoins, ...topCoins, ...topCoins, ...topCoins] // Multiple copies to ensure wide enough content for seamless loop
  }, [topCoins])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || displayCoins.length === 0) return

    let scrollAmount = 0
    let lastTime = performance.now()

    const step = (time: number) => {
      const dt = time - lastTime
      lastTime = time

      // Auto scroll if not dragging
      if (!dragRef.current.active) {
        // approx 30px per second
        scrollAmount += (dt / 1000) * 30
        if (scrollAmount >= 1) {
          el.scrollLeft += scrollAmount
          scrollAmount = 0
        }

        // Loop seamlessly (the width of the first set of coins)
        // Since we duplicated 4 times, taking the full scroll width / 4 gives the size of 1 copy.
        const singleCopyWidth = el.scrollWidth / 4
        
        if (el.scrollLeft >= singleCopyWidth * 2) {
            el.scrollLeft -= singleCopyWidth
        } else if (el.scrollLeft <= 0) {
            el.scrollLeft += singleCopyWidth
        }
      }
      animationRef.current = requestAnimationFrame(step)
    }

    animationRef.current = requestAnimationFrame(step)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [displayCoins])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    dragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    }
    el.setPointerCapture(e.pointerId)
    el.style.cursor = 'grabbing'
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el || !dragRef.current.active) return
    const dx = e.clientX - dragRef.current.startX
    if (Math.abs(dx) > 4) dragRef.current.moved = true
    el.scrollLeft = dragRef.current.scrollLeft - dx
  }, [])

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    dragRef.current.active = false
    el.releasePointerCapture(e.pointerId)
    el.style.cursor = 'grab'
  }, [])

  const handleCoinClick = useCallback(
    (symbol: string) => {
      if (dragRef.current.moved) return
      onCoinClick?.(symbol)
    },
    [onCoinClick]
  )

  if (loading) {
    return (
      <div className={`h-10 bg-[#080808] border-b border-[#1a1a1a] flex items-center justify-center ${className}`}>
        <Loader className="animate-spin text-white/40 w-4 h-4" />
        <span className="ml-2 text-white/40 text-xs">Загрузка цен...</span>
      </div>
    )
  }

  return (
    <div className={`h-10 bg-[#080808] border-b border-[#1a1a1a] ${className}`}>
      <div
        ref={scrollRef}
        className="h-full overflow-x-auto overflow-y-hidden flex items-stretch scrollbar-none cursor-grab select-none touch-pan-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="flex items-stretch min-w-max">
          {displayCoins.map((coin, index) => (
            <button
              key={`${coin.id}-${index}`}
              type="button"
              onClick={() => handleCoinClick(coin.symbol)}
              className="flex items-center gap-2 px-4 py-2 whitespace-nowrap hover:bg-[#1a1a1a] transition-colors shrink-0"
            >
              <span className="text-white/60 text-xs font-mono">{coin.symbol}</span>
              <span className="text-white text-xs font-mono">{formatPrice(coin.current_price)}</span>
              <span
                className={`text-xs font-medium flex items-center ${
                  (coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {(coin.price_change_percentage_24h ?? 0) >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-0.5" />
                )}
                {formatPercentage(coin.price_change_percentage_24h ?? 0)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
