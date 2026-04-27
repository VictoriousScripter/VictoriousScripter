'use client'

import { Loader2, Bot, Globe } from 'lucide-react'

export function BrowserSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
        <div className="flex items-center gap-1">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
        </div>
        <div className="h-10 flex-1 animate-pulse rounded-xl bg-white/10" />
      </div>
      
      {/* Content skeleton */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="animate-pulse rounded-2xl bg-white/5 p-6">
          <Globe className="h-16 w-16 text-white/20" />
        </div>
        <div className="h-6 w-48 animate-pulse rounded-lg bg-white/10" />
        <div className="h-4 w-64 animate-pulse rounded bg-white/5" />
      </div>
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Header skeleton */}
      <div className="border-b border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
          <div>
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="mt-1 h-3 w-32 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      </div>

      {/* Status skeleton */}
      <div className="border-b border-white/10 p-4">
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
      </div>

      {/* Messages skeleton */}
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="animate-pulse rounded-2xl bg-white/5 p-6">
          <Bot className="h-12 w-12 text-white/20" />
        </div>
        <div className="mt-4 h-5 w-32 animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-white/5" />
      </div>

      {/* Input skeleton */}
      <div className="border-t border-white/10 p-4">
        <div className="flex gap-2">
          <div className="h-12 flex-1 animate-pulse rounded-xl bg-white/10" />
          <div className="h-12 w-12 animate-pulse rounded-xl bg-white/10" />
        </div>
      </div>
    </div>
  )
}

export function FullPageLoader() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-8 backdrop-blur-sm">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
      </div>
      <h2 className="text-xl font-medium text-white">Loading Browser Agent</h2>
      <p className="text-sm text-white/50">Initializing AI-powered web automation...</p>
    </div>
  )
}
