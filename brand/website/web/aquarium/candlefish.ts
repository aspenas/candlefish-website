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
}

export interface RippleEffect {
  position: Point
  radius: number
  opacity: number
  maxRadius: number
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
  
  private readonly GLOW_COLOR = '#FFB347'
  private readonly BACKGROUND_COLOR = '#3A3A60'
  private readonly MAX_SPEED = 3.5
  private readonly IDLE_SPEED = 0.8
  private readonly DART_SPEED = 6
  private readonly TRAIL_LENGTH = 30
  private readonly CURIOSITY_RADIUS = 200
  private readonly VERTICAL_VARIANCE = 0.25
  private readonly ATTRACTION_STRENGTH = 1.2
  private readonly FOOD_EXCITEMENT_RADIUS = 100
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.ctx = ctx
    
    this.fish = {
      position: { x: canvas.width * 0.3, y: canvas.height * 0.5 },
      velocity: { x: this.IDLE_SPEED, y: 0 },
      targetVelocity: { x: this.IDLE_SPEED, y: 0 },
      angle: 0,
      glowIntensity: 0.8,
      dartCooldown: 0,
      trail: []
    }
    
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.setupEventListeners()
    this.resizeCanvas()
  }
  
  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resizeCanvas())
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      this.cursorPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    })
    
    this.canvas.addEventListener('mouseleave', () => {
      this.cursorPosition = null
    })
    
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const clickPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      this.addRipple(clickPos)
      // Make fish immediately dart toward the click (food!)
      this.triggerFoodResponse(clickPos)
    })
    
    this.canvas.addEventListener('touchstart', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const touchPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }
      this.addRipple(touchPos)
      this.triggerFoodResponse(touchPos)
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
    if (this.ripples.length < 6) {
      this.ripples.push({
        position: { ...position },
        radius: 0,
        opacity: 0.4,
        maxRadius: 80
      })
    }
  }
  
  private triggerFoodResponse(foodPosition: Point): void {
    // Calculate direction to food
    const dx = foodPosition.x - this.fish.position.x
    const dy = foodPosition.y - this.fish.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 5) {
      // Immediate strong attraction to "food"
      const speed = Math.min(this.DART_SPEED, distance * 0.1)
      this.fish.targetVelocity.x = (dx / distance) * speed
      this.fish.targetVelocity.y = (dy / distance) * speed
      
      // Reset dart cooldown to allow immediate response
      this.fish.dartCooldown = 30
      
      // Increase glow for excitement
      this.fish.glowIntensity = Math.min(1.0, this.fish.glowIntensity + 0.3)
    }
  }
  
  private updateFish(deltaTime: number): void {
    if (this.reducedMotion) return
    
    const dt = Math.min(deltaTime / 16, 2)
    
    if (this.fish.dartCooldown > 0) {
      this.fish.dartCooldown -= dt
    }
    
    // Check cursor attraction first (highest priority)
    if (this.cursorPosition) {
      const dx = this.cursorPosition.x - this.fish.position.x
      const dy = this.cursorPosition.y - this.fish.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < this.CURIOSITY_RADIUS && distance > 15) {
        // Stronger, more immediate attraction to cursor
        const attraction = Math.pow(1 - distance / this.CURIOSITY_RADIUS, 1.5) * this.ATTRACTION_STRENGTH
        
        // If very close, get excited (like seeing food!)
        if (distance < this.FOOD_EXCITEMENT_RADIUS) {
          const excitementBoost = (1 - distance / this.FOOD_EXCITEMENT_RADIUS) * 2
          this.fish.targetVelocity.x = (dx / distance) * (attraction + excitementBoost)
          this.fish.targetVelocity.y = (dy / distance) * (attraction + excitementBoost)
          this.fish.glowIntensity = Math.min(1.0, 0.8 + (1 - distance / this.FOOD_EXCITEMENT_RADIUS) * 0.2)
        } else {
          // Curious approach from further away
          this.fish.targetVelocity.x = this.IDLE_SPEED + (dx / distance) * attraction * 2
          this.fish.targetVelocity.y = (dy / distance) * attraction * 2
        }
      } else if (distance <= 15) {
        // When very close to cursor, circle around it playfully
        const circleAngle = Date.now() * 0.003
        this.fish.targetVelocity.x = Math.cos(circleAngle) * this.IDLE_SPEED * 1.5
        this.fish.targetVelocity.y = Math.sin(circleAngle) * this.IDLE_SPEED * 1.5
      } else {
        // Default idle behavior when cursor is far
        const baseSpeed = this.IDLE_SPEED + Math.sin(Date.now() * 0.001) * 0.2
        this.fish.targetVelocity.x = baseSpeed * (1 + Math.sin(Date.now() * 0.0005) * 0.3)
        this.fish.targetVelocity.y = Math.sin(Date.now() * 0.0008) * 0.5
      }
    } else if (this.fish.dartCooldown <= 0 && Math.random() < 0.003) {
      // Random dart when no cursor present
      this.fish.targetVelocity.x = (Math.random() - 0.5) * this.DART_SPEED
      this.fish.targetVelocity.y = (Math.random() - 0.5) * this.DART_SPEED * 0.3
      this.fish.dartCooldown = 120
    } else if (this.fish.dartCooldown <= 0) {
      // Default idle swimming
      const baseSpeed = this.IDLE_SPEED + Math.sin(Date.now() * 0.001) * 0.2
      this.fish.targetVelocity.x = baseSpeed * (1 + Math.sin(Date.now() * 0.0005) * 0.3)
      this.fish.targetVelocity.y = Math.sin(Date.now() * 0.0008) * 0.5
    }
    
    // Smoother, more responsive velocity changes
    const responsiveness = this.cursorPosition ? 0.15 : 0.1
    this.fish.velocity.x += (this.fish.targetVelocity.x - this.fish.velocity.x) * responsiveness * dt
    this.fish.velocity.y += (this.fish.targetVelocity.y - this.fish.velocity.y) * responsiveness * dt
    
    const speed = Math.sqrt(this.fish.velocity.x ** 2 + this.fish.velocity.y ** 2)
    if (speed > this.MAX_SPEED) {
      this.fish.velocity.x = (this.fish.velocity.x / speed) * this.MAX_SPEED
      this.fish.velocity.y = (this.fish.velocity.y / speed) * this.MAX_SPEED
    }
    
    this.fish.position.x += this.fish.velocity.x * dt
    this.fish.position.y += this.fish.velocity.y * dt
    
    const bounds = this.canvas.getBoundingClientRect()
    const margin = 40
    
    // Bounce off horizontal walls with better physics
    if (this.fish.position.x < margin) {
      this.fish.velocity.x = Math.abs(this.fish.velocity.x) * 0.9
      this.fish.targetVelocity.x = Math.abs(this.fish.targetVelocity.x)
      this.fish.position.x = margin
    } else if (this.fish.position.x > bounds.width - margin) {
      this.fish.velocity.x = -Math.abs(this.fish.velocity.x) * 0.9
      this.fish.targetVelocity.x = -Math.abs(this.fish.targetVelocity.x)
      this.fish.position.x = bounds.width - margin
    }
    
    // More freedom vertically but still bounded
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
    
    this.fish.angle = Math.atan2(this.fish.velocity.y, this.fish.velocity.x)
    
    this.fish.glowIntensity = 0.7 + Math.sin(Date.now() * 0.003) * 0.15 + 
                               (speed / this.MAX_SPEED) * 0.15
    
    this.fish.trail.unshift({ ...this.fish.position })
    if (this.fish.trail.length > this.TRAIL_LENGTH) {
      this.fish.trail.pop()
    }
  }
  
  private updateRipples(deltaTime: number): void {
    const dt = deltaTime / 16
    
    this.ripples = this.ripples.filter(ripple => {
      ripple.radius += 1.5 * dt
      ripple.opacity = Math.max(0, 0.4 * (1 - ripple.radius / ripple.maxRadius))
      return ripple.opacity > 0.01
    })
  }
  
  private drawFish(): void {
    const { position, angle, glowIntensity } = this.fish
    
    this.ctx.save()
    this.ctx.translate(position.x, position.y)
    this.ctx.rotate(angle)
    
    this.ctx.shadowColor = this.GLOW_COLOR
    this.ctx.shadowBlur = 20 * glowIntensity
    
    this.ctx.strokeStyle = this.GLOW_COLOR
    this.ctx.lineWidth = 1.5
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    
    this.ctx.beginPath()
    this.ctx.moveTo(12, 0)
    this.ctx.quadraticCurveTo(8, -4, 0, -3)
    this.ctx.quadraticCurveTo(-8, -2, -12, 0)
    this.ctx.quadraticCurveTo(-8, 2, 0, 3)
    this.ctx.quadraticCurveTo(8, 4, 12, 0)
    this.ctx.closePath()
    this.ctx.stroke()
    
    this.ctx.beginPath()
    this.ctx.moveTo(-12, 0)
    this.ctx.lineTo(-18, -4)
    this.ctx.lineTo(-20, 0)
    this.ctx.lineTo(-18, 4)
    this.ctx.closePath()
    this.ctx.stroke()
    
    this.ctx.fillStyle = this.GLOW_COLOR
    this.ctx.globalAlpha = 0.6 * glowIntensity
    this.ctx.beginPath()
    this.ctx.arc(6, 0, 1.5, 0, Math.PI * 2)
    this.ctx.fill()
    
    this.ctx.restore()
  }
  
  private drawTrail(): void {
    if (this.fish.trail.length < 2) return
    
    this.ctx.strokeStyle = this.GLOW_COLOR
    this.ctx.lineCap = 'round'
    
    for (let i = 1; i < this.fish.trail.length; i++) {
      const alpha = (1 - i / this.fish.trail.length) * 0.3
      this.ctx.globalAlpha = alpha
      this.ctx.lineWidth = Math.max(0.5, 2 * (1 - i / this.fish.trail.length))
      
      this.ctx.beginPath()
      this.ctx.moveTo(this.fish.trail[i - 1].x, this.fish.trail[i - 1].y)
      this.ctx.lineTo(this.fish.trail[i].x, this.fish.trail[i].y)
      this.ctx.stroke()
    }
    
    this.ctx.globalAlpha = 1
  }
  
  private drawRipples(): void {
    this.ctx.strokeStyle = this.GLOW_COLOR
    
    for (const ripple of this.ripples) {
      this.ctx.globalAlpha = ripple.opacity
      this.ctx.lineWidth = 1
      
      this.ctx.beginPath()
      this.ctx.arc(ripple.position.x, ripple.position.y, ripple.radius, 0, Math.PI * 2)
      this.ctx.stroke()
    }
    
    this.ctx.globalAlpha = 1
  }
  
  private drawBubbles(): void {
    const time = Date.now() * 0.0005
    
    this.ctx.fillStyle = this.GLOW_COLOR
    this.ctx.globalAlpha = 0.05
    
    for (let i = 0; i < 4; i++) {
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
    
    this.ctx.fillStyle = this.BACKGROUND_COLOR
    this.ctx.fillRect(0, 0, rect.width, rect.height)
    
    if (!this.reducedMotion) {
      this.updateFish(deltaTime)
      this.updateRipples(deltaTime)
      
      this.drawBubbles()
      this.drawTrail()
      this.drawRipples()
    }
    
    this.drawFish()
    
    this.animationId = requestAnimationFrame((time) => this.render(time))
  }
  
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
    window.removeEventListener('resize', () => this.resizeCanvas())
  }
}