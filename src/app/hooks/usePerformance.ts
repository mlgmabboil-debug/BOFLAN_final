'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface PerformanceMetrics {
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  ttfb: number // Time to First Byte
  loadTime: number // Total load time
  memoryUsage: number // Memory usage in MB
  bundleSize: number // Bundle size in KB
}

export interface OptimizationSettings {
  lazyLoading: boolean
  imageOptimization: boolean
  codeSplitting: boolean
  caching: boolean
  compression: boolean
  minification: boolean
  prefetching: boolean
  serviceWorker: boolean
}

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
    ttfb: 0,
    loadTime: 0,
    memoryUsage: 0,
    bundleSize: 0
  })
  
  const [settings, setSettings] = useState<OptimizationSettings>({
    lazyLoading: true,
    imageOptimization: true,
    codeSplitting: true,
    caching: true,
    compression: true,
    minification: true,
    prefetching: true,
    serviceWorker: true
  })
  
  const [isOptimized, setIsOptimized] = useState(false)
  const [performanceScore, setPerformanceScore] = useState(0)
  const observerRef = useRef<PerformanceObserver | null>(null)

  // Measure performance metrics
  const measurePerformance = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) return

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    const newMetrics: PerformanceMetrics = {
      fcp: 0,
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: navigation.responseStart - navigation.requestStart,
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      memoryUsage: (performance as any).memory ? (performance as any).memory.usedJSHeapSize / 1024 / 1024 : 0,
      bundleSize: 0
    }

    // Get Web Vitals
    const paintEntries = performance.getEntriesByType('paint')
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    if (fcpEntry) {
      newMetrics.fcp = fcpEntry.startTime
    }

    // Calculate performance score (0-100)
    const score = calculatePerformanceScore(newMetrics)
    setPerformanceScore(score)
    setMetrics(newMetrics)
    setIsOptimized(score >= 90)
  }, [])

  // Calculate performance score
  const calculatePerformanceScore = (metrics: PerformanceMetrics): number => {
    let score = 100
    
    // FCP penalty (should be < 1.8s)
    if (metrics.fcp > 1800) score -= Math.min(20, (metrics.fcp - 1800) / 100)
    
    // LCP penalty (should be < 2.5s)
    if (metrics.lcp > 2500) score -= Math.min(25, (metrics.lcp - 2500) / 100)
    
    // FID penalty (should be < 100ms)
    if (metrics.fid > 100) score -= Math.min(20, (metrics.fid - 100) / 10)
    
    // CLS penalty (should be < 0.1)
    if (metrics.cls > 0.1) score -= Math.min(15, metrics.cls * 100)
    
    // TTFB penalty (should be < 600ms)
    if (metrics.ttfb > 600) score -= Math.min(15, (metrics.ttfb - 600) / 50)
    
    // Memory penalty (should be < 50MB)
    if (metrics.memoryUsage > 50) score -= Math.min(10, (metrics.memoryUsage - 50) / 5)
    
    return Math.max(0, Math.round(score))
  }

  // Initialize performance monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Measure initial performance
    setTimeout(measurePerformance, 1000)

    // Set up performance observer for LCP
    try {
      observerRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        if (lastEntry.startTime) {
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }))
        }
      })
      observerRef.current.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (error) {
      console.warn('Performance Observer not supported')
    }

    // Monitor CLS
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
        setMetrics(prev => ({ ...prev, cls: clsValue }))
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (error) {
      console.warn('CLS Observer not supported')
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [measurePerformance])

  // Lazy loading utility
  const lazyLoad = useCallback((element: HTMLElement, threshold = 0.1) => {
    if (!('IntersectionObserver' in window)) {
      (element as any).src = element.dataset.src || ''
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            img.src = img.dataset.src || ''
            img.classList.remove('lazy')
            observer.unobserve(img)
          }
        })
      },
      { threshold }
    )

    observer.observe(element)
  }, [])

  // Image optimization utility
  const optimizeImage = useCallback((src: string, options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpeg' | 'png'
  } = {}) => {
    const { width, height, quality = 80, format = 'webp' } = options
    
    // This would normally be handled by an image optimization service
    let optimizedSrc = src
    
    if (width || height) {
      const sizeParam = width ? `w=${width}` : `h=${height}`
      optimizedSrc += `?${sizeParam}`
    }
    
    optimizedSrc += `&q=${quality}&f=${format}`
    
    return optimizedSrc
  }, [])

  // Code splitting utility
  const loadComponent = useCallback(async (componentPath: string) => {
    try {
      const module = await import(/* webpackChunkName: "[request]" */ `../components/${componentPath}`)
      return module.default
    } catch (error) {
      console.error('Failed to load component:', error)
      return null
    }
  }, [])

  // Caching utility
  const cache = useCallback((key: string, data: any, ttl: number = 3600000) => {
    if (typeof window === 'undefined') return
    
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl
    }
    
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }, [])

  const getCached = useCallback((key: string) => {
    if (typeof window === 'undefined') return null
    
    try {
      const cached = localStorage.getItem(`cache_${key}`)
      if (!cached) return null
      
      const cacheData = JSON.parse(cached)
      const isExpired = Date.now() - cacheData.timestamp > cacheData.ttl
      
      if (isExpired) {
        localStorage.removeItem(`cache_${key}`)
        return null
      }
      
      return cacheData.data
    } catch (error) {
      console.warn('Failed to get cached data:', error)
      return null
    }
  }, [])

  // Prefetching utility
  const prefetch = useCallback((url: string) => {
    if (typeof window === 'undefined') return
    
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
  }, [])

  // Debounce utility for performance
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: any
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }, [])

  // Throttle utility for performance
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle = false
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => { inThrottle = false }, limit)
      }
    }
  }, [])

  // Memory cleanup
  const cleanup = useCallback(() => {
    if (typeof window === 'undefined') return
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc()
    }
    
    // Clear old caches
    const keys = Object.keys(localStorage)
    const now = Date.now()
    
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        try {
          const cached = JSON.parse(localStorage.getItem(key) || '{}')
          if (now - cached.timestamp > cached.ttl) {
            localStorage.removeItem(key)
          }
        } catch (error) {
          localStorage.removeItem(key)
        }
      }
    })
  }, [])

  // Bundle analyzer
  const analyzeBundle = useCallback(() => {
    if (typeof window === 'undefined') return 0
    
    // Simulate bundle size calculation
    const scripts = document.querySelectorAll('script[src]')
    let totalSize = 0
    
    scripts.forEach(script => {
      // This would normally be calculated during build
      totalSize += Math.random() * 100 // Simulated size
    })
    
    return Math.round(totalSize)
  }, [])

  // Performance recommendations
  const getRecommendations = useCallback(() => {
    const recommendations: string[] = []
    
    if (metrics.fcp > 1800) {
      recommendations.push('Optimize initial server response time')
    }
    
    if (metrics.lcp > 2500) {
      recommendations.push('Optimize images and reduce render-blocking resources')
    }
    
    if (metrics.fid > 100) {
      recommendations.push('Reduce JavaScript execution time')
    }
    
    if (metrics.cls > 0.1) {
      recommendations.push('Ensure images have dimensions and avoid layout shifts')
    }
    
    if (metrics.memoryUsage > 50) {
      recommendations.push('Optimize memory usage and reduce object allocations')
    }
    
    if (metrics.ttfb > 600) {
      recommendations.push('Improve server response time and CDN usage')
    }
    
    return recommendations
  }, [metrics])

  return {
    metrics,
    settings,
    isOptimized,
    performanceScore,
    measurePerformance,
    lazyLoad,
    optimizeImage,
    loadComponent,
    cache,
    getCached,
    prefetch,
    debounce,
    throttle,
    cleanup,
    analyzeBundle,
    getRecommendations,
    updateSettings: setSettings
  }
}
