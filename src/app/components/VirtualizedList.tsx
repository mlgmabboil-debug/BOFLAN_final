'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { usePerformance } from '../hooks/usePerformance'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overscan?: number
  onScroll?: (scrollTop: number) => void
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5,
  onScroll
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerSize, setContainerSize] = useState({ width: 0, height: containerHeight })
  const containerRef = useRef<HTMLDivElement>(null)
  const { throttle } = usePerformance()

  // Calculate visible range
  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleEnd = Math.min(
    items.length,
    Math.ceil((scrollTop + containerSize.height) / itemHeight) + overscan
  )

  const visibleItems = items.slice(visibleStart, visibleEnd)

  // Handle scroll with throttling
  const handleScroll = useCallback(
    throttle((e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop
      setScrollTop(newScrollTop)
      onScroll?.(newScrollTop)
    }, 16), // 60fps
    [throttle, onScroll]
  )

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {/* Visible items */}
        {visibleItems.map((item, index) => {
          const actualIndex = visibleStart + index
          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Memoized list item component
export const MemoizedListItem = React.memo(<T,>({
  item,
  index,
  renderItem
}: {
  item: T
  index: number
  renderItem: (item: T, index: number) => React.ReactNode
}) => {
  return <>{renderItem(item, index)}</>
})

// Infinite scroll wrapper
export function InfiniteVirtualizedList<T>({
  items,
  onLoadMore,
  hasMore,
  loading,
  ...props
}: VirtualizedListProps<T> & {
  onLoadMore: () => void
  hasMore: boolean
  loading: boolean
}) {
  const handleScroll = useCallback((scrollTop: number) => {
    const { containerHeight, itemHeight } = props
    const threshold = 100 // pixels from bottom
    
    if (
      hasMore &&
      !loading &&
      scrollTop + containerHeight + threshold >= items.length * itemHeight
    ) {
      onLoadMore()
    }
  }, [hasMore, loading, onLoadMore, items.length, props.containerHeight, props.itemHeight])

  return (
    <div className="relative">
      <VirtualizedList {...props} items={items} onScroll={handleScroll} />
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-8 h-8 border-2 border-[#00D084] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* End indicator */}
      {!hasMore && items.length > 0 && (
        <div className="text-center py-4 text-white/40 text-sm">
          End of list
        </div>
      )}
    </div>
  )
}
