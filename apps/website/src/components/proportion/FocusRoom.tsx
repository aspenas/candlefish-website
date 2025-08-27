import React, { useState, useEffect, useCallback, useRef } from 'react'

interface Participant {
  id: string
  initials: string
  color: string
  lastSeen: number
}

interface FocusRoomProps {
  roomId?: string
  onLeave?: () => void
  className?: string
}

export const FocusRoom: React.FC<FocusRoomProps> = ({
  roomId = 'default',
  onLeave,
  className = ''
}) => {
  const [timeboxDuration, setTimeboxDuration] = useState<25 | 45 | 90>(25)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [doNotDisturb, setDoNotDisturb] = useState(true)
  const [endChimeEnabled, setEndChimeEnabled] = useState(false)
  const [sessionNotes, setSessionNotes] = useState('')
  const [showChat] = useState(false) // Chat disabled by default

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const presenceRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      audioContextRef.current = new AudioContext()
    }
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  // Initialize WebRTC for presence
  useEffect(() => {
    const initWebRTC = async () => {
      if (typeof window === 'undefined' || !window.RTCPeerConnection) return

      try {
        const config: RTCConfiguration = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        }

        const pc = new RTCPeerConnection(config)
        peerConnectionRef.current = pc

        // Create data channel for presence updates
        const dataChannel = pc.createDataChannel('presence', {
          ordered: true
        })

        dataChannelRef.current = dataChannel

        dataChannel.onopen = () => {
          // Send our presence
          const myPresence: Participant = {
            id: generateUserId(),
            initials: getUserInitials(),
            color: generateUserColor(),
            lastSeen: Date.now()
          }

          dataChannel.send(JSON.stringify({
            type: 'presence',
            data: myPresence
          }))

          // Update presence every 10 seconds
          presenceRef.current = setInterval(() => {
            if (dataChannel.readyState === 'open') {
              dataChannel.send(JSON.stringify({
                type: 'heartbeat',
                data: { id: myPresence.id, lastSeen: Date.now() }
              }))
            }
          }, 10000)
        }

        dataChannel.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === 'presence') {
              setParticipants(prev => {
                const existing = prev.find(p => p.id === message.data.id)
                if (existing) {
                  return prev.map(p => p.id === message.data.id ? message.data : p)
                }
                return [...prev, message.data]
              })
            } else if (message.type === 'heartbeat') {
              setParticipants(prev =>
                prev.map(p => p.id === message.data.id
                  ? { ...p, lastSeen: message.data.lastSeen }
                  : p
                )
              )
            }
          } catch (error) {
            console.error('Failed to parse presence message:', error)
          }
        }
      } catch (error) {
        console.error('Failed to initialize WebRTC:', error)
      }
    }

    initWebRTC()

    return () => {
      if (presenceRef.current) clearInterval(presenceRef.current)
      dataChannelRef.current?.close()
      peerConnectionRef.current?.close()
    }
  }, [roomId])

  // Remove stale participants
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setParticipants(prev =>
        prev.filter(p => now - p.lastSeen < 30000) // Remove after 30s of inactivity
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Generate user ID
  const generateUserId = () => {
    return `user-${Math.random().toString(36).substring(2, 9)}`
  }

  // Get user initials (mock - would get from auth)
  const getUserInitials = () => {
    const names = ['AB', 'CD', 'EF', 'GH', 'IJ', 'KL', 'MN', 'OP']
    return names[Math.floor(Math.random() * names.length)]
  }

  // Generate user color
  const generateUserColor = () => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
      '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Play end chime
  const playEndChime = useCallback(() => {
    if (!endChimeEnabled || !audioContextRef.current) return

    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Play a pleasant two-tone chime
    oscillator.frequency.setValueAtTime(659, ctx.currentTime) // E5
    oscillator.frequency.setValueAtTime(523, ctx.currentTime + 0.2) // C5
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05)
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  }, [endChimeEnabled])

  // Start session
  const startSession = useCallback(() => {
    setTimeRemaining(timeboxDuration * 60)
    setIsActive(true)

    // Enable Do Not Disturb (mock - would integrate with OS)
    if (doNotDisturb && 'Notification' in window) {
      // In a real app, this would integrate with system DND
      console.log('Do Not Disturb enabled')
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endSession()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [timeboxDuration, doNotDisturb])

  // End session
  const endSession = useCallback(() => {
    playEndChime()
    if (timerRef.current) clearInterval(timerRef.current)
    setIsActive(false)

    // Disable Do Not Disturb
    if (doNotDisturb) {
      console.log('Do Not Disturb disabled')
    }

    // Save session to IndexedDB
    if (typeof window !== 'undefined' && window.indexedDB) {
      saveSession()
    }
  }, [playEndChime, doNotDisturb])

  // Save session to IndexedDB
  const saveSession = async () => {
    try {
      const db = await openDB()
      const transaction = db.transaction(['sessions'], 'readwrite')
      const store = transaction.objectStore('sessions')

      await store.add({
        roomId,
        duration: timeboxDuration,
        notes: sessionNotes,
        participants: participants.map(p => p.initials),
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  // Open IndexedDB
  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('FocusRoomDB', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'timestamp' })
        }
      }
    })
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage
  const progressPercentage = isActive
    ? ((timeboxDuration * 60 - timeRemaining) / (timeboxDuration * 60)) * 100
    : 0

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-lg font-semibold text-gray-900">Focus Room</h1>

            {/* Presence indicators */}
            <div className="flex items-center space-x-2">
              {participants.map(participant => (
                <div
                  key={participant.id}
                  className="relative"
                  title={participant.initials}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                    style={{ backgroundColor: participant.color }}
                  >
                    {participant.initials}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                </div>
              ))}
              {participants.length === 0 && (
                <span className="text-sm text-gray-500">Solo session</span>
              )}
            </div>

            <button
              onClick={onLeave}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Leave focus room"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Timer display */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              {/* Progress ring */}
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={553}
                  strokeDashoffset={553 - (553 * progressPercentage) / 100}
                  className="text-blue-500 transition-all duration-1000"
                />
              </svg>

              {/* Time display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-5xl font-light text-gray-900 tabular-nums">
                    {formatTime(timeRemaining)}
                  </div>
                  {isActive && (
                    <div className="mt-1 text-sm text-gray-500">
                      {timeboxDuration} minute session
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          {!isActive ? (
            <div className="space-y-6">
              {/* Duration selector */}
              <div className="flex items-center justify-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Session length:</label>
                <div className="flex space-x-2">
                  {([25, 45, 90] as const).map(duration => (
                    <button
                      key={duration}
                      onClick={() => setTimeboxDuration(duration)}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        timeboxDuration === duration
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {duration} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doNotDisturb}
                    onChange={(e) => setDoNotDisturb(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Do Not Disturb</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={endChimeEnabled}
                    onChange={(e) => setEndChimeEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">End chime</span>
                </label>
              </div>

              {/* Start button */}
              <div className="flex justify-center">
                <button
                  onClick={startSession}
                  className="px-8 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Start Focus Session
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Session notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Session notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="What are you working on?"
                  className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* End button */}
              <div className="flex justify-center">
                <button
                  onClick={endSession}
                  className="px-8 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  End Session Early
                </button>
              </div>
            </div>
          )}

          {/* Status indicators */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${doNotDisturb && isActive ? 'bg-red-500' : 'bg-gray-300'}`} />
                <span className="text-gray-600">Do Not Disturb</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-gray-600">Session Active</span>
              </div>
              {!showChat && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  <span className="text-gray-600">Chat Disabled</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Help text */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Focus Room provides a distraction-free environment for deep work.</p>
          <p className="mt-1">Presence dots show who's working alongside you.</p>
        </div>
      </div>
    </div>
  )
}
