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
  swimPattern: string
  lastFedTime: number
}

export interface RippleEffect {
  position: Point
  radius: number
  opacity: number
  maxRadius: number
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

export interface EmotionalState {
  mood: 'curious' | 'playful' | 'shy' | 'excited' | 'trusting' | 'lonely'
  intensity: number
  duration: number
  transitionSpeed: number
}

export interface MemoryData {
  trustLevel: number
  lastInteraction: number
  feedingSpots: Point[]
  interactionCount: number
  behaviorPattern: string
  visitDates: number[]
  personalityQuirks: string[]
}

export interface BubbleEffect {
  position: Point
  velocity: Point
  size: number
  opacity: number
  type: 'content' | 'lonely' | 'excited'
}

// Emotional State Machine
class EmotionalStateMachine {
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
    return this.currentState
  }
  
  transitionTo(newMood: EmotionalState['mood'], trigger: string, intensity: number = 0.7): void {
    if (this.currentState.mood !== newMood) {
      this.stateHistory.push({ ...this.currentState })
      if (this.stateHistory.length > 10) this.stateHistory.shift()
      
      this.currentState = {
        mood: newMood,
        intensity: intensity,
        duration: 0,
        transitionSpeed: this.calculateTransitionSpeed(newMood, trigger)
      }
    }
  }
  
  update(deltaTime: number, context: any): void {
    this.currentState.duration += deltaTime
    
    // Evaluate state transitions based on context
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
  
  private evaluateStateTransitions(context: any): void {
    const { trustLevel, timeSinceLastInteraction, cursorPresent, cursorMovement } = context
    
    // Loneliness check
    if (timeSinceLastInteraction > 60000 && this.currentState.mood !== 'lonely') {
      this.transitionTo('lonely', 'timeout', 0.8)
      return
    }
    
    // Trust-based transitions
    if (trustLevel > 80 && cursorPresent && this.currentState.mood !== 'trusting') {
      this.transitionTo('trusting', 'high_trust', 0.9)
      return
    }
    
    // Shyness for new visitors or rapid movements
    if (trustLevel < 30 || cursorMovement > 50) {
      if (this.currentState.mood !== 'shy') {
        this.transitionTo('shy', 'low_trust_or_fast_movement', 0.6)
      }
      return
    }
    
    // Playful state for moderate trust with active interaction
    if (trustLevel > 50 && cursorPresent && cursorMovement > 10 && cursorMovement < 30) {
      if (this.currentState.mood !== 'playful') {
        this.transitionTo('playful', 'moderate_trust_active', 0.7)
      }
      return
    }
    
    // Default curious state
    if (cursorPresent && this.currentState.mood === 'lonely') {
      this.transitionTo('curious', 'attention_returned', 0.5)
    }
  }
}

// Memory and Trust System
class MemorySystem {
  private memoryData: MemoryData
  private readonly STORAGE_KEY = 'candlefish_memory'
  
  constructor() {
    this.loadMemory()
  }
  
  private loadMemory(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.memoryData = JSON.parse(stored)
        // Decay trust over time
        const daysSinceLastVisit = (Date.now() - this.memoryData.lastInteraction) / (1000 * 60 * 60 * 24)
        this.memoryData.trustLevel = Math.max(0, this.memoryData.trustLevel - daysSinceLastVisit)
      } else {
        this.resetMemory()
      }
    } catch (e) {
      this.resetMemory()
    }
  }
  
  private resetMemory(): void {
    this.memoryData = {
      trustLevel: 20,
      lastInteraction: Date.now(),
      feedingSpots: [],
      interactionCount: 0,
      behaviorPattern: 'unknown',
      visitDates: [Date.now()],
      personalityQuirks: []
    }
  }
  
  saveMemory(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.memoryData))
    } catch (e) {
      console.warn('Could not save fish memory:', e)
    }
  }
  
  getTrustLevel(): number {
    return this.memoryData.trustLevel
  }
  
  addTrust(amount: number): void {
    this.memoryData.trustLevel = Math.min(100, Math.max(0, this.memoryData.trustLevel + amount))
    this.memoryData.lastInteraction = Date.now()
    this.saveMemory()
  }
  
  recordFeeding(position: Point): void {
    this.memoryData.feedingSpots.push(position)
    if (this.memoryData.feedingSpots.length > 10) {
      this.memoryData.feedingSpots.shift()
    }
    this.addTrust(3)
    this.saveMemory()
  }
  
  recordInteraction(type: string): void {
    this.memoryData.interactionCount++
    this.memoryData.lastInteraction = Date.now()
    
    // Add daily visit
    const today = new Date().toDateString()
    const lastVisitDate = new Date(this.memoryData.visitDates[this.memoryData.visitDates.length - 1] || 0).toDateString()
    if (today !== lastVisitDate) {
      this.memoryData.visitDates.push(Date.now())
      this.addTrust(5) // Daily visit bonus
    }
    
    this.saveMemory()
  }
  
  getFeedingSpots(): Point[] {
    return this.memoryData.feedingSpots
  }
  
  getTimeSinceLastInteraction(): number {
    return Date.now() - this.memoryData.lastInteraction
  }
}

// Particle System for Food and Effects
class ParticleSystem {
  private particles: FoodParticle[] = []
  private bubbles: BubbleEffect[] = []
  private sparkles: Point[] = []
  
  addFood(position: Point, moodColor: string): void {
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
      type
    })
  }
  
  update(deltaTime: number, fishPosition: Point): Point | null {
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
      return Date.now() - particle.created < 10000 && particle.position.y < window.innerHeight + 50
    })
    
    // Update bubbles
    this.bubbles = this.bubbles.filter(bubble => {
      bubble.position.x += bubble.velocity.x * dt
      bubble.position.y += bubble.velocity.y * dt
      bubble.opacity -= 0.01 * dt
      return bubble.opacity > 0
    })
    
    return consumedFood
  }
  
  getParticles(): FoodParticle[] {
    return this.particles
  }
  
  getBubbles(): BubbleEffect[] {
    return this.bubbles
  }
}

export class CandlefishEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private fish: FishState
  private ripples: RippleEffect[] = []
  private animationId: number | null = null
  private lastTime: number = 0
  private isPaused: boolean = false
  private cursorPosition: Point | null = null
  private reducedMotion: boolean = false
  
  // Emotional AI Systems
  private emotionalState: EmotionalStateMachine
  private memorySystem: MemorySystem
  private particleSystem: ParticleSystem
  private lastCursorMovement: number = 0
  private cursorMovementSpeed: number = 0
  private greetingPlayed: boolean = false
  
  // Visual constants with mood variations
  private readonly MOOD_COLORS = {
    curious: '#FFB347',
    playful: '#FF6B9D',
    shy: '#B39DDB',
    excited: '#FFEB3B',
    trusting: '#81C784',
    lonely: '#90A4AE'
  }
  
  private readonly BACKGROUND_COLOR = '#1a1a2e'
  private readonly MAX_SPEED = 4.5
  private readonly IDLE_SPEED = 1.2
  private readonly DART_SPEED = 8
  private readonly TRAIL_LENGTH = 40
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.ctx = ctx
    
    // Initialize emotional AI systems
    this.emotionalState = new EmotionalStateMachine()
    this.memorySystem = new MemorySystem()
    this.particleSystem = new ParticleSystem()
    
    this.fish = {
      position: { x: canvas.width * 0.3, y: canvas.height * 0.5 },
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
    
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.setupEventListeners()
    this.resizeCanvas()
    
    // Record visit for memory system
    this.memorySystem.recordInteraction('visit')
    
    // Play greeting for returning visitors
    this.playGreetingIfReturningVisitor()
  }
  
  private playGreetingIfReturningVisitor(): void {
    const trustLevel = this.memorySystem.getTrustLevel()
    if (trustLevel > 40 && !this.greetingPlayed) {
      // Special greeting animation for returning visitors
      this.emotionalState.transitionTo('excited', 'greeting', 0.9)
      this.performGreetingAnimation()
      this.greetingPlayed = true
    }
  }
  
  private performGreetingAnimation(): void {
    // Create sparkle effect around fish
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        this.particleSystem.addBubble(
          {
            x: this.fish.position.x + (Math.random() - 0.5) * 40,
            y: this.fish.position.y + (Math.random() - 0.5) * 40
          },
          'excited'
        )
      }, i * 100)
    }
  }
  
  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resizeCanvas())
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const newCursor = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      
      // Calculate cursor movement speed for emotional state
      if (this.cursorPosition) {
        const dx = newCursor.x - this.cursorPosition.x
        const dy = newCursor.y - this.cursorPosition.y
        this.cursorMovementSpeed = Math.sqrt(dx * dx + dy * dy)
      }
      
      this.cursorPosition = newCursor
      this.lastCursorMovement = Date.now()
      
      // Record gentle interaction
      if (this.cursorMovementSpeed < 20) {
        this.memorySystem.addTrust(0.1)
      } else if (this.cursorMovementSpeed > 50) {
        this.memorySystem.addTrust(-0.5) // Fast movements reduce trust
      }
    })
    
    this.canvas.addEventListener('mouseleave', () => {
      this.cursorPosition = null
      this.cursorMovementSpeed = 0
    })
    
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const clickPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      
      this.addRipple(clickPos)
      this.feedFish(clickPos)
      this.memorySystem.recordInteraction('click')
    })
    
    this.canvas.addEventListener('touchstart', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const touchPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }
      
      this.addRipple(touchPos)
      this.feedFish(touchPos)
      this.memorySystem.recordInteraction('touch')
    })
    
    document.addEventListener('visibilitychange', () => {
      this.isPaused = document.hidden
    })
  }
  
  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    
    this.ctx.scale(dpr, dpr)
    this.canvas.style.width = rect.width + 'px'
    this.canvas.style.height = rect.height + 'px'
  }
  
  private addRipple(position: Point): void {
    if (this.ripples.length < 8) {
      const mood = this.emotionalState.getCurrentState().mood
      const maxRadius = mood === 'excited' ? 120 : mood === 'shy' ? 40 : 80
      
      this.ripples.push({
        position: { ...position },
        radius: 0,
        opacity: mood === 'excited' ? 0.6 : 0.4,
        maxRadius
      })
    }
  }
  
  private feedFish(feedPosition: Point): void {
    const mood = this.emotionalState.getCurrentState()
    const moodColor = this.MOOD_COLORS[mood.mood]
    
    // Create magical food particle
    this.particleSystem.addFood(feedPosition, moodColor)
    
    // Record feeding location in memory
    this.memorySystem.recordFeeding(feedPosition)
    
    // Transition to excited state
    this.emotionalState.transitionTo('excited', 'feeding', 1.0)
    
    // Calculate direction to food
    const dx = feedPosition.x - this.fish.position.x
    const dy = feedPosition.y - this.fish.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 5) {
      // Immediate strong attraction to food
      const speed = Math.min(this.DART_SPEED * 1.2, distance * 0.12)
      this.fish.targetVelocity.x = (dx / distance) * speed
      this.fish.targetVelocity.y = (dy / distance) * speed
      
      // Reset dart cooldown and set feeding behavior
      this.fish.dartCooldown = 40
      this.fish.swimPattern = 'feeding'
      this.fish.eyeDilation = 1.0 // Dilated eyes when excited
      this.fish.finSpread = 1.0 // Spread fins when excited
      
      // Increase glow for excitement
      this.fish.glowIntensity = Math.min(1.2, this.fish.glowIntensity + 0.4)
    }
  }
  
  private updateFish(deltaTime: number): void {
    if (this.reducedMotion) return
    
    const dt = Math.min(deltaTime / 16, 2)
    const currentMood = this.emotionalState.getCurrentState()
    
    // Update emotional state with context
    this.emotionalState.update(deltaTime, {
      trustLevel: this.memorySystem.getTrustLevel(),
      timeSinceLastInteraction: this.memorySystem.getTimeSinceLastInteraction(),
      cursorPresent: !!this.cursorPosition,
      cursorMovement: this.cursorMovementSpeed
    })
    
    // Update fish personality based on emotional state
    this.updateFishPersonality(currentMood, dt)
    
    // Update particle system and check for food consumption
    const consumedFood = this.particleSystem.update(deltaTime, this.fish.position)
    if (consumedFood) {
      this.onFoodConsumed(consumedFood)
    }
    
    if (this.fish.dartCooldown > 0) {
      this.fish.dartCooldown -= dt
    }
    
    // Behavioral patterns based on emotional state
    this.updateSwimmingBehavior(currentMood, dt)
    
    // Physics and movement
    this.updateFishPhysics(dt)
    
    // Boundary checking
    this.checkBoundaries()
    
    // Visual updates
    this.updateVisualEffects(currentMood, dt)
    
    // Trail updates
    this.fish.trail.unshift({ ...this.fish.position })
    if (this.fish.trail.length > this.TRAIL_LENGTH) {
      this.fish.trail.pop()
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
    return dilationMap[mood.mood] * mood.intensity
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
    return spreadMap[mood.mood] * mood.intensity
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
    return tensionMap[mood.mood] * mood.intensity
  }
  
  private updateSwimmingBehavior(mood: EmotionalState, dt: number): void {
    const trustLevel = this.memorySystem.getTrustLevel()
    
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
        this.swimTrustingly(dt, trustLevel)
        break
      case 'lonely':
        this.swimLonely(dt)
        break
    }
    
    // Check for feeding spots memory
    this.checkFeedingSpots()
  }
  
  private swimCuriously(dt: number): void {
    if (this.cursorPosition) {
      const dx = this.cursorPosition.x - this.fish.position.x
      const dy = this.cursorPosition.y - this.fish.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 150 && distance < 300) {
        // Approach cautiously
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
    if (this.cursorPosition) {
      const dx = this.cursorPosition.x - this.fish.position.x
      const dy = this.cursorPosition.y - this.fish.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < 100) {
        // Figure-8 patterns around cursor
        const time = Date.now() * 0.005
        const radius = 80
        this.fish.targetVelocity.x = Math.cos(time) * 2.5
        this.fish.targetVelocity.y = Math.sin(time * 2) * 1.5
      } else {
        // Chase cursor playfully
        this.fish.targetVelocity.x = (dx / distance) * this.IDLE_SPEED * 2
        this.fish.targetVelocity.y = (dy / distance) * this.IDLE_SPEED * 2
      }
    }
  }
  
  private swimShyly(dt: number): void {
    const bounds = this.canvas.getBoundingClientRect()
    
    if (this.cursorPosition) {
      // Retreat to edges
      const edgeX = this.fish.position.x < bounds.width / 2 ? 60 : bounds.width - 60
      const edgeY = this.fish.position.y < bounds.height / 2 ? 60 : bounds.height - 60
      
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
  
  private swimTrustingly(dt: number, trustLevel: number): void {
    if (this.cursorPosition) {
      const dx = this.cursorPosition.x - this.fish.position.x
      const dy = this.cursorPosition.y - this.fish.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Very close following
      const followDistance = Math.max(30, 100 - trustLevel)
      if (distance > followDistance) {
        this.fish.targetVelocity.x = (dx / distance) * this.IDLE_SPEED * 1.5
        this.fish.targetVelocity.y = (dy / distance) * this.IDLE_SPEED * 1.5
      } else {
        // Rest near cursor
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
  
  private checkFeedingSpots(): void {
    const feedingSpots = this.memorySystem.getFeedingSpots()
    const currentTime = Date.now()
    
    // If no food particles and fish remembers feeding spots, occasionally visit them
    if (this.particleSystem.getParticles().length === 0 && 
        feedingSpots.length > 0 && 
        currentTime - this.fish.lastFedTime > 30000) {
      
      const spot = feedingSpots[Math.floor(Math.random() * feedingSpots.length)]
      const dx = spot.x - this.fish.position.x
      const dy = spot.y - this.fish.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 50) {
        // Gently swim toward remembered feeding spot
        this.fish.targetVelocity.x += (dx / distance) * 0.5
        this.fish.targetVelocity.y += (dy / distance) * 0.5
      }
    }
  }
  
  private updateFishPhysics(dt: number): void {
    // Emotional responsiveness affects physics
    const currentMood = this.emotionalState.getCurrentState()
    const responsiveness = currentMood.mood === 'excited' ? 0.25 : 
                          currentMood.mood === 'shy' ? 0.08 : 
                          this.cursorPosition ? 0.15 : 0.1
    
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
    const bounds = this.canvas.getBoundingClientRect()
    const margin = 40
    
    // Bounce off walls with personality
    if (this.fish.position.x < margin) {
      this.fish.velocity.x = Math.abs(this.fish.velocity.x) * 0.9
      this.fish.targetVelocity.x = Math.abs(this.fish.targetVelocity.x)
      this.fish.position.x = margin
    } else if (this.fish.position.x > bounds.width - margin) {
      this.fish.velocity.x = -Math.abs(this.fish.velocity.x) * 0.9
      this.fish.targetVelocity.x = -Math.abs(this.fish.targetVelocity.x)
      this.fish.position.x = bounds.width - margin
    }
    
    const topMargin = 30
    const bottomMargin = 30
    
    if (this.fish.position.y < topMargin) {
      this.fish.velocity.y = Math.abs(this.fish.velocity.y) * 0.9
      this.fish.targetVelocity.y = Math.abs(this.fish.targetVelocity.y)
      this.fish.position.y = topMargin
    } else if (this.fish.position.y > bounds.height - bottomMargin) {
      this.fish.velocity.y = -Math.abs(this.fish.velocity.y) * 0.9
      this.fish.targetVelocity.y = -Math.abs(this.fish.targetVelocity.y)
      this.fish.position.y = bounds.height - bottomMargin
    }
  }
  
  private updateVisualEffects(mood: EmotionalState, dt: number): void {
    const baseIntensity = mood.mood === 'excited' ? 1.2 : 
                         mood.mood === 'shy' ? 0.4 :
                         mood.mood === 'lonely' ? 0.5 : 0.8
    
    const speed = Math.sqrt(this.fish.velocity.x ** 2 + this.fish.velocity.y ** 2)
    const pulseFactor = Math.sin(Date.now() * 0.003) * 0.15
    
    this.fish.glowIntensity = baseIntensity + pulseFactor + (speed / this.MAX_SPEED) * 0.2
  }
  
  private onFoodConsumed(foodPosition: Point): void {
    // Happy consumption effects
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
    
    // Update fish state
    this.fish.lastFedTime = Date.now()
    this.fish.glowIntensity = Math.min(1.5, this.fish.glowIntensity + 0.5)
    this.fish.swimPattern = 'content'
    
    // Add extra trust for successful feeding
    this.memorySystem.addTrust(2)
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
  
  private drawFish(): void {
    const { position, angle, glowIntensity, eyeDilation, finSpread, bodyTension } = this.fish
    const currentMood = this.emotionalState.getCurrentState()
    const moodColor = this.MOOD_COLORS[currentMood.mood]
    
    this.ctx.save()
    this.ctx.translate(position.x, position.y)
    this.ctx.rotate(angle)
    
    // Enhanced glow with mood colors
    const glowRadius = 20 + (glowIntensity - 0.5) * 10
    this.ctx.shadowColor = moodColor
    this.ctx.shadowBlur = glowRadius * glowIntensity
    
    this.ctx.strokeStyle = moodColor
    this.ctx.lineWidth = 1.5 + finSpread * 0.5
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    
    // Body with tension affecting curve
    const bodyWidth = 3 + (1 - bodyTension) * 2
    const bodyHeight = 4 - bodyTension
    
    this.ctx.beginPath()
    this.ctx.moveTo(12, 0)
    this.ctx.quadraticCurveTo(8, -bodyHeight, 0, -bodyWidth)
    this.ctx.quadraticCurveTo(-8, -bodyWidth + 1, -12, 0)
    this.ctx.quadraticCurveTo(-8, bodyWidth - 1, 0, bodyWidth)
    this.ctx.quadraticCurveTo(8, bodyHeight, 12, 0)
    this.ctx.closePath()
    this.ctx.stroke()
    
    // Tail with fin spread
    const tailSpread = 4 + finSpread * 3
    this.ctx.beginPath()
    this.ctx.moveTo(-12, 0)
    this.ctx.lineTo(-18, -tailSpread)
    this.ctx.lineTo(-20, 0)
    this.ctx.lineTo(-18, tailSpread)
    this.ctx.closePath()
    this.ctx.stroke()
    
    // Side fins with spread
    if (finSpread > 0.3) {
      const sideFin = 2 + finSpread * 2
      this.ctx.beginPath()
      this.ctx.moveTo(-2, -2)
      this.ctx.lineTo(-6, -sideFin - 2)
      this.ctx.stroke()
      
      this.ctx.beginPath()
      this.ctx.moveTo(-2, 2)
      this.ctx.lineTo(-6, sideFin + 2)
      this.ctx.stroke()
    }
    
    // Eye with dilation
    this.ctx.fillStyle = moodColor
    this.ctx.globalAlpha = 0.8 * glowIntensity
    const eyeSize = 1.2 + eyeDilation * 0.8
    this.ctx.beginPath()
    this.ctx.arc(6, 0, eyeSize, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Pupil contracts when dilated (excited/scared)
    if (eyeDilation > 0.6) {
      this.ctx.fillStyle = '#000'
      this.ctx.globalAlpha = 0.7
      this.ctx.beginPath()
      this.ctx.arc(6, 0, eyeSize * (1 - eyeDilation) * 0.5, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    this.ctx.restore()
  }
  
  private drawTrail(): void {
    if (this.fish.trail.length < 2) return
    
    const currentMood = this.emotionalState.getCurrentState()
    const moodColor = this.MOOD_COLORS[currentMood.mood]
    const trailIntensity = currentMood.mood === 'excited' ? 0.5 : 
                          currentMood.mood === 'playful' ? 0.4 : 0.3
    
    this.ctx.strokeStyle = moodColor
    this.ctx.lineCap = 'round'
    
    for (let i = 1; i < this.fish.trail.length; i++) {
      const alpha = (1 - i / this.fish.trail.length) * trailIntensity
      this.ctx.globalAlpha = alpha
      
      const lineWidth = currentMood.mood === 'excited' ? 
        Math.max(0.8, 3 * (1 - i / this.fish.trail.length)) :
        Math.max(0.5, 2 * (1 - i / this.fish.trail.length))
      this.ctx.lineWidth = lineWidth
      
      this.ctx.beginPath()
      this.ctx.moveTo(this.fish.trail[i - 1].x, this.fish.trail[i - 1].y)
      this.ctx.lineTo(this.fish.trail[i].x, this.fish.trail[i].y)
      this.ctx.stroke()
    }
    
    this.ctx.globalAlpha = 1
  }
  
  private drawRipples(): void {
    const currentMood = this.emotionalState.getCurrentState()
    const moodColor = this.MOOD_COLORS[currentMood.mood]
    
    this.ctx.strokeStyle = moodColor
    
    for (const ripple of this.ripples) {
      this.ctx.globalAlpha = ripple.opacity
      this.ctx.lineWidth = currentMood.mood === 'excited' ? 1.5 : 1
      
      this.ctx.beginPath()
      this.ctx.arc(ripple.position.x, ripple.position.y, ripple.radius, 0, Math.PI * 2)
      this.ctx.stroke()
      
      // Double ring for excited state
      if (currentMood.mood === 'excited' && ripple.opacity > 0.3) {
        this.ctx.globalAlpha = ripple.opacity * 0.5
        this.ctx.beginPath()
        this.ctx.arc(ripple.position.x, ripple.position.y, ripple.radius * 0.7, 0, Math.PI * 2)
        this.ctx.stroke()
      }
    }
    
    this.ctx.globalAlpha = 1
  }
  
  private drawFoodParticles(): void {
    const particles = this.particleSystem.getParticles()
    
    for (const particle of particles) {
      // Main food orb
      const gradient = this.ctx.createRadialGradient(
        particle.position.x, particle.position.y, 0,
        particle.position.x, particle.position.y, particle.size
      )
      gradient.addColorStop(0, `rgba(255, 235, 59, ${particle.glow})`)
      gradient.addColorStop(0.7, `rgba(255, 193, 7, ${particle.glow * 0.8})`)
      gradient.addColorStop(1, `rgba(255, 152, 0, 0)`)
      
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2)
      this.ctx.fill()
      
      // Sparkles around food
      this.ctx.fillStyle = '#FFD700'
      for (const sparkle of particle.sparkles) {
        this.ctx.globalAlpha = Math.random() * 0.8 + 0.2
        this.ctx.beginPath()
        this.ctx.arc(sparkle.x, sparkle.y, 0.5, 0, Math.PI * 2)
        this.ctx.fill()
      }
    }
    
    this.ctx.globalAlpha = 1
  }
  
  private drawBubbles(): void {
    const bubbles = this.particleSystem.getBubbles()
    
    for (const bubble of bubbles) {
      const bubbleColor = bubble.type === 'excited' ? '#FFD700' :
                         bubble.type === 'lonely' ? '#90A4AE' :
                         '#81C784'
      
      this.ctx.strokeStyle = bubbleColor
      this.ctx.globalAlpha = bubble.opacity
      this.ctx.lineWidth = 0.5
      
      this.ctx.beginPath()
      this.ctx.arc(bubble.position.x, bubble.position.y, bubble.size, 0, Math.PI * 2)
      this.ctx.stroke()
      
      // Inner highlight
      this.ctx.globalAlpha = bubble.opacity * 0.3
      this.ctx.beginPath()
      this.ctx.arc(bubble.position.x - bubble.size * 0.3, bubble.position.y - bubble.size * 0.3, 
                   bubble.size * 0.4, 0, Math.PI * 2)
      this.ctx.stroke()
    }
    
    // Ambient bubbles
    const time = Date.now() * 0.0005
    const currentMood = this.emotionalState.getCurrentState()
    const moodColor = this.MOOD_COLORS[currentMood.mood]
    
    this.ctx.fillStyle = moodColor
    this.ctx.globalAlpha = currentMood.mood === 'lonely' ? 0.02 : 0.05
    
    const bubbleCount = currentMood.mood === 'excited' ? 6 : 4
    for (let i = 0; i < bubbleCount; i++) {
      const x = (Math.sin(time + i * 1.7) * 0.5 + 0.5) * this.canvas.width
      const y = ((time * 0.3 + i * 0.25) % 1) * this.canvas.height
      const radius = 2 + Math.sin(time * 3 + i) * 1
      
      this.ctx.beginPath()
      this.ctx.arc(x, y, radius, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    this.ctx.globalAlpha = 1
  }
  
  private render(currentTime: number): void {
    if (this.isPaused) {
      this.animationId = requestAnimationFrame((time) => this.render(time))
      return
    }
    
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime
    
    const rect = this.canvas.getBoundingClientRect()
    this.ctx.clearRect(0, 0, rect.width, rect.height)
    
    // Mood-influenced background
    const currentMood = this.emotionalState.getCurrentState()
    const bgGradient = this.ctx.createRadialGradient(
      rect.width / 2, rect.height / 2, 0,
      rect.width / 2, rect.height / 2, Math.max(rect.width, rect.height)
    )
    
    // Background gradient based on mood
    switch (currentMood.mood) {
      case 'excited':
        bgGradient.addColorStop(0, '#2a1a4e')
        bgGradient.addColorStop(1, '#1a1a2e')
        break
      case 'shy':
        bgGradient.addColorStop(0, '#1e1e3a')
        bgGradient.addColorStop(1, '#0f0f1f')
        break
      case 'lonely':
        bgGradient.addColorStop(0, '#1a1a3a')
        bgGradient.addColorStop(1, '#0a0a2a')
        break
      case 'trusting':
        bgGradient.addColorStop(0, '#1e2a1e')
        bgGradient.addColorStop(1, '#1a1a2e')
        break
      case 'playful':
        bgGradient.addColorStop(0, '#2e1a3e')
        bgGradient.addColorStop(1, '#1a1a2e')
        break
      default:
        bgGradient.addColorStop(0, '#1e2a3e')
        bgGradient.addColorStop(1, '#1a1a2e')
    }
    
    this.ctx.fillStyle = bgGradient
    this.ctx.fillRect(0, 0, rect.width, rect.height)
    
    if (!this.reducedMotion) {
      this.updateFish(deltaTime)
      this.updateRipples(deltaTime)
      
      // Render layers
      this.drawBubbles()
      this.drawFoodParticles()
      this.drawTrail()
      this.drawRipples()
    }
    
    this.drawFish()
    
    // Debug info for development
    if (process.env.NODE_ENV === 'development') {
      this.drawDebugInfo(currentMood)
    }
    
    this.animationId = requestAnimationFrame((time) => this.render(time))
  }
  
  private drawDebugInfo(mood: EmotionalState): void {
    const trustLevel = this.memorySystem.getTrustLevel()
    const timeSinceInteraction = this.memorySystem.getTimeSinceLastInteraction()
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    this.ctx.font = '12px monospace'
    this.ctx.fillText(`Mood: ${mood.mood} (${mood.intensity.toFixed(2)})`, 10, 20)
    this.ctx.fillText(`Trust: ${trustLevel.toFixed(1)}`, 10, 35)
    this.ctx.fillText(`Last Interaction: ${Math.floor(timeSinceInteraction / 1000)}s`, 10, 50)
    this.ctx.fillText(`Cursor Speed: ${this.cursorMovementSpeed.toFixed(1)}`, 10, 65)
    this.ctx.fillText(`Eye Dilation: ${this.fish.eyeDilation.toFixed(2)}`, 10, 80)
    this.ctx.fillText(`Fin Spread: ${this.fish.finSpread.toFixed(2)}`, 10, 95)
    this.ctx.fillText(`Body Tension: ${this.fish.bodyTension.toFixed(2)}`, 10, 110)
    this.ctx.fillText(`Pattern: ${this.fish.swimPattern}`, 10, 125)
  }
  
  // Public API methods
  public start(): void {
    if (this.animationId === null) {
      this.lastTime = performance.now()
      this.render(this.lastTime)
    }
  }
  
  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }
  
  public destroy(): void {
    this.stop()
    this.memorySystem.saveMemory()
    window.removeEventListener('resize', () => this.resizeCanvas())
  }
  
  // Additional public methods for interaction
  public getTrustLevel(): number {
    return this.memorySystem.getTrustLevel()
  }
  
  public getCurrentMood(): EmotionalState {
    return this.emotionalState.getCurrentState()
  }
  
  public getFishStats(): {
    trust: number
    mood: string
    interactions: number
    feedingSpots: number
    timeSinceLastFed: number
  } {
    const memory = this.memorySystem as any
    return {
      trust: this.memorySystem.getTrustLevel(),
      mood: this.emotionalState.getCurrentState().mood,
      interactions: memory.memoryData?.interactionCount || 0,
      feedingSpots: memory.memoryData?.feedingSpots?.length || 0,
      timeSinceLastFed: Date.now() - this.fish.lastFedTime
    }
  }
  
  public resetMemory(): void {
    localStorage.removeItem('candlefish_memory')
    this.memorySystem = new MemorySystem()
    this.emotionalState.transitionTo('curious', 'memory_reset', 0.5)
  }
}