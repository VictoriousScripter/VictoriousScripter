'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Globe, RefreshCw, ArrowLeft, ArrowRight, X, Loader2 } from 'lucide-react'
import { VirtualMouse } from './virtual-mouse'
import type { PageInfo, MousePosition, AgentAction } from '@/lib/browser-types'

interface BrowserFrameProps {
  onPageInfo: (info: PageInfo) => void
  agentAction: AgentAction | null
  isAgentActive: boolean
}

export function BrowserFrame({ onPageInfo, agentAction, isAgentActive }: BrowserFrameProps) {
  const [url, setUrl] = useState('')
  const [inputUrl, setInputUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 100, y: 100, visible: false, clicking: false })
  
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (data?.type === 'PAGE_INFO') {
        onPageInfo(data as PageInfo)
        setIsLoading(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onPageInfo])

  // Execute agent actions
  useEffect(() => {
    if (!agentAction || !iframeRef.current?.contentWindow) return

    const iframe = iframeRef.current

    const executeAction = async () => {
      switch (agentAction.action) {
        case 'click':
          // Animate mouse to element position (simulated)
          setMousePosition({ x: 200 + Math.random() * 300, y: 150 + Math.random() * 200, visible: true, clicking: false })
          await new Promise(r => setTimeout(r, 500))
          setMousePosition(prev => ({ ...prev, clicking: true }))
          await new Promise(r => setTimeout(r, 100))
          iframe.contentWindow?.postMessage({ type: 'CLICK', payload: { selector: agentAction.selector } }, '*')
          break

        case 'type':
          setMousePosition({ x: 200 + Math.random() * 300, y: 150 + Math.random() * 200, visible: true, clicking: false })
          await new Promise(r => setTimeout(r, 300))
          iframe.contentWindow?.postMessage({ 
            type: 'TYPE', 
            payload: { selector: agentAction.selector, text: agentAction.text, clear: agentAction.clear } 
          }, '*')
          break

        case 'scroll':
          iframe.contentWindow?.postMessage({ 
            type: 'SCROLL', 
            payload: { direction: agentAction.direction, amount: agentAction.amount } 
          }, '*')
          break

        case 'navigate':
          if (agentAction.url) {
            navigateTo(agentAction.url)
          }
          break

        case 'extract':
          iframe.contentWindow?.postMessage({ type: 'EXTRACT', payload: { selector: agentAction.selector } }, '*')
          break

        case 'analyze':
          iframe.contentWindow?.postMessage({ type: 'GET_PAGE_INFO' }, '*')
          break

        case 'wait':
          await new Promise(r => setTimeout(r, agentAction.duration || 1000))
          iframe.contentWindow?.postMessage({ type: 'GET_PAGE_INFO' }, '*')
          break
      }
    }

    executeAction()
  }, [agentAction])

  // Hide mouse when agent stops
  useEffect(() => {
    if (!isAgentActive) {
      setMousePosition(prev => ({ ...prev, visible: false }))
    }
  }, [isAgentActive])

  const navigateTo = useCallback((targetUrl: string) => {
    if (!targetUrl.trim()) return

    let processedUrl = targetUrl.trim()
    if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = 'https://' + processedUrl
    }

    setIsLoading(true)
    setError(null)
    setUrl(processedUrl)
    setInputUrl(processedUrl)
    
    // Update history
    const newHistory = [...history.slice(0, historyIndex + 1), processedUrl]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigateTo(inputUrl)
  }

  const handleRefresh = () => {
    if (url) {
      setIsLoading(true)
      // Force iframe reload by appending timestamp
      const refreshUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`
      setUrl(refreshUrl)
    }
  }

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setUrl(history[newIndex])
      setInputUrl(history[newIndex])
      setIsLoading(true)
    }
  }

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setUrl(history[newIndex])
      setInputUrl(history[newIndex])
      setIsLoading(true)
    }
  }

  const proxyUrl = url ? `/api/proxy?url=${encodeURIComponent(url)}` : ''

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Browser toolbar */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            disabled={historyIndex <= 0}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={!url || isLoading}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* URL bar */}
        <form onSubmit={handleSubmit} className="flex flex-1 items-center">
          <div className="relative flex flex-1 items-center">
            <Globe className="absolute left-3 h-4 w-4 text-white/40" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter URL to browse..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none transition-all focus:border-cyan-400/50 focus:bg-white/10 focus:ring-2 focus:ring-cyan-400/20"
            />
            {isLoading && (
              <div className="absolute right-3">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              </div>
            )}
          </div>
        </form>

        {/* Close/clear button */}
        {url && (
          <button
            onClick={() => {
              setUrl('')
              setInputUrl('')
              setError(null)
            }}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Browser viewport */}
      <div className="relative flex-1 overflow-hidden bg-white">
        {!url ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center">
            <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
              <Globe className="mx-auto h-16 w-16 text-cyan-400/60" />
            </div>
            <h2 className="text-xl font-medium text-white">Enter a URL to get started</h2>
            <p className="max-w-md text-sm text-white/60">
              Type a website address in the URL bar above, then use the AI chat to instruct the agent what to do on the page.
            </p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center">
            <div className="rounded-2xl bg-red-500/10 p-6">
              <X className="mx-auto h-16 w-16 text-red-400" />
            </div>
            <h2 className="text-xl font-medium text-white">Failed to load page</h2>
            <p className="max-w-md text-sm text-white/60">{error}</p>
            <button
              onClick={handleRefresh}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <iframe
              ref={iframeRef}
              src={proxyUrl}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onError={() => setError('Failed to load the page. The website may be blocking iframe embedding.')}
            />
            <VirtualMouse targetPosition={mousePosition} isActive={isAgentActive} />
          </>
        )}

        {/* Loading overlay */}
        {isLoading && url && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
              <p className="text-sm text-white/60">Loading page...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
