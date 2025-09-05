/**
 * Cross-Platform Fish State Management
 * Unified state store using Zustand for React Native
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MMKV } from 'react-native-mmkv'

// Types
export interface Point {
  x: number
  y: number
}

export type Mood = 'curious' | 'playful' | 'shy' | 'excited' | 'trusting' | 'lonely'
export type SwimPattern = 'idle' | 'dart' | 'feeding' | 'content' | 'shy' | 'excited'
export type QualityTier = 'low' | 'medium' | 'high'

export interface FishState {
  position: Point
  velocity: Point
  targetVelocity: Point
  angle: number
  glowIntensity: number
  dartCooldown: number
  trail: Point[]
  eyeDilation: number
  finSpread: number
  bodyTension: number
  swimPattern: SwimPattern
  lastFedTime: number
  mood: Mood
}

export interface EmotionalState {
  mood: Mood
  intensity: number
  duration: number
  transitionSpeed: number
  moodHistory: Array<{ mood: Mood; timestamp: number }>
}

export interface MemoryData {
  trustLevel: number
  lastInteraction: number
  feedingSpots: Point[]
  interactionCount: number
  behaviorPattern: string
  visitDates: number[]
  personalityQuirks: string[]
  totalPlayTime: number
  favoriteSpots: Array<{ position: Point; visits: number }>
}

export interface ParticleState {
  particles: Array<{
    id: string
    position: Point
    velocity: Point
    life: number
    size: number
    type: 'food' | 'bubble'
    created: number
  }>
  ripples: Array<{
    id: string
    position: Point
    radius: number
    opacity: number
    maxRadius: number
    created: number
  }>
}

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  batteryLevel: number
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical'
  qualityTier: QualityTier
  adaptiveQualityEnabled: boolean
}

export interface InteractionState {
  touchPosition: Point | null
  touchActive: boolean
  touchMovementSpeed: number
  lastTouchTime: number
  gestureHistory: Array<{
    type: 'tap' | 'move' | 'pinch' | 'long-press'
    position: Point
    timestamp: number
    data?: any
  }>
}

export interface SettingsState {
  enableHaptics: boolean
  enableMotion: boolean
  enableSound: boolean
  qualityTier: QualityTier
  adaptiveQuality: boolean
  reducedMotion: boolean
  debugMode: boolean
  analyticsEnabled: boolean
}

// Main store interface
export interface FishStoreState {
  // Core state
  fish: FishState
  emotional: EmotionalState
  memory: MemoryData
  particles: ParticleState
  performance: PerformanceMetrics
  interaction: InteractionState
  settings: SettingsState
  
  // UI state
  isLoading: boolean
  isVisible: boolean
  isActive: boolean
  error: string | null
  lastUpdate: number
  
  // Actions
  updateFish: (updates: Partial<FishState>) => void
  updateEmotional: (updates: Partial<EmotionalState>) => void
  updateMemory: (updates: Partial<MemoryData>) => void
  updatePerformance: (metrics: PerformanceMetrics) => void
  updateInteraction: (updates: Partial<InteractionState>) => void
  updateSettings: (updates: Partial<SettingsState>) => void
  
  // Complex actions
  handleTouch: (position: Point, type: 'tap' | 'move' | 'release') => void
  feedFish: (position: Point) => void
  transitionMood: (mood: Mood, intensity: number, trigger: string) => void
  addTrust: (amount: number) => void
  recordInteraction: (type: string, data?: any) => void
  addParticle: (particle: Omit<ParticleState['particles'][0], 'id' | 'created'>) => void
  addRipple: (ripple: Omit<ParticleState['ripples'][0], 'id' | 'created'>) => void
  
  // Persistence
  saveState: () => Promise<void>
  loadState: () => Promise<void>
  resetState: () => void
  
  // Utilities
  getFishStats: () => {
    trust: number
    mood: string
    interactions: number
    feedingSpots: number
    timeSinceLastFed: number
    playTime: number
  }
  getMoodColor: () => { r: number; g: number; b: number; a: number }
  getQualityConfig: () => {
    particleCount: number
    trailLength: number
    enableBloom: boolean
    textureQuality: number
  }
}

// MMKV storage for high-performance persistence
const storage = new MMKV({
  id: 'candlefish-storage',
  encryptionKey: 'candlefish-ai-2024'
})

// Mood color mappings
const MOOD_COLORS = {
  curious: { r: 255, g: 179, b: 71, a: 1 },    // #FFB347
  playful: { r: 255, g: 107, b: 157, a: 1 },   // #FF6B9D
  shy: { r: 179, g: 157, b: 219, a: 1 },       // #B39DDB
  excited: { r: 255, g: 235, b: 59, a: 1 },    // #FFEB3B
  trusting: { r: 129, g: 199, b: 132, a: 1 },  // #81C784
  lonely: { r: 144, g: 164, b: 174, a: 1 }     // #90A4AE
} as const

// Quality tier configurations
const QUALITY_CONFIGS = {
  low: {
    particleCount: 15,
    trailLength: 10,
    enableBloom: false,
    textureQuality: 0.5
  },
  medium: {
    particleCount: 30,
    trailLength: 25,
    enableBloom: false,
    textureQuality: 0.75
  },
  high: {
    particleCount: 50,
    trailLength: 40,
    enableBloom: true,
    textureQuality: 1.0
  }
} as const

// Initial state factory
const createInitialState = (): Omit<FishStoreState, keyof Actions> => ({
  fish: {
    position: { x: 200, y: 300 },
    velocity: { x: 1.2, y: 0 },
    targetVelocity: { x: 1.2, y: 0 },
    angle: 0,
    glowIntensity: 0.8,
    dartCooldown: 0,
    trail: [],
    eyeDilation: 0.5,
    finSpread: 0.5,
    bodyTension: 0.3,
    swimPattern: 'idle',
    lastFedTime: 0,
    mood: 'curious'
  },
  
  emotional: {
    mood: 'curious',
    intensity: 0.5,
    duration: 0,
    transitionSpeed: 1.0,
    moodHistory: []
  },
  
  memory: {
    trustLevel: 20,
    lastInteraction: Date.now(),
    feedingSpots: [],
    interactionCount: 0,
    behaviorPattern: 'unknown',
    visitDates: [Date.now()],
    personalityQuirks: [],
    totalPlayTime: 0,
    favoriteSpots: []
  },
  
  particles: {
    particles: [],
    ripples: []
  },
  
  performance: {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    batteryLevel: 1,
    thermalState: 'nominal',
    qualityTier: 'high',
    adaptiveQualityEnabled: true
  },
  
  interaction: {
    touchPosition: null,
    touchActive: false,
    touchMovementSpeed: 0,
    lastTouchTime: 0,
    gestureHistory: []
  },
  
  settings: {
    enableHaptics: true,
    enableMotion: true,
    enableSound: true,
    qualityTier: 'high',
    adaptiveQuality: true,
    reducedMotion: false,
    debugMode: __DEV__,
    analyticsEnabled: true
  },
  
  isLoading: false,
  isVisible: false,
  isActive: false,
  error: null,
  lastUpdate: Date.now()
})

// Store implementation
type Actions = Pick<FishStoreState, 
  'updateFish' | 'updateEmotional' | 'updateMemory' | 'updatePerformance' | 
  'updateInteraction' | 'updateSettings' | 'handleTouch' | 'feedFish' | 
  'transitionMood' | 'addTrust' | 'recordInteraction' | 'addParticle' | 
  'addRipple' | 'saveState' | 'loadState' | 'resetState' | 'getFishStats' | 
  'getMoodColor' | 'getQualityConfig'
>

export const useFishStore = create<FishStoreState>()(
  subscribeWithSelector((set, get) => ({
    ...createInitialState(),
    
    // Basic update actions
    updateFish: (updates) => set((state) => ({
      fish: { ...state.fish, ...updates },
      lastUpdate: Date.now()
    })),
    
    updateEmotional: (updates) => set((state) => ({
      emotional: { ...state.emotional, ...updates },
      lastUpdate: Date.now()
    })),
    
    updateMemory: (updates) => set((state) => ({
      memory: { ...state.memory, ...updates },
      lastUpdate: Date.now()
    })),
    
    updatePerformance: (metrics) => set((state) => ({
      performance: { ...state.performance, ...metrics },
      lastUpdate: Date.now()
    })),
    
    updateInteraction: (updates) => set((state) => ({
      interaction: { ...state.interaction, ...updates },
      lastUpdate: Date.now()
    })),
    
    updateSettings: (updates) => set((state) => {
      const newSettings = { ...state.settings, ...updates }
      
      // Save settings to persistent storage
      try {
        storage.set('settings', JSON.stringify(newSettings))
      } catch (error) {
        console.warn('Failed to save settings:', error)
      }
      
      return {
        settings: newSettings,
        lastUpdate: Date.now()
      }
    }),
    
    // Complex actions
    handleTouch: (position, type) => {
      const state = get()
      const currentTime = Date.now()
      
      // Calculate movement speed
      let movementSpeed = 0
      if (state.interaction.touchPosition && type === 'move') {
        const dx = position.x - state.interaction.touchPosition.x
        const dy = position.y - state.interaction.touchPosition.y
        movementSpeed = Math.sqrt(dx * dx + dy * dy)
      }
      
      // Update interaction state
      set({
        interaction: {
          ...state.interaction,
          touchPosition: type === 'release' ? null : position,
          touchActive: type !== 'release',
          touchMovementSpeed: movementSpeed,
          lastTouchTime: currentTime,
          gestureHistory: [
            ...state.interaction.gestureHistory.slice(-19), // Keep last 20
            {
              type: type === 'release' ? 'tap' : 'move',
              position,
              timestamp: currentTime
            }
          ]
        },
        lastUpdate: currentTime
      })
      
      // Update trust based on interaction
      if (type === 'move') {
        const trustDelta = movementSpeed < 20 ? 0.1 : (movementSpeed > 50 ? -0.5 : 0)
        if (trustDelta !== 0) {
          get().addTrust(trustDelta)
        }
      }
      
      // Record interaction
      get().recordInteraction('touch', { position, type, movementSpeed })
    },
    
    feedFish: (position) => {
      const state = get()
      
      // Add food particle
      get().addParticle({
        position,
        velocity: { x: 0, y: 1.5 },
        life: 5.0,
        size: 4 + Math.random() * 3,
        type: 'food'
      })
      
      // Add ripple effect
      get().addRipple({
        position,
        radius: 0,
        opacity: 0.6,
        maxRadius: 80
      })
      
      // Record feeding in memory
      set((state) => ({
        memory: {
          ...state.memory,
          feedingSpots: [
            ...state.memory.feedingSpots.slice(-9), // Keep last 10
            position
          ]
        }
      }))
      
      // Transition to excited mood
      get().transitionMood('excited', 1.0, 'feeding')
      
      // Add trust for feeding
      get().addTrust(3)
      
      // Calculate direction to food for fish behavior
      const dx = position.x - state.fish.position.x
      const dy = position.y - state.fish.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5) {
        const speed = Math.min(8 * 1.2, distance * 0.12)
        set((state) => ({
          fish: {
            ...state.fish,
            targetVelocity: {
              x: (dx / distance) * speed,
              y: (dy / distance) * speed
            },
            dartCooldown: 40,
            swimPattern: 'feeding',
            eyeDilation: 1.0,
            finSpread: 1.0,
            glowIntensity: Math.min(1.2, state.fish.glowIntensity + 0.4),
            lastFedTime: Date.now()
          }
        }))
      }
    },
    
    transitionMood: (mood, intensity, trigger) => {
      const state = get()
      
      if (state.emotional.mood !== mood) {
        const currentTime = Date.now()
        
        set((state) => ({
          emotional: {
            ...state.emotional,
            mood,
            intensity: Math.max(0, Math.min(1, intensity)),
            duration: 0,
            transitionSpeed: calculateTransitionSpeed(mood, trigger),
            moodHistory: [
              ...state.emotional.moodHistory.slice(-9), // Keep last 10
              { mood: state.emotional.mood, timestamp: currentTime }
            ]
          },
          fish: {
            ...state.fish,
            mood,
            eyeDilation: getTargetEyeDilation(mood, intensity),
            finSpread: getTargetFinSpread(mood, intensity),
            bodyTension: getTargetBodyTension(mood, intensity)
          },
          lastUpdate: currentTime
        }))
      }
    },
    
    addTrust: (amount) => {
      set((state) => {
        const newTrustLevel = Math.min(100, Math.max(0, state.memory.trustLevel + amount))
        return {
          memory: {
            ...state.memory,
            trustLevel: newTrustLevel,
            lastInteraction: Date.now()
          },
          lastUpdate: Date.now()
        }
      })
    },
    
    recordInteraction: (type, data) => {
      const currentTime = Date.now()
      
      set((state) => {
        // Add daily visit tracking
        const today = new Date().toDateString()
        const lastVisitDate = new Date(
          state.memory.visitDates[state.memory.visitDates.length - 1] || 0
        ).toDateString()
        
        const visitDates = today !== lastVisitDate 
          ? [...state.memory.visitDates, currentTime]
          : state.memory.visitDates
        
        // Daily visit bonus
        if (today !== lastVisitDate) {
          get().addTrust(5)
        }
        
        return {
          memory: {
            ...state.memory,
            interactionCount: state.memory.interactionCount + 1,
            lastInteraction: currentTime,
            visitDates,
            totalPlayTime: state.memory.totalPlayTime + 1 // Approximate
          },
          lastUpdate: currentTime
        }
      })
    },
    
    addParticle: (particle) => {
      const id = `particle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const created = Date.now()
      
      set((state) => ({
        particles: {
          ...state.particles,
          particles: [
            ...state.particles.particles.slice(-(get().getQualityConfig().particleCount - 1)),
            { ...particle, id, created }
          ]
        },
        lastUpdate: created
      }))
    },
    
    addRipple: (ripple) => {
      const id = `ripple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const created = Date.now()
      
      set((state) => ({
        particles: {
          ...state.particles,
          ripples: [
            ...state.particles.ripples.slice(-7), // Keep max 8 ripples
            { ...ripple, id, created }
          ]
        },
        lastUpdate: created
      }))
    },
    
    // Persistence
    saveState: async () => {
      const state = get()
      
      try {
        const dataToSave = {
          memory: state.memory,
          emotional: {
            ...state.emotional,
            moodHistory: state.emotional.moodHistory.slice(-10)
          },
          settings: state.settings,
          savedAt: Date.now()
        }
        
        // Use MMKV for performance-critical data
        storage.set('fish-state', JSON.stringify(dataToSave))
        
        // Also backup to AsyncStorage for compatibility
        await AsyncStorage.setItem('candlefish-backup', JSON.stringify(dataToSave))
      } catch (error) {
        console.warn('Failed to save state:', error)
        set({ error: `Save failed: ${error.message}` })
      }
    },
    
    loadState: async () => {
      set({ isLoading: true })
      
      try {
        // Try MMKV first
        let savedData = storage.getString('fish-state')
        
        // Fallback to AsyncStorage
        if (!savedData) {
          savedData = await AsyncStorage.getItem('candlefish-backup')
        }
        
        if (savedData) {
          const parsed = JSON.parse(savedData)
          
          // Apply loaded data with decay calculations
          const daysSinceLastVisit = (Date.now() - parsed.memory.lastInteraction) / (1000 * 60 * 60 * 24)
          const decayedTrust = Math.max(0, parsed.memory.trustLevel - daysSinceLastVisit * 2)
          
          set((state) => ({
            memory: {
              ...parsed.memory,
              trustLevel: decayedTrust
            },
            emotional: parsed.emotional || state.emotional,
            settings: { ...state.settings, ...parsed.settings }
          }))
        }
      } catch (error) {
        console.warn('Failed to load state:', error)
        set({ error: `Load failed: ${error.message}` })
      } finally {
        set({ isLoading: false })
      }
    },
    
    resetState: () => {
      const initial = createInitialState()
      set({
        ...initial,
        lastUpdate: Date.now()
      })
      
      // Clear persistent storage
      try {
        storage.delete('fish-state')
        AsyncStorage.removeItem('candlefish-backup')
      } catch (error) {
        console.warn('Failed to clear storage:', error)
      }
    },
    
    // Utility functions
    getFishStats: () => {
      const state = get()
      return {
        trust: state.memory.trustLevel,
        mood: state.emotional.mood,
        interactions: state.memory.interactionCount,
        feedingSpots: state.memory.feedingSpots.length,
        timeSinceLastFed: Date.now() - state.fish.lastFedTime,
        playTime: state.memory.totalPlayTime
      }
    },
    
    getMoodColor: () => {
      const mood = get().emotional.mood
      return MOOD_COLORS[mood]
    },
    
    getQualityConfig: () => {
      const tier = get().performance.qualityTier
      return QUALITY_CONFIGS[tier]
    }
  }))
)

// Helper functions
function calculateTransitionSpeed(mood: Mood, trigger: string): number {
  const speedMap = {
    excited: 2.0,
    shy: 0.5,
    playful: 1.5,
    trusting: 0.8,
    curious: 1.0,
    lonely: 0.6
  }
  return speedMap[mood] || 1.0
}

function getTargetEyeDilation(mood: Mood, intensity: number): number {
  const dilationMap = {
    curious: 0.6,
    playful: 0.8,
    shy: 0.3,
    excited: 1.0,
    trusting: 0.7,
    lonely: 0.4
  }
  return (dilationMap[mood] || 0.5) * intensity
}

function getTargetFinSpread(mood: Mood, intensity: number): number {
  const spreadMap = {
    curious: 0.5,
    playful: 0.9,
    shy: 0.2,
    excited: 1.0,
    trusting: 0.6,
    lonely: 0.3
  }
  return (spreadMap[mood] || 0.5) * intensity
}

function getTargetBodyTension(mood: Mood, intensity: number): number {
  const tensionMap = {
    curious: 0.4,
    playful: 0.2,
    shy: 0.8,
    excited: 0.1,
    trusting: 0.3,
    lonely: 0.6
  }
  return (tensionMap[mood] || 0.4) * intensity
}

// Auto-save subscription
useFishStore.subscribe(
  (state) => state.memory,
  (memory, prevMemory) => {
    // Auto-save when memory changes significantly
    if (memory.interactionCount !== prevMemory.interactionCount ||
        Math.abs(memory.trustLevel - prevMemory.trustLevel) > 1) {
      // Debounced save
      setTimeout(() => {
        useFishStore.getState().saveState()
      }, 1000)
    }
  }
)

// Performance monitoring subscription
useFishStore.subscribe(
  (state) => state.performance,
  (performance) => {
    // Adaptive quality adjustment
    if (performance.adaptiveQualityEnabled) {
      const state = useFishStore.getState()
      let newTier = performance.qualityTier
      
      // Reduce quality on poor performance or low battery
      if (performance.fps < 30 || performance.batteryLevel < 0.2 || performance.thermalState === 'serious') {
        if (performance.qualityTier === 'high') newTier = 'medium'
        else if (performance.qualityTier === 'medium') newTier = 'low'
      }
      // Increase quality on good performance
      else if (performance.fps > 55 && performance.batteryLevel > 0.3 && performance.thermalState === 'nominal') {
        if (performance.qualityTier === 'low') newTier = 'medium'
        else if (performance.qualityTier === 'medium') newTier = 'high'
      }
      
      if (newTier !== performance.qualityTier) {
        state.updateSettings({ qualityTier: newTier })
      }
    }
  }
)

export default useFishStore