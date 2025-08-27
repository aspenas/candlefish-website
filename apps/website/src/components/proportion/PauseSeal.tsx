import React, { useState, useEffect, useCallback, useRef } from 'react'

interface PauseSealProps {
  onComplete?: (intention?: string) => void
  onDismiss?: () => void
  trigger?: 'manual' | 'proximity' | 'shortcut'
  className?: string
}

type BreathPattern = 'box' | 'exhale-biased' | 'natural'

interface BreathTiming {
  inhale: number
  hold: number
  exhale: number
  pause: number
}

const BREATH_PATTERNS: Record<BreathPattern, BreathTiming> = {
  'box': { inhale: 4, hold: 4, exhale: 4, pause: 4 },
  'exhale-biased': { inhale: 4, hold: 2, exhale: 8, pause: 2 },
  'natural': { inhale: 4, hold: 0, exhale: 6, pause: 1 }
}

export const PauseSeal: React.FC<PauseSealProps> = ({
  onComplete,
  onDismiss,
  trigger = 'manual',
  className = ''
}) => {
  const [isActive, setIsActive] = useState(false)
  const [duration, setDuration] = useState<5 | 8 | 10>(5)
  const [breathPattern, setBreathPattern] = useState<BreathPattern>('exhale-biased')
  const [intention, setIntention] = useState('')
  const [chimeEnabled, setChimeEnabled] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale')
  const [breathProgress, setBreathProgress] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const breathRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context for chime
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      audioContextRef.current = new AudioContext()
    }
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  // Play a soft chime
  const playChime = useCallback(() => {
    if (!chimeEnabled || !audioContextRef.current) return

    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 528 // Soft, calming frequency
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1)
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 1.5)
  }, [chimeEnabled])

  // Handle keyboard shortcut
  useEffect(() => {
    if (trigger !== 'shortcut') return

    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setIsActive(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [trigger])

  // Start timer
  const startSession = useCallback(() => {
    setTimeRemaining(duration * 60)
    setIsActive(true)

    // Timer countdown
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Breath animation
    runBreathCycle()
  }, [duration])

  // Breath cycle animation
  const runBreathCycle = useCallback(() => {
    const pattern = BREATH_PATTERNS[breathPattern]
    let currentPhase: 'inhale' | 'hold' | 'exhale' | 'pause' = 'inhale'
    let phaseTime = 0

    const breathInterval = setInterval(() => {
      const totalTime = pattern[currentPhase]
      phaseTime += 0.1

      setBreathProgress((phaseTime / totalTime) * 100)

      if (phaseTime >= totalTime) {
        phaseTime = 0
        // Move to next phase
        switch (currentPhase) {
          case 'inhale':
            currentPhase = pattern.hold > 0 ? 'hold' : 'exhale'
            break
          case 'hold':
            currentPhase = 'exhale'
            break
          case 'exhale':
            currentPhase = pattern.pause > 0 ? 'pause' : 'inhale'
            break
          case 'pause':
            currentPhase = 'inhale'
            break
        }
        setBreathPhase(currentPhase)
      }
    }, 100)

    breathRef.current = breathInterval
  }, [breathPattern])

  // Complete session
  const handleComplete = useCallback(() => {
    playChime()
    if (timerRef.current) clearInterval(timerRef.current)
    if (breathRef.current) clearInterval(breathRef.current)
    setIsActive(false)
    onComplete?.(intention || undefined)
  }, [intention, onComplete, playChime])

  // Dismiss overlay
  const handleDismiss = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (breathRef.current) clearInterval(breathRef.current)
    setIsActive(false)
    onDismiss?.()
  }, [onDismiss])

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Respect reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!isActive && trigger === 'manual') {
    return (
      <button
        onClick={startSession}
        className={`px-4 py-2 text-sm font-medium rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${className}`}
        aria-label="Start pause and seal meditation"
      >
        Pause & Seal
      </button>
    )
  }

  if (!isActive) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Pause and Seal meditation session"
    >
      <div className="relative w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close meditation session"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="space-y-6">
          {/* Timer display */}
          <div className="text-center">
            <div className="text-4xl font-light text-gray-900 tabular-nums">
              {formatTime(timeRemaining)}
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {breathPhase === 'inhale' && 'Inhale'}
              {breathPhase === 'hold' && 'Hold'}
              {breathPhase === 'exhale' && 'Exhale slowly'}
              {breathPhase === 'pause' && 'Pause'}
            </div>
          </div>

          {/* Breath visualization */}
          {!prefersReducedMotion && (
            <div className="relative h-32 flex items-center justify-center">
              <div
                className="absolute w-24 h-24 rounded-full bg-blue-100 transition-all duration-1000 ease-in-out"
                style={{
                  transform: `scale(${
                    breathPhase === 'inhale' ? 1.3 :
                    breathPhase === 'hold' ? 1.3 :
                    breathPhase === 'exhale' ? 0.8 :
                    0.8
                  })`,
                  opacity: breathProgress / 100
                }}
              />
              <div className="relative w-16 h-16 rounded-full bg-blue-500 opacity-50" />
            </div>
          )}

          {/* Settings */}
          {timeRemaining === duration * 60 && (
            <div className="space-y-4">
              {/* Duration selector */}
              <div className="flex items-center justify-center space-x-2">
                <label className="text-sm text-gray-600">Duration:</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value) as 5 | 8 | 10)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5 minutes</option>
                  <option value={8}>8 minutes</option>
                  <option value={10}>10 minutes</option>
                </select>
              </div>

              {/* Breath pattern selector */}
              <div className="flex items-center justify-center space-x-2">
                <label className="text-sm text-gray-600">Pattern:</label>
                <select
                  value={breathPattern}
                  onChange={(e) => setBreathPattern(e.target.value as BreathPattern)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="exhale-biased">Long Exhale</option>
                  <option value="box">Box Breathing</option>
                  <option value="natural">Natural</option>
                </select>
              </div>

              {/* Chime toggle */}
              <div className="flex items-center justify-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chimeEnabled}
                    onChange={(e) => setChimeEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Enable completion chime</span>
                </label>
              </div>
            </div>
          )}

          {/* Intention input */}
          <div>
            <label htmlFor="intention" className="block text-sm font-medium text-gray-700 mb-1">
              What matters now? (optional)
            </label>
            <input
              id="intention"
              type="text"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="Your intention for this work..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            {timeRemaining === duration * 60 ? (
              <button
                onClick={startSession}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Begin
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex-1 px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Complete Early
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
