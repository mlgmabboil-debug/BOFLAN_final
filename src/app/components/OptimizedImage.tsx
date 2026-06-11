'use client'

import { useState, useEffect, useRef } from 'react'
import { usePerformance } from '../hooks/usePerformance'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  placeholder?: string
  quality?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
  lazy?: boolean
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder,
  quality = 80,
  format = 'webp',
  lazy = true,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState('')
  const imgRef = useRef<HTMLImageElement>(null)
  const { lazyLoad, optimizeImage } = usePerformance()

  // Generate optimized image URL
  const optimizedSrc = optimizeImage(src, { width, height, quality, format })

  // Generate placeholder (blur hash)
  const generatePlaceholder = () => {
    if (placeholder) return placeholder
    
    // Generate simple SVG placeholder
    const svg = `
      <svg width="${width || 400}" height="${height || 300}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666" font-family="sans-serif" font-size="14">
          Loading...
        </text>
      </svg>
    `
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }

  useEffect(() => {
    if (priority || !lazy) {
      // Load immediately for priority images
      setCurrentSrc(optimizedSrc)
    } else {
      // Use lazy loading for non-priority images
      if (imgRef.current) {
        imgRef.current.dataset.src = optimizedSrc
        imgRef.current.classList.add('lazy')
        lazyLoad(imgRef.current)
      }
    }

    return () => {
      if (imgRef.current && imgRef.current.classList.contains('lazy')) {
        imgRef.current.classList.remove('lazy')
      }
    }
  }, [optimizedSrc, priority, lazy, lazyLoad])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setIsError(true)
    onError?.()
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* Placeholder */}
      {!isLoaded && !isError && (
        <img
          src={generatePlaceholder()}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(10px)' }}
        />
      )}

      {/* Main Image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          imageRendering: 'crisp-edges',
          WebkitFontSmoothing: 'antialiased'
        }}
      />

      {/* Error State */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#2a2a2a] rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">Failed to load image</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#00D084] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
