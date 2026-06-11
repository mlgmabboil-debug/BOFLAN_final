'use client'

import { useState, useEffect } from 'react'
import { Zap, Activity, Monitor, Smartphone, Clock, TrendingUp, AlertTriangle, CheckCircle, Settings, RefreshCw } from 'lucide-react'
import { usePerformance } from '../hooks/usePerformance'

interface PerformancePanelProps {
  className?: string
}

export function PerformancePanel({ className = '' }: PerformancePanelProps) {
  const {
    metrics,
    settings,
    isOptimized,
    performanceScore,
    measurePerformance,
    cleanup,
    getRecommendations,
    updateSettings
  } = usePerformance()

  const [isExpanded, setIsExpanded] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)

  const recommendations = getRecommendations()

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getMetricColor = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value <= threshold : value >= threshold
    return isGood ? 'text-green-400' : 'text-red-400'
  }

  const formatMetric = (value: number, unit: string = 'ms') => {
    if (unit === 'ms') {
      return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`
    }
    if (unit === 'MB') {
      return `${value.toFixed(1)}MB`
    }
    return `${value}`
  }

  const handleOptimization = async () => {
    // Force garbage collection if available
    cleanup()
    
    // Re-measure performance
    await new Promise(resolve => setTimeout(resolve, 100))
    measurePerformance()
  }

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring)
    if (!isMonitoring) {
      measurePerformance()
    }
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 sm:right-auto sm:left-4 z-50 ${className}`}>
      {/* Compact View */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`bg-[#111111] border border-[#1e1e1e] rounded-lg p-3 flex items-center space-x-2 hover:border-[#00D084] transition-colors ${
            isOptimized ? 'border-green-400/30' : 'border-red-400/30'
          }`}
        >
          <Zap className={`w-4 h-4 ${getScoreColor(performanceScore)}`} />
          <span className={`text-sm font-medium ${getScoreColor(performanceScore)}`}>
            {performanceScore}
          </span>
          <div className={`w-2 h-2 rounded-full ${
            isOptimized ? 'bg-green-400' : 'bg-red-400'
          }`}></div>
        </button>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg p-4 w-full sm:w-80 max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Zap className={`w-5 h-5 ${getScoreColor(performanceScore)}`} />
              <h3 className="text-white font-medium">Performance</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMonitoring}
                className={`p-1 rounded transition-colors ${
                  isMonitoring ? 'text-[#00D084]' : 'text-white/40 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-white/40 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Performance Score */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Overall Score</span>
              <span className={`text-sm font-medium ${getScoreColor(performanceScore)}`}>
                {performanceScore}/100
              </span>
            </div>
            <div className="w-full bg-[#2a2a2a] rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  performanceScore >= 90 ? 'bg-green-400' :
                  performanceScore >= 70 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${performanceScore}%` }}
              />
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Monitor className="w-4 h-4 text-blue-400" />
                <span className="text-white/60 text-sm">FCP</span>
              </div>
              <span className={`text-sm ${getMetricColor(metrics.fcp, 1800)}`}>
                {formatMetric(metrics.fcp)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-white/60 text-sm">LCP</span>
              </div>
              <span className={`text-sm ${getMetricColor(metrics.lcp, 2500)}`}>
                {formatMetric(metrics.lcp)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-white/60 text-sm">FID</span>
              </div>
              <span className={`text-sm ${getMetricColor(metrics.fid, 100)}`}>
                {formatMetric(metrics.fid)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-green-400" />
                <span className="text-white/60 text-sm">Memory</span>
              </div>
              <span className={`text-sm ${getMetricColor(metrics.memoryUsage, 50, true)}`}>
                {formatMetric(metrics.memoryUsage, 'MB')}
              </span>
            </div>
          </div>

          {/* Optimization Settings */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Lazy Loading</span>
              <button
                onClick={() => updateSettings({ ...settings, lazyLoading: !settings.lazyLoading })}
                className={`w-8 h-4 rounded-full transition-colors ${
                  settings.lazyLoading ? 'bg-[#00D084]' : 'bg-[#2a2a2a]'
                }`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                  settings.lazyLoading ? 'translate-x-4' : 'translate-x-0.5'
                }`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Image Optimization</span>
              <button
                onClick={() => updateSettings({ ...settings, imageOptimization: !settings.imageOptimization })}
                className={`w-8 h-4 rounded-full transition-colors ${
                  settings.imageOptimization ? 'bg-[#00D084]' : 'bg-[#2a2a2a]'
                }`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                  settings.imageOptimization ? 'translate-x-4' : 'translate-x-0.5'
                }`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Caching</span>
              <button
                onClick={() => updateSettings({ ...settings, caching: !settings.caching })}
                className={`w-8 h-4 rounded-full transition-colors ${
                  settings.caching ? 'bg-[#00D084]' : 'bg-[#2a2a2a]'
                }`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                  settings.caching ? 'translate-x-4' : 'translate-x-0.5'
                }`}></div>
              </button>
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mb-4">
              <h4 className="text-white/60 text-sm mb-2">Recommendations</h4>
              <div className="space-y-1">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5" />
                    <span className="text-white/80 text-xs">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleOptimization}
              className="flex-1 bg-[#00D084] hover:bg-[#00b876] text-white rounded-md py-2 text-sm font-medium transition-colors flex items-center justify-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Optimize</span>
            </button>
            <button
              onClick={measurePerformance}
              className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md py-2 text-sm font-medium transition-colors"
            >
              Measure
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
