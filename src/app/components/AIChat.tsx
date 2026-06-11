'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, X, Minimize2, Maximize2, Bot, User, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useAIAssistant, AIMessage } from '../hooks/useAIAssistant'

interface AIChatProps {
  className?: string
}

export function AIChat({ className = '' }: AIChatProps) {
  const {
    messages,
    isLoading,
    isOpen,
    setIsOpen,
    sendMessage,
    clearMessages
  } = useAIAssistant()
  
  const [inputValue, setInputValue] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, index) => {
      // Bold text
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Emojis
      line = line.replace(/🟢/g, '<span class="text-green-400">🟢</span>')
      line = line.replace(/🔴/g, '<span class="text-red-400">🔴</span>')
      line = line.replace(/🟡/g, '<span class="text-yellow-400">🟡</span>')
      line = line.replace(/📊/g, '<span class="text-blue-400">📊</span>')
      line = line.replace(/🎯/g, '<span class="text-purple-400">🎯</span>')
      line = line.replace(/⚠️/g, '<span class="text-yellow-400">⚠️</span>')
      line = line.replace(/✅/g, '<span class="text-green-400">✅</span>')
      line = line.replace(/📈/g, '<span class="text-green-400">📈</span>')
      line = line.replace(/⏸️/g, '<span class="text-gray-400">⏸️</span>')
      line = line.replace(/🤖/g, '<span class="text-blue-400">🤖</span>')
      line = line.replace(/🚀/g, '<span class="text-purple-400">🚀</span>')
      
      return (
        <p key={index} className="mb-1" dangerouslySetInnerHTML={{ __html: line }} />
      )
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400'
    if (confidence >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'strong_buy': return 'text-green-400'
      case 'buy': return 'text-emerald-400'
      case 'hold': return 'text-yellow-400'
      case 'sell': return 'text-orange-400'
      case 'strong_sell': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 bg-[#00D084] hover:bg-[#00b876] text-white rounded-full p-3 sm:p-4 shadow-lg transition-all duration-200 hover:scale-105 z-50 ${className}`}
      >
        <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    )
  }

  return (
    <div className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 sm:max-w-[85vw] bg-[#111111] border border-[#1e1e1e] rounded-lg shadow-xl z-50 ${isMinimized ? 'h-14' : 'h-[500px] sm:h-[600px]'} flex flex-col transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#1e1e1e]">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-[#00D084]" />
          <span className="text-white font-medium">AI Crypto Assistant</span>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-white/60 hover:text-white transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-[#00D084] mx-auto mb-3" />
                <h3 className="text-white font-medium mb-2">AI Crypto Assistant</h3>
                <p className="text-white/60 text-sm mb-4">
                  Ask me about any cryptocurrency, market analysis, or trading strategies!
                </p>
                <div className="text-left space-y-2 text-xs text-white/40">
                  <p>• "Analyze BTC"</p>
                  <p>• "What do you think about ETH?"</p>
                  <p>• "Should I invest in SOL?"</p>
                  <p>• "Explain portfolio strategy"</p>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-2 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-[#00D084] rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-[#00D084] text-white'
                      : 'bg-[#1a1a1a] text-white'
                  }`}
                >
                  <div className="text-sm leading-relaxed">
                    {formatMessage(message.content)}
                  </div>
                  <div className="text-xs opacity-70 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-[#2a2a2a] rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 bg-[#00D084] rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-[#1e1e1e]">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about any crypto..."
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084]/20"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="bg-[#00D084] hover:bg-[#00b876] disabled:bg-[#2a2a2a] disabled:text-white/40 text-white rounded-md p-2 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="mt-2 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                Clear conversation
              </button>
            )}
          </form>
        </>
      )}
    </div>
  )
}
