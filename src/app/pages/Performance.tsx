'use client'

import { useState, useEffect } from 'react'
import { Zap, Activity, Monitor, Smartphone, Clock, TrendingUp, AlertTriangle, CheckCircle, Settings, RefreshCw, Download, Upload, Database, Globe, Server } from 'lucide-react'
import { usePerformance } from '../hooks/usePerformance'
import { PerformancePanel } from '../components/PerformancePanel'
import { AIChat } from '../components/AIChat'

const PERFORMANCE_TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'metrics', label: 'Metrics', icon: Monitor },
  { id: 'optimization', label: 'Optimization', icon: Zap },
  { id: 'network', label: 'Network', icon: Globe },
] as const

export default function Performance() {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'optimization' | 'network'>('overview')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h')
  
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

  const handleFullAnalysis = async () => {
    setIsAnalyzing(true)
    
    // Run comprehensive analysis
    await measurePerformance()
    
    // Simulate additional analysis
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsAnalyzing(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getMetricStatus = (value: number, good: number, bad: number) => {
    if (value <= good) return { status: 'excellent', color: 'text-green-400' }
    if (value <= bad) return { status: 'good', color: 'text-yellow-400' }
    return { status: 'poor', color: 'text-red-400' }
  }

  const formatMetric = (value: number, unit: string = 'ms') => {
    if (unit === 'ms') {
      return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`
    }
    if (unit === 'MB') {
      return `${value.toFixed(1)}MB`
    }
    if (unit === 'KB') {
      return `${Math.round(value)}KB`
    }
    return `${value}`
  }

  const recommendations = getRecommendations()

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Performance Score */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Performance Score</h3>
          <div className="flex items-center space-x-2">
            <span className={`text-2xl font-bold ${getScoreColor(performanceScore)}`}>
              {performanceScore}
            </span>
            <div className={`w-3 h-3 rounded-full ${
              performanceScore >= 90 ? 'bg-green-400' :
              performanceScore >= 70 ? 'bg-yellow-400' : 'bg-red-400'
            }`}></div>
          </div>
        </div>
        
        <div className="w-full bg-[#2a2a2a] rounded-full h-3 mb-4">
          <div
            className={`h-3 rounded-full transition-all ${
              performanceScore >= 90 ? 'bg-green-400' :
              performanceScore >= 70 ? 'bg-yellow-400' : 'bg-red-400'
            }`}
            style={{ width: `${performanceScore}%` }}
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
              performanceScore >= 90 ? 'bg-green-400/20' : 'bg-red-400/20'
            }`}>
              {performanceScore >= 90 ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div className="text-white font-medium">{isOptimized ? 'Optimized' : 'Needs Work'}</div>
            <div className="text-white/60 text-xs">Status</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center mx-auto mb-2">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-white font-medium">{formatMetric(metrics.fcp)}</div>
            <div className="text-white/60 text-xs">FCP</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-purple-400/20 flex items-center justify-center mx-auto mb-2">
              <Monitor className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-white font-medium">{formatMetric(metrics.lcp)}</div>
            <div className="text-white/60 text-xs">LCP</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-orange-400/20 flex items-center justify-center mx-auto mb-2">
              <Smartphone className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-white font-medium">{formatMetric(metrics.memoryUsage, 'MB')}</div>
            <div className="text-white/60 text-xs">Memory</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleFullAnalysis}
            disabled={isAnalyzing}
            className="bg-[#00D084] hover:bg-[#00b876] disabled:bg-[#2a2a2a] disabled:text-white/40 text-white rounded-lg p-4 transition-colors flex items-center justify-center space-x-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Activity className="w-5 h-5" />
                <span>Full Analysis</span>
              </>
            )}
          </button>
          
          <button
            onClick={cleanup}
            className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-lg p-4 transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Cleanup Memory</span>
          </button>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
          <h3 className="text-white font-medium mb-4">Optimization Recommendations</h3>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <div className="text-white text-sm">{rec}</div>
                  <div className="text-white/60 text-xs mt-1">Priority: {index === 0 ? 'High' : 'Medium'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderMetrics = () => (
    <div className="space-y-6">
      {/* Core Web Vitals */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Core Web Vitals</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Monitor className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-white text-sm">First Contentful Paint (FCP)</div>
                <div className="text-white/60 text-xs">Time to first content</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${getMetricStatus(metrics.fcp, 1800, 3000).color}`}>
                {formatMetric(metrics.fcp)}
              </div>
              <div className={`text-xs ${getMetricStatus(metrics.fcp, 1800, 3000).color}`}>
                {getMetricStatus(metrics.fcp, 1800, 3000).status}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-white text-sm">Largest Contentful Paint (LCP)</div>
                <div className="text-white/60 text-xs">Largest element render</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${getMetricStatus(metrics.lcp, 2500, 4000).color}`}>
                {formatMetric(metrics.lcp)}
              </div>
              <div className={`text-xs ${getMetricStatus(metrics.lcp, 2500, 4000).color}`}>
                {getMetricStatus(metrics.lcp, 2500, 4000).status}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-orange-400" />
              <div>
                <div className="text-white text-sm">First Input Delay (FID)</div>
                <div className="text-white/60 text-xs">Interaction responsiveness</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${getMetricStatus(metrics.fid, 100, 300).color}`}>
                {formatMetric(metrics.fid)}
              </div>
              <div className={`text-xs ${getMetricStatus(metrics.fid, 100, 300).color}`}>
                {getMetricStatus(metrics.fid, 100, 300).status}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-red-400" />
              <div>
                <div className="text-white text-sm">Cumulative Layout Shift (CLS)</div>
                <div className="text-white/60 text-xs">Visual stability</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${getMetricStatus(metrics.cls * 100, 10, 25).color}`}>
                {(metrics.cls * 100).toFixed(2)}
              </div>
              <div className={`text-xs ${getMetricStatus(metrics.cls * 100, 10, 25).color}`}>
                {getMetricStatus(metrics.cls * 100, 10, 25).status}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Metrics */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Resource Metrics</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-white text-sm">Memory Usage</div>
                <div className="text-white/60 text-xs">JavaScript heap</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${getMetricStatus(metrics.memoryUsage, 50, 100).color}`}>
                {formatMetric(metrics.memoryUsage, 'MB')}
              </div>
              <div className={`text-xs ${getMetricStatus(metrics.memoryUsage, 50, 100).color}`}>
                {getMetricStatus(metrics.memoryUsage, 50, 100).status}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Server className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-white text-sm">Time to First Byte (TTFB)</div>
                <div className="text-white/60 text-xs">Server response time</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${getMetricStatus(metrics.ttfb, 600, 1000).color}`}>
                {formatMetric(metrics.ttfb)}
              </div>
              <div className={`text-xs ${getMetricStatus(metrics.ttfb, 600, 1000).color}`}>
                {getMetricStatus(metrics.ttfb, 600, 1000).status}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Download className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-white text-sm">Total Load Time</div>
                <div className="text-white/60 text-xs">Page load duration</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${getMetricStatus(metrics.loadTime, 3000, 5000).color}`}>
                {formatMetric(metrics.loadTime)}
              </div>
              <div className={`text-xs ${getMetricStatus(metrics.loadTime, 3000, 5000).color}`}>
                {getMetricStatus(metrics.loadTime, 3000, 5000).status}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderOptimization = () => (
    <div className="space-y-6">
      {/* Optimization Settings */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Optimization Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Lazy Loading</div>
              <div className="text-white/60 text-xs">Load images on scroll</div>
            </div>
            <button
              onClick={() => updateSettings({ ...settings, lazyLoading: !settings.lazyLoading })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.lazyLoading ? 'bg-[#00D084]' : 'bg-[#2a2a2a]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.lazyLoading ? 'translate-x-6' : 'translate-x-0.5'
              }`}></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Image Optimization</div>
              <div className="text-white/60 text-xs">Compress and format images</div>
            </div>
            <button
              onClick={() => updateSettings({ ...settings, imageOptimization: !settings.imageOptimization })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.imageOptimization ? 'bg-[#00D084]' : 'bg-[#2a2a2a]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.imageOptimization ? 'translate-x-6' : 'translate-x-0.5'
              }`}></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Code Splitting</div>
              <div className="text-white/60 text-xs">Load code on demand</div>
            </div>
            <button
              onClick={() => updateSettings({ ...settings, codeSplitting: !settings.codeSplitting })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.codeSplitting ? 'bg-[#00D084]' : 'bg-[#2a2a2a]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.codeSplitting ? 'translate-x-6' : 'translate-x-0.5'
              }`}></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Caching</div>
              <div className="text-white/60 text-xs">Store responses locally</div>
            </div>
            <button
              onClick={() => updateSettings({ ...settings, caching: !settings.caching })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.caching ? 'bg-[#00D084]' : 'bg-[#2a2a2a]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.caching ? 'translate-x-6' : 'translate-x-0.5'
              }`}></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Compression</div>
              <div className="text-white/60 text-xs">Compress responses</div>
            </div>
            <button
              onClick={() => updateSettings({ ...settings, compression: !settings.compression })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.compression ? 'bg-[#00D084]' : 'bg-[#2a2a2a]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.compression ? 'translate-x-6' : 'translate-x-0.5'
              }`}></div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Prefetching</div>
              <div className="text-white/60 text-xs">Preload resources</div>
            </div>
            <button
              onClick={() => updateSettings({ ...settings, prefetching: !settings.prefetching })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.prefetching ? 'bg-[#00D084]' : 'bg-[#2a2a2a]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.prefetching ? 'translate-x-6' : 'translate-x-0.5'
              }`}></div>
            </button>
          </div>
        </div>
      </div>

      {/* Bundle Analysis */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Bundle Analysis</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-white text-sm">Bundle Size</div>
                <div className="text-white/60 text-xs">Total JavaScript size</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-white">245KB</div>
              <div className="text-xs text-green-400">Good</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-white text-sm">Chunks</div>
                <div className="text-white/60 text-xs">Code split bundles</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-white">12</div>
              <div className="text-xs text-green-400">Optimized</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderNetwork = () => (
    <div className="space-y-6">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Network Performance</h3>
        <p className="text-white/60">Network analysis coming soon...</p>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'metrics':
        return renderMetrics()
      case 'optimization':
        return renderOptimization()
      case 'network':
        return renderNetwork()
      default:
        return renderOverview()
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Performance Center</h1>
          <p className="text-white/60 text-sm md:text-base">Monitor and optimize application performance</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-[#1a1a1a] rounded-lg p-1 overflow-x-auto">
          {PERFORMANCE_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#00D084] text-white'
                    : 'text-white/60 hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {renderContent()}
        </div>
      </div>
      
      {/* AI Chat */}
      <AIChat />
    </div>
  )
}
