'use client'

import { useState, useCallback } from 'react'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  coinAnalysis?: CoinAnalysis
}

export interface CoinAnalysis {
  symbol: string
  overallScore: number // 0-100
  confidence: number // 0-100%
  sentiment: 'bullish' | 'bearish' | 'neutral'
  riskLevel: 'low' | 'medium' | 'high'
  pricePrediction: {
    short: number // 1-7 days
    medium: number // 1-4 weeks
    long: number // 1-3 months
  }
  factors: {
    technical: number
    fundamental: number
    sentiment: number
    market: number
  }
  reasoning: string[]
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
  lastUpdated: number
}

export function useAIAssistant() {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Simulated AI responses - replace with real API call
  const generateAIResponse = useCallback(async (userMessage: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    const lowerMessage = userMessage.toLowerCase()
    
    // Coin analysis responses
    if (lowerMessage.includes('btc') || lowerMessage.includes('bitcoin')) {
      return `Bitcoin (BTC) Analysis:

📊 **Overall Score: 78/100**
🎯 **Confidence: 85%**

**Current Assessment:**
- **Sentiment:** Bullish 🟢
- **Risk Level:** Medium ⚠️
- **Recommendation:** BUY 📈

**Price Predictions:**
- Short term (7 days): $48,000-$52,000
- Medium term (4 weeks): $50,000-$55,000
- Long term (3 months): $55,000-$65,000

**Key Factors:**
✅ Strong institutional adoption
✅ ETF inflows continue
✅ Halving momentum
⚠️ Regulatory uncertainty
⚠️ Market volatility

**Technical Analysis:**
- RSI: 65 (neutral-bullish)
- MACD: Bullish crossover
- Volume: Above average

**Fundamentals:**
- Market Cap: $920B
- 24h Volume: $28B
- Dominance: 48%

**My Opinion:** Bitcoin shows strong fundamentals with positive momentum. The recent ETF approvals and institutional interest provide solid support. Consider dollar-cost averaging for long-term positions.`
    }
    
    if (lowerMessage.includes('eth') || lowerMessage.includes('ethereum')) {
      return `Ethereum (ETH) Analysis:

📊 **Overall Score: 72/100**
🎯 **Confidence: 78%**

**Current Assessment:**
- **Sentiment:** Bullish 🟢
- **Risk Level:** Medium ⚠️
- **Recommendation:** BUY 📈

**Price Predictions:**
- Short term (7 days): $2,800-$3,200
- Medium term (4 weeks): $3,000-$3,500
- Long term (3 months): $3,200-$4,000

**Key Factors:**
✅ Layer 2 ecosystem growth
✅ DeFi activity recovering
✅ Shanghai upgrade benefits
⚠️ Gas fees volatility
⚠️ Competition from other L1s

**Technical Analysis:**
- RSI: 60 (neutral)
- MACD: Slightly bullish
- Volume: Moderate

**Fundamentals:**
- Market Cap: $340B
- 24h Volume: $15B
- TVL in DeFi: $28B

**My Opinion:** Ethereum's ecosystem continues to expand with Layer 2 solutions reducing costs. The transition to PoS and upcoming upgrades make it attractive for long-term holding.`
    }
    
    if (lowerMessage.includes('sol') || lowerMessage.includes('solana')) {
      return `Solana (SOL) Analysis:

📊 **Overall Score: 65/100**
🎯 **Confidence: 70%**

**Current Assessment:**
- **Sentiment:** Neutral 🟡
- **Risk Level:** High 🔴
- **Recommendation:** HOLD ⏸️

**Price Predictions:**
- Short term (7 days): $95-$110
- Medium term (4 weeks): $90-$120
- Long term (3 months): $80-$140

**Key Factors:**
✅ Fast transaction speeds
✅ Growing DeFi ecosystem
✅ Mobile app adoption
⚠️ Network reliability concerns
⚠️ High competition
⚠️ Regulatory scrutiny

**Technical Analysis:**
- RSI: 55 (neutral)
- MACD: Neutral
- Volume: Decreasing

**My Opinion:** Solana has strong technology but faces reliability and competition challenges. Suitable for speculative positions with strict risk management.`
    }
    
    // General crypto questions
    if (lowerMessage.includes('what is') || lowerMessage.includes('explain')) {
      return `I'm here to help you understand cryptocurrency concepts! 

**What would you like to know about?**
- Specific coins (BTC, ETH, SOL, etc.)
- Trading strategies
- Market analysis
- DeFi protocols
- Technical indicators
- Risk management

Feel free to ask me about any cryptocurrency topic, and I'll provide detailed analysis with confidence scores! 🚀`
    }
    
    if (lowerMessage.includes('portfolio') || lowerMessage.includes('invest')) {
      return `**Portfolio Strategy Advice:**

📊 **Current Market Outlook: Bullish with caution**

**Recommended Allocation:**
- **Large Caps (60%):** BTC, ETH
- **Mid Caps (25%):** SOL, AVAX, DOT
- **Small Caps (10%):** Emerging projects
- **Stablecoins (5%):** For opportunities

**Risk Management:**
- Stop-loss at -15%
- Take profit at +30%
- Rebalance monthly
- DCA strategy for entry

**Key Principles:**
✅ Only invest what you can afford to lose
✅ Diversify across sectors
✅ Stay informed about regulations
✅ Use proper security measures

**Current Hot Sectors:**
- AI & Big Data tokens
- Real World Assets (RWA)
- Layer 2 solutions
- DeFi protocols

Would you like me to analyze specific coins for your portfolio?`
    }
    
    // Default response
    return `I'm your AI crypto assistant! 🤖

**I can help you with:**
📈 **Coin Analysis** - Ask me about any cryptocurrency
📊 **Market Predictions** - Get AI-powered forecasts
💡 **Trading Strategies** - Learn about different approaches
🔍 **Technical Analysis** - Understand chart patterns
⚠️ **Risk Assessment** - Evaluate investment risks

**Try asking:**
- "Analyze BTC"
- "What do you think about ETH?"
- "Should I invest in SOL?"
- "Explain portfolio diversification"
- "What's your market outlook?"

All my analysis includes confidence scores and risk assessments! What would you like to know?`
  }, [])

  const analyzeCoin = useCallback(async (symbol: string): Promise<CoinAnalysis> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const analyses: Record<string, CoinAnalysis> = {
      'BTC': {
        symbol: 'BTC',
        overallScore: 78,
        confidence: 85,
        sentiment: 'bullish',
        riskLevel: 'medium',
        pricePrediction: {
          short: 50000,
          medium: 55000,
          long: 65000
        },
        factors: {
          technical: 75,
          fundamental: 85,
          sentiment: 80,
          market: 72
        },
        reasoning: [
          'Strong institutional adoption continues',
          'ETF inflows showing positive momentum',
          'Technical indicators showing bullish patterns',
          'Market sentiment improving post-halving'
        ],
        recommendation: 'buy',
        lastUpdated: Date.now()
      },
      'ETH': {
        symbol: 'ETH',
        overallScore: 72,
        confidence: 78,
        sentiment: 'bullish',
        riskLevel: 'medium',
        pricePrediction: {
          short: 3200,
          medium: 3500,
          long: 4000
        },
        factors: {
          technical: 70,
          fundamental: 80,
          sentiment: 68,
          market: 70
        },
        reasoning: [
          'Layer 2 ecosystem expanding rapidly',
          'DeFi activity showing recovery signs',
          'Shanghai upgrade benefits materializing',
          'Competition increasing but network effects strong'
        ],
        recommendation: 'buy',
        lastUpdated: Date.now()
      },
      'SOL': {
        symbol: 'SOL',
        overallScore: 65,
        confidence: 70,
        sentiment: 'neutral',
        riskLevel: 'high',
        pricePrediction: {
          short: 105,
          medium: 115,
          long: 130
        },
        factors: {
          technical: 60,
          fundamental: 65,
          sentiment: 70,
          market: 65
        },
        reasoning: [
          'Fast transaction speeds remain competitive',
          'DeFi ecosystem growing but volatile',
          'Network reliability concerns persist',
          'High competition in L1 space'
        ],
        recommendation: 'hold',
        lastUpdated: Date.now()
      }
    }
    
    return analyses[symbol.toUpperCase()] || {
      symbol: symbol.toUpperCase(),
      overallScore: 50,
      confidence: 60,
      sentiment: 'neutral',
      riskLevel: 'medium',
      pricePrediction: {
        short: 0,
        medium: 0,
        long: 0
      },
      factors: {
        technical: 50,
        fundamental: 50,
        sentiment: 50,
        market: 50
      },
      reasoning: ['Limited data available for analysis'],
      recommendation: 'hold',
      lastUpdated: Date.now()
    }
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    
    try {
      const response = await generateAIResponse(content)
      
      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI Error:', error)
      
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [generateAIResponse])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isLoading,
    isOpen,
    setIsOpen,
    sendMessage,
    analyzeCoin,
    clearMessages
  }
}
