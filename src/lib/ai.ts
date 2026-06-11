// AI Service for Chat Integration
// Supports OpenAI and Anthropic APIs

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIResponse {
  content: string
  error?: string
}

export class AIService {
  private static apiKey: string | null = null
  private static provider: 'openai' | 'anthropic' = 'openai'

  static initialize(provider: 'openai' | 'anthropic', apiKey: string) {
    this.provider = provider
    this.apiKey = apiKey
  }

  static async chat(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.apiKey) {
      return {
        content: 'AI service not configured. Please add API key in environment variables.',
        error: 'API key not configured'
      }
    }

    try {
      if (this.provider === 'openai') {
        return await this.chatWithOpenAI(messages)
      } else {
        return await this.chatWithAnthropic(messages)
      }
    } catch (error: any) {
      console.error('AI service error:', error)
      return {
        content: 'Sorry, I encountered an error processing your request.',
        error: error.message
      }
    }
  }

  private static async chatWithOpenAI(messages: AIMessage[]): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful cryptocurrency trading assistant. Provide concise, accurate information about crypto markets, trading strategies, and blockchain technology. Keep responses under 200 words unless asked for more detail.'
          },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'OpenAI API error')
    }

    const data = await response.json()
    
    return {
      content: data.choices[0].message.content
    }
  }

  private static async chatWithAnthropic(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('API key not configured')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        system: 'You are a helpful cryptocurrency trading assistant. Provide concise, accurate information about crypto markets, trading strategies, and blockchain technology. Keep responses under 200 words unless asked for more detail.',
        messages: messages
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Anthropic API error')
    }

    const data = await response.json()
    
    return {
      content: data.content[0].text
    }
  }

  // Crypto-specific helper functions
  static async analyzeCoin(symbol: string): Promise<AIResponse> {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Analyze ${symbol} cryptocurrency. What are its key features, use cases, and recent market performance?`
      }
    ]

    return await this.chat(messages)
  }

  static async getTradingAdvice(symbol: string): Promise<AIResponse> {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `What are the key technical indicators to watch for ${symbol}? Provide general trading considerations (not financial advice).`
      }
    ]

    return await this.chat(messages)
  }

  static async explainConcept(topic: string): Promise<AIResponse> {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Explain ${topic} in cryptocurrency in simple terms.`
      }
    ]

    return await this.chat(messages)
  }
}

// Initialize with environment variables if available
if (import.meta.env.VITE_OPENAI_API_KEY) {
  AIService.initialize('openai', import.meta.env.VITE_OPENAI_API_KEY)
} else if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
  AIService.initialize('anthropic', import.meta.env.VITE_ANTHROPIC_API_KEY)
}
