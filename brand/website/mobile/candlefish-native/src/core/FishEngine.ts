/**
 * Cross-Platform Fish Animation Engine
 * Shared business logic for native implementations
 */

export interface Point {
  x: number
  y: number
}

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
  swimPattern: 'idle' | 'dart' | 'feeding' | 'content' | 'shy' | 'excited'
  lastFedTime: number
}

export interface EmotionalState {
  mood: 'curious' | 'playful' | 'shy' | 'excited' | 'trusting' | 'lonely'
  intensity: number
  duration: number
  transitionSpeed: number
}

export interface RippleEffect {
  position: Point
  radius: number
  opacity: number
  maxRadius: number
  timestamp: number
}

export interface FoodParticle {
  position: Point
  velocity: Point
  size: number
  glow: number
  sparkles: Point[]
  consumed: boolean
  created: number
}

export interface BubbleEffect {
  position: Point
  velocity: Point
  size: number
  opacity: number
  type: 'content' | 'lonely' | 'excited'
  created: number
}

export interface PlatformCapabilities {
  hasHaptics: boolean
  hasDeviceMotion: boolean
  hasBatteryAPI: boolean
  hasNetworkInfo: boolean
  supportsMetal: boolean
  supportsOpenGL: boolean
  maxTextureSize: number
  devicePixelRatio: number
}

export interface PerformanceConfig {
  targetFPS: number
  qualityTier: 'low' | 'medium' | 'high'
  particleCount: number
  trailLength: number
  enableBloom: boolean
  enableComplexShaders: boolean
}

export interface FishEngineConfig {
  bounds: { width: number; height: number }
  capabilities: PlatformCapabilities
  performance: PerformanceConfig
  enableEmotionalAI: boolean
  enableMemorySystem: boolean
  enableParticleSystem: boolean
}

/**
 * Emotional State Machine
 */
export class EmotionalStateMachine {
  private currentState: EmotionalState
  private stateHistory: EmotionalState[] = []
  
  constructor() {
    this.currentState = {
      mood: 'curious',
      intensity: 0.5,
      duration: 0,
      transitionSpeed: 1.0
    }
  }
  
  getCurrentState(): EmotionalState {
    return { ...this.currentState }
  }
  
  transitionTo(newMood: EmotionalState['mood'], trigger: string, intensity: number = 0.7): void {
    if (this.currentState.mood !== newMood) {
      this.stateHistory.push({ ...this.currentState })
      if (this.stateHistory.length > 10) this.stateHistory.shift()
      
      this.currentState = {
        mood: newMood,
        intensity: Math.max(0, Math.min(1, intensity)),
        duration: 0,
        transitionSpeed: this.calculateTransitionSpeed(newMood, trigger)
      }
    }
  }
  
  update(deltaTime: number, context: {
    trustLevel: number
    timeSinceLastInteraction: number
    touchPresent: boolean
    touchMovement: number
  }): void {
    this.currentState.duration += deltaTime
    this.evaluateStateTransitions(context)
  }
  
  private calculateTransitionSpeed(mood: EmotionalState['mood'], trigger: string): number {
    const speedMap = {
      'excited': 2.0,
      'shy': 0.5,
      'playful': 1.5,
      'trusting': 0.8,
      'curious': 1.0,
      'lonely': 0.6
    }
    return speedMap[mood] || 1.0
  }
  
  private evaluateStateTransitions(context: {
    trustLevel: number
    timeSinceLastInteraction: number
    touchPresent: boolean
    touchMovement: number
  }): void {
    const { trustLevel, timeSinceLastInteraction, touchPresent, touchMovement } = context
    
    // Loneliness check
    if (timeSinceLastInteraction > 60000 && this.currentState.mood !== 'lonely') {
      this.transitionTo('lonely', 'timeout', 0.8)
      return
    }
    
    // Trust-based transitions
    if (trustLevel > 80 && touchPresent && this.currentState.mood !== 'trusting') {
      this.transitionTo('trusting', 'high_trust', 0.9)
      return
    }
    
    // Shyness for new visitors or rapid movements
    if (trustLevel < 30 || touchMovement > 50) {
      if (this.currentState.mood !== 'shy') {
        this.transitionTo('shy', 'low_trust_or_fast_movement', 0.6)
      }
      return
    }
    
    // Playful state for moderate trust with active interaction
    if (trustLevel > 50 && touchPresent && touchMovement > 10 && touchMovement < 30) {
      if (this.currentState.mood !== 'playful') {
        this.transitionTo('playful', 'moderate_trust_active', 0.7)
      }
      return
    }
    
    // Default curious state
    if (touchPresent && this.currentState.mood === 'lonely') {
      this.transitionTo('curious', 'attention_returned', 0.5)
    }
  }
}

/**
 * Memory and Trust System
 */
export class MemorySystem {
  private data: {
    trustLevel: number
    lastInteraction: number
    feedingSpots: Point[]
    interactionCount: number
    behaviorPattern: string
    visitDates: number[]
    personalityQuirks: string[]
  }
  
  private persistenceAdapter?: {
    save: (data: any) => Promise<void>
    load: () => Promise<any>
  }
  
  constructor(persistenceAdapter?: {
    save: (data: any) => Promise<void>
    load: () => Promise<any>
  }) {
    this.persistenceAdapter = persistenceAdapter
    this.data = {
      trustLevel: 20,
      lastInteraction: Date.now(),
      feedingSpots: [],
      interactionCount: 0,
      behaviorPattern: 'unknown',
      visitDates: [Date.now()],
      personalityQuirks: []
    }
  }
  
  async loadMemory(): Promise<void> {
    if (!this.persistenceAdapter) return
    
    try {
      const stored = await this.persistenceAdapter.load()
      if (stored) {
        this.data = { ...this.data, ...stored }
        // Decay trust over time
        const daysSinceLastVisit = (Date.now() - this.data.lastInteraction) / (1000 * 60 * 60 * 24)
        this.data.trustLevel = Math.max(0, this.data.trustLevel - daysSinceLastVisit * 2)
      }
    } catch (error) {
      console.warn('Failed to load memory:', error)
    }
  }
  
  async saveMemory(): Promise<void> {
    if (!this.persistenceAdapter) return
    
    try {
      await this.persistenceAdapter.save(this.data)
    } catch (error) {
      console.warn('Failed to save memory:', error)
    }
  }
  
  getTrustLevel(): number {
    return this.data.trustLevel
  }
  
  addTrust(amount: number): void {
    this.data.trustLevel = Math.min(100, Math.max(0, this.data.trustLevel + amount))
    this.data.lastInteraction = Date.now()
    this.saveMemory()
  }
  
  recordFeeding(position: Point): void {
    this.data.feedingSpots.push(position)
    if (this.data.feedingSpots.length > 10) {
      this.data.feedingSpots.shift()
    }
    this.addTrust(3)
  }
  
  recordInteraction(type: string): void {
    this.data.interactionCount++
    this.data.lastInteraction = Date.now()
    
    // Add daily visit
    const today = new Date().toDateString()
    const lastVisitDate = new Date(this.data.visitDates[this.data.visitDates.length - 1] || 0).toDateString()
    if (today !== lastVisitDate) {
      this.data.visitDates.push(Date.now())
      this.addTrust(5) // Daily visit bonus
    }
    
    this.saveMemory()
  }
  
  getFeedingSpots(): Point[] {
    return [...this.data.feedingSpots]
  }
  
  getTimeSinceLastInteraction(): number {
    return Date.now() - this.data.lastInteraction
  }
  
  getStats() {
    return {
      trustLevel: this.data.trustLevel,
      interactionCount: this.data.interactionCount,
      feedingSpots: this.data.feedingSpots.length,
      visitDays: this.data.visitDates.length
    }
  }
}

/**
 * Particle System
 */
export class ParticleSystem {
  private particles: FoodParticle[] = []
  private bubbles: BubbleEffect[] = []
  private maxParticles: number
  
  constructor(maxParticles: number = 50) {
    this.maxParticles = maxParticles
  }
  
  addFood(position: Point): void {
    if (this.particles.length >= this.maxParticles) return
    
    const particle: FoodParticle = {
      position: { ...position },
      velocity: { x: 0, y: 1.5 },
      size: 4 + Math.random() * 3,
      glow: 1.0,
      sparkles: [],
      consumed: false,
      created: Date.now()
    }
    
    // Add sparkles around food
    for (let i = 0; i < 8; i++) {
      particle.sparkles.push({
        x: position.x + (Math.random() - 0.5) * 20,
        y: position.y + (Math.random() - 0.5) * 20
      })
    }
    
    this.particles.push(particle)
  }
  
  addBubble(position: Point, type: BubbleEffect['type']): void {
    this.bubbles.push({
      position: { ...position },
      velocity: { x: (Math.random() - 0.5) * 0.5, y: -1 - Math.random() },
      size: 2 + Math.random() * 4,
      opacity: 0.6,
      type,
      created: Date.now()
    })
  }
  
  update(deltaTime: number, fishPosition: Point, bounds: { width: number; height: number }): Point | null {
    const dt = deltaTime / 16
    let consumedFood: Point | null = null
    
    // Update food particles
    this.particles = this.particles.filter(particle => {
      if (particle.consumed) return false
      
      particle.velocity.y += 0.05 * dt // Gravity
      particle.position.x += particle.velocity.x * dt
      particle.position.y += particle.velocity.y * dt
      
      // Check if fish ate the food
      const dx = fishPosition.x - particle.position.x
      const dy = fishPosition.y - particle.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < 15) {
        consumedFood = particle.position
        particle.consumed = true
        return false
      }
      
      // Remove old or off-screen food
      return Date.now() - particle.created < 10000 && particle.position.y < bounds.height + 50
    })
    
    // Update bubbles
    this.bubbles = this.bubbles.filter(bubble => {
      bubble.position.x += bubble.velocity.x * dt
      bubble.position.y += bubble.velocity.y * dt
      bubble.opacity -= 0.01 * dt
      return bubble.opacity > 0 && Date.now() - bubble.created < 5000
    })
    
    return consumedFood
  }
  
  getParticles(): FoodParticle[] {
    return [...this.particles]
  }
  
  getBubbles(): BubbleEffect[] {
    return [...this.bubbles]
  }
  
  clear(): void {
    this.particles = []
    this.bubbles = []
  }
}

/**
 * Core Fish Engine
 */
export class FishEngine {
  private config: FishEngineConfig
  private fish: FishState
  private ripples: RippleEffect[] = []
  private emotionalState: EmotionalStateMachine
  private memorySystem: MemorySystem
  private particleSystem: ParticleSystem
  private isRunning: boolean = false
  private lastUpdateTime: number = 0
  private touchPosition: Point | null = null
  private touchMovementSpeed: number = 0
  
  // Visual constants with mood variations
  private readonly MOOD_COLORS = {
    curious: { r: 255, g: 179, b: 71, a: 1 },    // #FFB347
    playful: { r: 255, g: 107, b: 157, a: 1 },   // #FF6B9D
    shy: { r: 179, g: 157, b: 219, a: 1 },       // #B39DDB
    excited: { r: 255, g: 235, b: 59, a: 1 },    // #FFEB3B
    trusting: { r: 129, g: 199, b: 132, a: 1 },  // #81C784
    lonely: { r: 144, g: 164, b: 174, a: 1 }     // #90A4AE
  }
  
  private readonly MAX_SPEED = 4.5
  private readonly IDLE_SPEED = 1.2
  private readonly DART_SPEED = 8
  
  constructor(config: FishEngineConfig, persistenceAdapter?: {
    save: (data: any) => Promise<void>
    load: () => Promise<any>
  }) {
    this.config = config
    
    // Initialize systems
    this.emotionalState = new EmotionalStateMachine()
    this.memorySystem = new MemorySystem(persistenceAdapter)
    this.particleSystem = new ParticleSystem(config.performance.particleCount)
    
    // Initialize fish state
    this.fish = {
      position: { x: config.bounds.width * 0.3, y: config.bounds.height * 0.5 },
      velocity: { x: this.IDLE_SPEED, y: 0 },
      targetVelocity: { x: this.IDLE_SPEED, y: 0 },
      angle: 0,
      glowIntensity: 0.8,
      dartCooldown: 0,
      trail: [],
      eyeDilation: 0.5,
      finSpread: 0.5,
      bodyTension: 0.3,
      swimPattern: 'idle',
      lastFedTime: 0
    }
    
    // Load saved memory
    this.memorySystem.loadMemory()
  }
  
  async initialize(): Promise<void> {
    await this.memorySystem.loadMemory()
    this.memorySystem.recordInteraction('visit')
  }
  
  start(): void {
    this.isRunning = true
    this.lastUpdateTime = Date.now()
  }
  
  stop(): void {
    this.isRunning = false
  }
  
  update(deltaTime: number): void {
    if (!this.isRunning) return
    
    const currentTime = Date.now()
    const dt = Math.min(deltaTime / 16, 2) // Cap delta time
    
    // Update emotional state
    this.emotionalState.update(deltaTime, {
      trustLevel: this.memorySystem.getTrustLevel(),
      timeSinceLastInteraction: this.memorySystem.getTimeSinceLastInteraction(),
      touchPresent: !!this.touchPosition,
      touchMovement: this.touchMovementSpeed
    })
    
    // Update fish behavior
    this.updateFishBehavior(dt)
    
    // Update particle system
    const consumedFood = this.particleSystem.update(deltaTime, this.fish.position, this.config.bounds)
    if (consumedFood) {
      this.onFoodConsumed(consumedFood)
    }
    
    // Update ripples
    this.updateRipples(deltaTime)
    
    // Update visual effects
    this.updateVisualEffects(deltaTime)
    
    this.lastUpdateTime = currentTime
  }
  
  private updateFishBehavior(dt: number): void {
    const currentMood = this.emotionalState.getCurrentState()
    
    // Update fish personality based on emotional state
    this.updateFishPersonality(currentMood, dt)
    
    // Handle dart cooldown
    if (this.fish.dartCooldown > 0) {
      this.fish.dartCooldown -= dt
    }
    
    // Behavioral patterns based on emotional state
    this.updateSwimmingBehavior(currentMood, dt)
    
    // Physics and movement
    this.updateFishPhysics(dt)
    
    // Boundary checking
    this.checkBoundaries()
    
    // Trail updates
    this.fish.trail.unshift({ ...this.fish.position })
    const maxTrailLength = this.config.performance.trailLength
    if (this.fish.trail.length > maxTrailLength) {
      this.fish.trail = this.fish.trail.slice(0, maxTrailLength)
    }
  }
  
  private updateFishPersonality(mood: EmotionalState, dt: number): void {
    // Update eye dilation based on mood
    const targetEyeDilation = this.getTargetEyeDilation(mood)
    this.fish.eyeDilation += (targetEyeDilation - this.fish.eyeDilation) * 0.1 * dt
    
    // Update fin spread based on mood
    const targetFinSpread = this.getTargetFinSpread(mood)
    this.fish.finSpread += (targetFinSpread - this.fish.finSpread) * 0.08 * dt
    
    // Update body tension based on mood
    const targetBodyTension = this.getTargetBodyTension(mood)
    this.fish.bodyTension += (targetBodyTension - this.fish.bodyTension) * 0.05 * dt
  }
  
  private getTargetEyeDilation(mood: EmotionalState): number {
    const dilationMap = {
      curious: 0.6,
      playful: 0.8,
      shy: 0.3,
      excited: 1.0,
      trusting: 0.7,
      lonely: 0.4
    }
    return (dilationMap[mood.mood] || 0.5) * mood.intensity
  }
  
  private getTargetFinSpread(mood: EmotionalState): number {
    const spreadMap = {
      curious: 0.5,
      playful: 0.9,
      shy: 0.2,
      excited: 1.0,
      trusting: 0.6,
      lonely: 0.3
    }
    return (spreadMap[mood.mood] || 0.5) * mood.intensity
  }
  
  private getTargetBodyTension(mood: EmotionalState): number {
    const tensionMap = {
      curious: 0.4,
      playful: 0.2,
      shy: 0.8,
      excited: 0.1,
      trusting: 0.3,
      lonely: 0.6
    }
    return (tensionMap[mood.mood] || 0.4) * mood.intensity
  }
  
  private updateSwimmingBehavior(mood: EmotionalState, dt: number): void {
    switch (mood.mood) {
      case 'curious':
        this.swimCuriously(dt)
        break
      case 'playful':
        this.swimPlayfully(dt)
        break
      case 'shy':
        this.swimShyly(dt)
        break
      case 'excited':
        this.swimExcitedly(dt)
        break
      case 'trusting':
        this.swimTrustingly(dt)
        break
      case 'lonely':
        this.swimLonely(dt)
        break
    }
  }
  
  private swimCuriously(dt: number): void {
    if (this.touchPosition) {
      const dx = this.touchPosition.x - this.fish.position.x
      const dy = this.touchPosition.y - this.fish.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 150 && distance < 300) {
        const approach = 0.3
        this.fish.targetVelocity.x = this.IDLE_SPEED + (dx / distance) * approach
        this.fish.targetVelocity.y = (dy / distance) * approach
      }
    } else {
      // Gentle wandering
      const time = Date.now() * 0.001
      this.fish.targetVelocity.x = this.IDLE_SPEED * (1 + Math.sin(time * 0.5) * 0.3)
      this.fish.targetVelocity.y = Math.sin(time * 0.3) * 0.4
    }
  }
  
  private swimPlayfully(dt: number): void {
    if (this.touchPosition) {
      const dx = this.touchPosition.x - this.fish.position.x
      const dy = this.touchPosition.y - this.fish.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < 100) {
        // Figure-8 patterns around touch
        const time = Date.now() * 0.005
        this.fish.targetVelocity.x = Math.cos(time) * 2.5
        this.fish.targetVelocity.y = Math.sin(time * 2) * 1.5
      } else {
        // Chase touch playfully
        this.fish.targetVelocity.x = (dx / distance) * this.IDLE_SPEED * 2
        this.fish.targetVelocity.y = (dy / distance) * this.IDLE_SPEED * 2
      }
    }
  }
  
  private swimShyly(dt: number): void {
    if (this.touchPosition) {
      // Retreat to edges
      const edgeX = this.fish.position.x < this.config.bounds.width / 2 ? 60 : this.config.bounds.width - 60
      const edgeY = this.fish.position.y < this.config.bounds.height / 2 ? 60 : this.config.bounds.height - 60
      
      this.fish.targetVelocity.x = (edgeX - this.fish.position.x) * 0.02
      this.fish.targetVelocity.y = (edgeY - this.fish.position.y) * 0.02
    } else {
      // Slow, cautious movement along edges
      this.fish.targetVelocity.x = this.IDLE_SPEED * 0.5
      this.fish.targetVelocity.y = Math.sin(Date.now() * 0.0003) * 0.2
    }
  }
  
  private swimExcitedly(dt: number): void {
    if (this.fish.swimPattern === 'feeding' && this.particleSystem.getParticles().length > 0) {
      // Dart toward food
      const food = this.particleSystem.getParticles()[0]
      const dx = food.position.x - this.fish.position.x
      const dy = food.position.y - this.fish.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 10) {
        this.fish.targetVelocity.x = (dx / distance) * this.DART_SPEED
        this.fish.targetVelocity.y = (dy / distance) * this.DART_SPEED
      }
    } else {
      // Rapid, erratic movements
      if (this.fish.dartCooldown <= 0) {
        this.fish.targetVelocity.x = (Math.random() - 0.5) * this.DART_SPEED * 1.5
        this.fish.targetVelocity.y = (Math.random() - 0.5) * this.DART_SPEED * 0.8
        this.fish.dartCooldown = 60
      }
    }
  }
  
  private swimTrustingly(dt: number): void {
    if (this.touchPosition) {
      const dx = this.touchPosition.x - this.fish.position.x
      const dy = this.touchPosition.y - this.fish.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      const followDistance = Math.max(30, 100 - this.memorySystem.getTrustLevel())
      if (distance > followDistance) {
        this.fish.targetVelocity.x = (dx / distance) * this.IDLE_SPEED * 1.5
        this.fish.targetVelocity.y = (dy / distance) * this.IDLE_SPEED * 1.5
      } else {
        this.fish.targetVelocity.x *= 0.95
        this.fish.targetVelocity.y *= 0.95
      }
    }
  }
  
  private swimLonely(dt: number): void {
    // Slow, melancholic wandering
    const time = Date.now() * 0.0003
    this.fish.targetVelocity.x = this.IDLE_SPEED * 0.4 * (1 + Math.sin(time) * 0.5)
    this.fish.targetVelocity.y = Math.sin(time * 0.7) * 0.3
    
    // Occasional sigh (bubble)
    if (Math.random() < 0.001) {
      this.particleSystem.addBubble(this.fish.position, 'lonely')
    }
  }
  
  private updateFishPhysics(dt: number): void {
    const currentMood = this.emotionalState.getCurrentState()
    const responsiveness = currentMood.mood === 'excited' ? 0.25 : 
                          currentMood.mood === 'shy' ? 0.08 : 
                          this.touchPosition ? 0.15 : 0.1
    
    this.fish.velocity.x += (this.fish.targetVelocity.x - this.fish.velocity.x) * responsiveness * dt
    this.fish.velocity.y += (this.fish.targetVelocity.y - this.fish.velocity.y) * responsiveness * dt
    
    // Speed limits based on mood
    const maxSpeed = currentMood.mood === 'excited' ? this.MAX_SPEED * 1.5 :
                     currentMood.mood === 'shy' ? this.MAX_SPEED * 0.6 :
                     this.MAX_SPEED
    
    const speed = Math.sqrt(this.fish.velocity.x ** 2 + this.fish.velocity.y ** 2)
    if (speed > maxSpeed) {
      this.fish.velocity.x = (this.fish.velocity.x / speed) * maxSpeed
      this.fish.velocity.y = (this.fish.velocity.y / speed) * maxSpeed
    }
    
    this.fish.position.x += this.fish.velocity.x * dt
    this.fish.position.y += this.fish.velocity.y * dt
    
    this.fish.angle = Math.atan2(this.fish.velocity.y, this.fish.velocity.x)
  }
  
  private checkBoundaries(): void {
    const margin = 40
    
    if (this.fish.position.x < margin) {
      this.fish.velocity.x = Math.abs(this.fish.velocity.x) * 0.9
      this.fish.targetVelocity.x = Math.abs(this.fish.targetVelocity.x)
      this.fish.position.x = margin
    } else if (this.fish.position.x > this.config.bounds.width - margin) {
      this.fish.velocity.x = -Math.abs(this.fish.velocity.x) * 0.9
      this.fish.targetVelocity.x = -Math.abs(this.fish.targetVelocity.x)
      this.fish.position.x = this.config.bounds.width - margin
    }
    
    const topMargin = 30
    const bottomMargin = 30
    
    if (this.fish.position.y < topMargin) {
      this.fish.velocity.y = Math.abs(this.fish.velocity.y) * 0.9
      this.fish.targetVelocity.y = Math.abs(this.fish.targetVelocity.y)
      this.fish.position.y = topMargin
    } else if (this.fish.position.y > this.config.bounds.height - bottomMargin) {
      this.fish.velocity.y = -Math.abs(this.fish.velocity.y) * 0.9
      this.fish.targetVelocity.y = -Math.abs(this.fish.targetVelocity.y)
      this.fish.position.y = this.config.bounds.height - bottomMargin
    }
  }
  
  private updateVisualEffects(deltaTime: number): void {
    const currentMood = this.emotionalState.getCurrentState()
    const baseIntensity = currentMood.mood === 'excited' ? 1.2 : 
                         currentMood.mood === 'shy' ? 0.4 :
                         currentMood.mood === 'lonely' ? 0.5 : 0.8
    
    const speed = Math.sqrt(this.fish.velocity.x ** 2 + this.fish.velocity.y ** 2)
    const pulseFactor = Math.sin(Date.now() * 0.003) * 0.15
    
    this.fish.glowIntensity = baseIntensity + pulseFactor + (speed / this.MAX_SPEED) * 0.2
  }
  
  private updateRipples(deltaTime: number): void {
    const dt = deltaTime / 16
    const currentMood = this.emotionalState.getCurrentState()
    
    this.ripples = this.ripples.filter(ripple => {
      const speed = currentMood.mood === 'excited' ? 2.0 : 1.5
      ripple.radius += speed * dt
      const baseOpacity = currentMood.mood === 'excited' ? 0.6 : 0.4
      ripple.opacity = Math.max(0, baseOpacity * (1 - ripple.radius / ripple.maxRadius))
      return ripple.opacity > 0.01
    })
  }
  
  private onFoodConsumed(foodPosition: Point): void {
    this.emotionalState.transitionTo('excited', 'food_consumed', 1.0)
    
    // Create satisfaction burst
    for (let i = 0; i < 8; i++) {
      this.particleSystem.addBubble(
        {
          x: foodPosition.x + (Math.random() - 0.5) * 30,
          y: foodPosition.y + (Math.random() - 0.5) * 30
        },
        'content'
      )
    }
    
    this.fish.lastFedTime = Date.now()
    this.fish.glowIntensity = Math.min(1.5, this.fish.glowIntensity + 0.5)
    this.fish.swimPattern = 'content'
    
    this.memorySystem.addTrust(2)
  }
  
  // Public API
  handleTouch(position: Point, type: 'tap' | 'move' | 'release'): void {
    if (type === 'tap') {
      this.addRipple(position)
      this.feedFish(position)
      this.memorySystem.recordInteraction('touch')
    } else if (type === 'move') {
      // Calculate touch movement speed
      if (this.touchPosition) {
        const dx = position.x - this.touchPosition.x
        const dy = position.y - this.touchPosition.y
        this.touchMovementSpeed = Math.sqrt(dx * dx + dy * dy)
      }
      
      this.touchPosition = position
      
      // Record gentle interaction
      if (this.touchMovementSpeed < 20) {
        this.memorySystem.addTrust(0.1)
      } else if (this.touchMovementSpeed > 50) {
        this.memorySystem.addTrust(-0.5)
      }
    } else if (type === 'release') {
      this.touchPosition = null
      this.touchMovementSpeed = 0
    }
  }
  
  private addRipple(position: Point): void {
    if (this.ripples.length < 8) {
      const mood = this.emotionalState.getCurrentState().mood
      const maxRadius = mood === 'excited' ? 120 : mood === 'shy' ? 40 : 80
      
      this.ripples.push({
        position: { ...position },
        radius: 0,
        opacity: mood === 'excited' ? 0.6 : 0.4,
        maxRadius,
        timestamp: Date.now()
      })
    }
  }
  
  private feedFish(feedPosition: Point): void {
    const mood = this.emotionalState.getCurrentState()
    
    // Create magical food particle
    this.particleSystem.addFood(feedPosition)
    
    // Record feeding location in memory
    this.memorySystem.recordFeeding(feedPosition)
    
    // Transition to excited state
    this.emotionalState.transitionTo('excited', 'feeding', 1.0)
    
    // Calculate direction to food
    const dx = feedPosition.x - this.fish.position.x
    const dy = feedPosition.y - this.fish.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 5) {
      const speed = Math.min(this.DART_SPEED * 1.2, distance * 0.12)
      this.fish.targetVelocity.x = (dx / distance) * speed
      this.fish.targetVelocity.y = (dy / distance) * speed
      
      this.fish.dartCooldown = 40
      this.fish.swimPattern = 'feeding'
      this.fish.eyeDilation = 1.0
      this.fish.finSpread = 1.0
      
      this.fish.glowIntensity = Math.min(1.2, this.fish.glowIntensity + 0.4)
    }
  }
  
  // Getters
  getFish(): FishState {
    return { ...this.fish }
  }
  
  getRipples(): RippleEffect[] {
    return [...this.ripples]
  }
  
  getParticles(): FoodParticle[] {
    return this.particleSystem.getParticles()
  }
  
  getBubbles(): BubbleEffect[] {
    return this.particleSystem.getBubbles()
  }
  
  getEmotionalState(): EmotionalState {
    return this.emotionalState.getCurrentState()
  }
  
  getMoodColor(): { r: number; g: number; b: number; a: number } {
    const mood = this.emotionalState.getCurrentState().mood
    return this.MOOD_COLORS[mood]
  }
  
  getMemoryStats() {
    return this.memorySystem.getStats()
  }
  
  async dispose(): Promise<void> {
    this.stop()
    await this.memorySystem.saveMemory()
    this.particleSystem.clear()
    this.ripples = []
  }
}