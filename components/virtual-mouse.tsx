'use client'

import { useEffect, useState } from 'react'
import type { MousePosition } from '@/lib/browser-types'

interface VirtualMouseProps {
  targetPosition: MousePosition
  isActive: boolean
}

export function VirtualMouse({ targetPosition, isActive }: VirtualMouseProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isClicking, setIsClicking] = useState(false)
  const [trail, setTrail] = useState<Array<{ x: number; y: number; id: number }>>([])

  useEffect(() => {
    if (!isActive || !targetPosition.visible) return

    // Animate to target position
    const animate = () => {
      setPosition(prev => {
        const dx = targetPosition.x - prev.x
        const dy = targetPosition.y - prev.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 2) {
          return { x: targetPosition.x, y: targetPosition.y }
        }
        
        // Smooth easing
        const speed = Math.min(distance * 0.15, 20)
        return {
          x: prev.x + (dx / distance) * speed,
          y: prev.y + (dy / distance) * speed,
        }
      })
    }

    const interval = setInterval(animate, 16)
    return () => clearInterval(interval)
  }, [targetPosition, isActive])

  // Add trail effect
  useEffect(() => {
    if (!isActive) return
    
    const trailId = Date.now()
    setTrail(prev => [...prev.slice(-8), { ...position, id: trailId }])
    
    const timeout = setTimeout(() => {
      setTrail(prev => prev.filter(t => t.id !== trailId))
    }, 300)
    
    return () => clearTimeout(timeout)
  }, [position, isActive])

  // Handle clicking animation
  useEffect(() => {
    if (targetPosition.clicking) {
      setIsClicking(true)
      const timeout = setTimeout(() => setIsClicking(false), 200)
      return () => clearTimeout(timeout)
    }
  }, [targetPosition.clicking])

  if (!isActive || !targetPosition.visible) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {/* Trail effect */}
      {trail.map((t, i) => (
        <div
          key={t.id}
          className="absolute h-2 w-2 rounded-full bg-cyan-400/30"
          style={{
            left: t.x - 4,
            top: t.y - 4,
            opacity: (i + 1) / trail.length * 0.5,
            transform: `scale(${(i + 1) / trail.length})`,
          }}
        />
      ))}
      
      {/* Main cursor */}
      <div
        className="absolute transition-transform duration-75"
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-2px, -2px) ${isClicking ? 'scale(0.8)' : 'scale(1)'}`,
        }}
      >
        {/* Cursor shape */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className={`drop-shadow-lg transition-all duration-100 ${isClicking ? 'scale-90' : ''}`}
        >
          <path
            d="M5.5 3.21V20.8c0 .45.54.67.86.35l4.86-4.86h6.29c.45 0 .67-.54.35-.86L6.36 3.06c-.31-.31-.86-.09-.86.35z"
            fill="url(#cursor-gradient)"
            stroke="white"
            strokeWidth="1.5"
          />
          <defs>
            <linearGradient id="cursor-gradient" x1="5" y1="3" x2="18" y2="16">
              <stop stopColor="#06b6d4" />
              <stop offset="1" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Click ripple effect */}
        {isClicking && (
          <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
            <div className="h-8 w-8 animate-ping rounded-full bg-cyan-400/50" />
          </div>
        )}
      </div>
      
      {/* Glow effect around cursor */}
      <div
        className="absolute h-12 w-12 rounded-full bg-cyan-400/20 blur-md transition-all duration-150"
        style={{
          left: position.x - 24,
          top: position.y - 24,
          opacity: isClicking ? 0.8 : 0.3,
        }}
      />
    </div>
  )
}
