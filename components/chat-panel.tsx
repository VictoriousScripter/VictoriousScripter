'use client'

import { useRef, useEffect } from 'react'
import { Send, Bot, User, MousePointer2, Type, Scroll, Navigation, Search, Clock, CheckCircle, XCircle } from 'lucide-react'
import type { UIMessage } from 'ai'
import type { AgentStatus } from '@/lib/browser-types'
import { AgentStatusPanel } from './agent-status'

interface ChatPanelProps {
  messages: UIMessage[]
  input: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  agentStatus: AgentStatus
  currentAction: string | null
  progress: number | null
  onStart: () => void
  onPause: () => void
  onStop: () => void
  hasPageLoaded: boolean
}

function getActionIcon(action: string) {
  switch (action) {
    case 'click': return <MousePointer2 className="h-4 w-4" />
    case 'type': return <Type className="h-4 w-4" />
    case 'scroll': return <Scroll className="h-4 w-4" />
    case 'navigate': return <Navigation className="h-4 w-4" />
    case 'extract': return <Search className="h-4 w-4" />
    case 'wait': return <Clock className="h-4 w-4" />
    case 'complete': return <CheckCircle className="h-4 w-4 text-green-400" />
    case 'progress': return <Bot className="h-4 w-4" />
    default: return <Bot className="h-4 w-4" />
  }
}

function ToolCallDisplay({ toolCall }: { toolCall: { toolName: string; args: Record<string, unknown>; state: string } }) {
  const args = toolCall.args as { description?: string; message?: string; selector?: string; text?: string; url?: string }
  
  return (
    <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="rounded-md bg-cyan-500/20 p-1.5 text-cyan-400">
        {getActionIcon(toolCall.toolName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white/80 capitalize">{toolCall.toolName.replace(/([A-Z])/g, ' $1').trim()}</p>
        <p className="text-xs text-white/50 truncate">
          {args.description || args.message || args.selector || args.text || args.url || 'Executing...'}
        </p>
      </div>
      {toolCall.state === 'output-available' ? (
        <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
      ) : toolCall.state === 'output-error' ? (
        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
      ) : (
        <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      )}
    </div>
  )
}

function MessageContent({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`shrink-0 rounded-xl p-2 ${isUser ? 'bg-blue-500/20 text-blue-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>
      <div className={`flex max-w-[85%] flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {message.parts?.map((part, i) => {
          if (part.type === 'text' && part.text) {
            return (
              <div
                key={i}
                className={`rounded-2xl px-4 py-2.5 ${
                  isUser 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                    : 'border border-white/10 bg-white/5 text-white/90'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{part.text}</p>
              </div>
            )
          }
          if (part.type === 'tool-invocation') {
            return <ToolCallDisplay key={i} toolCall={part} />
          }
          return null
        })}
      </div>
    </div>
  )
}

export function ChatPanel({
  messages,
  input,
  onInputChange,
  onSubmit,
  isLoading,
  agentStatus,
  currentAction,
  progress,
  onStart,
  onPause,
  onStop,
  hasPageLoaded,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 p-2">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Browser Agent</h2>
            <p className="text-xs text-white/50">AI-powered web automation</p>
          </div>
        </div>
      </div>

      {/* Agent Status Panel */}
      <div className="border-b border-white/10 p-4">
        <AgentStatusPanel
          status={agentStatus}
          currentAction={currentAction}
          progress={progress}
          onStart={onStart}
          onPause={onPause}
          onStop={onStop}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
              <Bot className="mx-auto h-12 w-12 text-cyan-400/60" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-white">Ready to assist</h3>
            <p className="mt-2 max-w-xs text-sm text-white/50">
              {hasPageLoaded 
                ? 'Tell me what you want to do on this page and I will handle it for you.'
                : 'Load a webpage first, then tell me what task you want me to perform.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageContent key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-4">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={hasPageLoaded ? "Tell me what to do on this page..." : "Load a webpage first..."}
            disabled={!hasPageLoaded || isLoading}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || !hasPageLoaded || isLoading}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 p-3 text-white transition-all hover:from-cyan-400 hover:to-blue-400 hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:hover:shadow-none"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
