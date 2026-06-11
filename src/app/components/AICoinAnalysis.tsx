'use client'

import { useState, useEffect } from 'react'
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useAIAssistant, CoinAnalysis } from '../hooks/useAIAssistant'

interface AICoinAnalysisProps {
  symbol: string
  className?: string
}

export function AICoinAnalysis({ symbol, className = '' }: AICoinAnalysisProps) {
  const { analyzeCoin } = useAIAssistant()
  const [analysis, setAnalysis] = useState<CoinAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!symbol) return
      
      setLoading(true)
      setError(null)
      
      try {
        const result = await analyzeCoin(symbol)
        setAnalysis(result)
      } catch (e: any) {
        setError(e.message || 'Failed to analyze coin')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [symbol, analyzeCoin])

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'bearish':
        return <TrendingDown className="w-4 h-4 text-red-400" />
      default:
        return <Minus className="w-4 h-4 text-yellow-400" />
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />
    }
  }

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'strong_buy': return 'bg-green-500'
      case 'buy': return 'bg-emerald-500'
      case 'hold': return 'bg-yellow-500'
      case 'sell': return 'bg-orange-500'
      case 'strong_sell': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getRecommendationText = (rec: string) => {
    switch (rec) {
      case 'strong_buy': return 'Strong Buy'
      case 'buy': return 'Buy'
      case 'hold': return 'Hold'
      case 'sell': return 'Sell'
      case 'strong_sell': return 'Strong Sell'
      default: return 'Neutral'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400'
    if (confidence >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400'
    if (score >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <div className={`bg-[#111111] border border-[#1e1e1e] rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00D084] border-t-transparent"></div>
          <span className="ml-3 text-white/60">AI analyzing {symbol}...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-[#111111] border border-[#1e1e1e] rounded-lg p-4 ${className}`}>
        <div className="text-center py-4">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">Failed to load AI analysis</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return null
  }

  return (
    <div className={`bg-[#111111] border border-[#1e1e1e] rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-[#00D084]" />
          <h3 className="text-white font-medium">AI Analysis: {analysis.symbol}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${getConfidenceColor(analysis.confidence)}`}>
            {analysis.confidence}% confidence
          </span>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Overall Score */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/60 text-sm">Overall Score</span>
            {getSentimentIcon(analysis.sentiment)}
          </div>
          <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
            {analysis.overallScore}/100
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/60 text-sm">Risk Level</span>
            {getRiskIcon(analysis.riskLevel)}
          </div>
          <div className={`text-base sm:text-lg font-bold capitalize ${
            analysis.riskLevel === 'low' ? 'text-green-400' :
            analysis.riskLevel === 'high' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {analysis.riskLevel}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-sm">AI Recommendation</span>
          <span className={`text-xs ${getConfidenceColor(analysis.confidence)}`}>
            Based on {analysis.reasoning.length} factors
          </span>
        </div>
        <div className={`${getRecommendationColor(analysis.recommendation)} text-white rounded-lg px-3 py-2 text-center font-medium`}>
          {getRecommendationText(analysis.recommendation)}
        </div>
      </div>

      {/* Price Predictions */}
      <div className="mb-4">
        <h4 className="text-white/60 text-sm mb-2">Price Predictions</h4>
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          <div className="bg-[#1a1a1a] rounded-lg p-2 text-center">
            <div className="text-white/60 text-xs mb-1">7 days</div>
            <div className="text-white font-medium text-sm">
              ${(analysis.pricePrediction.short / 1000).toFixed(1)}k
            </div>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-2 text-center">
            <div className="text-white/60 text-xs mb-1">4 weeks</div>
            <div className="text-white font-medium text-sm">
              ${(analysis.pricePrediction.medium / 1000).toFixed(1)}k
            </div>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-2 text-center">
            <div className="text-white/60 text-xs mb-1">3 months</div>
            <div className="text-white font-medium text-sm">
              ${(analysis.pricePrediction.long / 1000).toFixed(1)}k
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Factors */}
      <div className="mb-4">
        <h4 className="text-white/60 text-sm mb-2">Analysis Factors</h4>
        <div className="space-y-2">
          {Object.entries(analysis.factors).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-white/60 text-sm capitalize">{key}</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-[#2a2a2a] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      value >= 70 ? 'bg-green-400' :
                      value >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${value}%` }}
                  ></div>
                </div>
                <span className={`text-sm font-medium ${
                  value >= 70 ? 'text-green-400' :
                  value >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {value}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Reasoning */}
      <div className="mb-4">
        <h4 className="text-white/60 text-sm mb-2">Key Reasoning</h4>
        <div className="space-y-1">
          {analysis.reasoning.map((reason, index) => (
            <div key={index} className="flex items-start space-x-2">
              <span className="text-[#00D084] text-sm">•</span>
              <span className="text-white/80 text-sm">{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center">
        <span className="text-white/40 text-xs">
          Last updated: {new Date(analysis.lastUpdated).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}
