'use client'

import { Bot, Pause, Play, Square, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { AgentStatus } from '@/lib/browser-types'

interface AgentStatusProps {
  status: AgentStatus
  currentAction: string | null
  progress: number | null
  onStart: () => void
  onPause: () => void
  onStop: () => void
}

export function AgentStatusPanel({ status, currentAction, progress, onStart, onPause, onStop }: AgentStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'text-cyan-400'
      case 'paused': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      case 'completed': return 'text-green-400'
      default: return 'text-white/60'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'running': return <Loader2 className="h-5 w-5 animate-spin" />
      case 'paused': return <Pause className="h-5 w-5" />
      case 'error': return <AlertCircle className="h-5 w-5" />
      case 'completed': return <CheckCircle2 className="h-5 w-5" />
      default: return <Bot className="h-5 w-5" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'running': return 'Agent Working'
      case 'paused': return 'Paused'
      case 'error': return 'Error Occurred'
      case 'completed': return 'Task Complete'
      default: return 'Ready'
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      {/* Status indicator */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${getStatusColor()} rounded-lg bg-white/5 p-2`}>
            {getStatusIcon()}
          </div>
          <div>
            <p className={`text-sm font-medium ${getStatusColor()}`}>{getStatusText()}</p>
            {currentAction && status === 'running' && (
              <p className="text-xs text-white/50">{currentAction}</p>
            )}
          </div>
        </div>
        
        {/* Progress indicator */}
        {progress !== null && status === 'running' && (
          <div className="text-right">
            <p className="text-lg font-semibold text-cyan-400">{progress}%</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {status === 'running' && (
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
            style={{ width: progress !== null ? `${progress}%` : '30%', animation: progress === null ? 'pulse 2s infinite' : undefined }}
          />
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-2">
        {status === 'idle' || status === 'completed' || status === 'error' ? (
          <button
            onClick={onStart}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-cyan-400 hover:to-blue-400 hover:shadow-lg hover:shadow-cyan-500/25"
          >
            <Play className="h-4 w-4" />
            Begin Task
          </button>
        ) : (
          <>
            <button
              onClick={onPause}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/10"
            >
              {status === 'paused' ? (
                <>
                  <Play className="h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              )}
            </button>
            <button
              onClick={onStop}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  )
}
