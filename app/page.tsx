'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { BrowserFrame } from '@/components/browser-frame'
import { ChatPanel } from '@/components/chat-panel'
import { Menu, X, Bot, Globe } from 'lucide-react'
import type { PageInfo, AgentAction, AgentStatus } from '@/lib/browser-types'

export default function BrowserAgentPage() {
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle')
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [latestAction, setLatestAction] = useState<AgentAction | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [input, setInput] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/browser-agent',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          pageInfo,
        },
      }),
    }),
    onToolCall: ({ toolCall }) => {
      // Handle tool calls from the agent
      const args = toolCall.args as AgentAction
      
      if (args.action === 'progress') {
        setCurrentAction(args.message || null)
        setProgress(args.percentComplete ?? null)
      } else if (args.action === 'complete') {
        setAgentStatus('completed')
        setCurrentAction(args.summary || 'Task completed')
        setProgress(100)
      } else {
        setCurrentAction(args.description || args.message || `Executing ${args.action}`)
        setLatestAction(args)
      }
    },
    onFinish: () => {
      if (agentStatus === 'running') {
        setAgentStatus('completed')
      }
    },
    onError: () => {
      setAgentStatus('error')
      setCurrentAction('An error occurred')
    },
  })

  // Update agent status based on chat status
  useEffect(() => {
    if (status === 'streaming' || status === 'submitted') {
      setAgentStatus('running')
    }
  }, [status])

  const handlePageInfo = useCallback((info: PageInfo) => {
    setPageInfo(info)
  }, [])

  const handleStart = useCallback(() => {
    if (messages.length > 0 && pageInfo) {
      setAgentStatus('running')
      // Re-send the last user message to continue
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()
      if (lastUserMessage) {
        const text = lastUserMessage.parts
          ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map(p => p.text)
          .join('') || ''
        if (text) {
          sendMessage({ text })
        }
      }
    }
  }, [messages, pageInfo, sendMessage])

  const handlePause = useCallback(() => {
    if (agentStatus === 'paused') {
      setAgentStatus('running')
    } else {
      setAgentStatus('paused')
      abortControllerRef.current?.abort()
    }
  }, [agentStatus])

  const handleStop = useCallback(() => {
    setAgentStatus('idle')
    setCurrentAction(null)
    setProgress(null)
    abortControllerRef.current?.abort()
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !pageInfo) return

    setAgentStatus('running')
    setProgress(null)
    setCurrentAction('Analyzing task...')
    sendMessage({ text: input })
    setInput('')
  }, [input, pageInfo, sendMessage, setInput])

  const handleClearChat = useCallback(() => {
    setMessages([])
    setAgentStatus('idle')
    setCurrentAction(null)
    setProgress(null)
    setLatestAction(null)
  }, [setMessages])

  const isAgentActive = agentStatus === 'running'

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="z-10 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-2 shadow-lg shadow-cyan-500/20">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Browser Agent</h1>
              <p className="text-xs text-white/50">AI-Powered Web Automation</p>
            </div>
          </div>
          
          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <button
              onClick={handleClearChat}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              Clear Chat
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className={`h-2 w-2 rounded-full ${pageInfo ? 'bg-green-400' : 'bg-white/30'}`} />
              <span className="text-sm text-white/60">{pageInfo ? 'Page Loaded' : 'No Page'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Browser section */}
        <div className="flex-1 p-4 lg:pr-2">
          <BrowserFrame 
            onPageInfo={handlePageInfo} 
            agentAction={latestAction} 
            isAgentActive={isAgentActive} 
          />
        </div>

        {/* Chat panel - Desktop */}
        <div className="hidden w-[400px] p-4 pl-2 lg:block">
          <ChatPanel
            messages={messages}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            isLoading={status === 'streaming' || status === 'submitted'}
            agentStatus={agentStatus}
            currentAction={currentAction}
            progress={progress}
            onStart={handleStart}
            onPause={handlePause}
            onStop={handleStop}
            hasPageLoaded={!!pageInfo}
          />
        </div>

        {/* Mobile chat panel overlay */}
        {isMobileMenuOpen && (
          <div className="absolute inset-0 z-20 flex flex-col bg-slate-950/95 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-cyan-400" />
                <span className="font-medium text-white">Agent Chat</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <ChatPanel
                messages={messages}
                input={input}
                onInputChange={setInput}
                onSubmit={(e) => {
                  handleSubmit(e)
                  setIsMobileMenuOpen(false)
                }}
                isLoading={status === 'streaming' || status === 'submitted'}
                agentStatus={agentStatus}
                currentAction={currentAction}
                progress={progress}
                onStart={handleStart}
                onPause={handlePause}
                onStop={handleStop}
                hasPageLoaded={!!pageInfo}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile floating chat button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="fixed bottom-6 right-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30 transition-transform hover:scale-105 lg:hidden"
      >
        <Bot className="h-6 w-6 text-white" />
        {agentStatus === 'running' && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-cyan-500" />
          </span>
        )}
      </button>
    </div>
  )
}
