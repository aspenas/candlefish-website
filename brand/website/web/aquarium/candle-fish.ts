import { CandlefishEngine } from './candlefish'

export class CandleFishElement extends HTMLElement {
  private engine: CandlefishEngine | null = null
  private canvas: HTMLCanvasElement | null = null
  private fallbackImage: HTMLImageElement | null = null
  private isConnected = false
  
  static get observedAttributes() {
    return ['height', 'disabled', 'static']
  }
  
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }
  
  connectedCallback() {
    this.isConnected = true
    this.render()
    this.initializeEngine()
  }
  
  disconnectedCallback() {
    this.isConnected = false
    this.cleanup()
  }
  
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (!this.isConnected) return
    
    switch (name) {
      case 'height':
        this.updateHeight(newValue || '220')
        break
      case 'disabled':
      case 'static':
        if (newValue !== null) {
          this.showFallback()
        } else {
          this.initializeEngine()
        }
        break
    }
  }
  
  private render() {
    if (!this.shadowRoot) return
    
    const height = this.getAttribute('height') || '220'
    const isStatic = this.hasAttribute('static') || this.hasAttribute('disabled')
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: ${height}px;
          background: #3A3A60;
          position: relative;
          overflow: hidden;
        }
        
        canvas {
          display: block;
          width: 100%;
          height: 100%;
          cursor: crosshair;
        }
        
        .fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: #3A3A60;
        }
        
        .fallback img {
          width: auto;
          height: 60%;
          max-width: 90%;
          opacity: 0.8;
          filter: drop-shadow(0 0 20px #FFB347);
        }
        
        @media (max-width: 768px) {
          :host {
            height: ${Math.min(170, parseInt(height))}px;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          canvas {
            display: none;
          }
          .fallback {
            display: flex !important;
          }
        }
      </style>
      ${isStatic ? this.getFallbackHTML() : this.getCanvasHTML()}
    `
    
    if (!isStatic) {
      this.canvas = this.shadowRoot.querySelector('canvas')
    }
  }
  
  private getCanvasHTML(): string {
    return '<canvas aria-label="Animated bioluminescent candlefish swimming"></canvas>'
  }
  
  private getFallbackHTML(): string {
    return `
      <div class="fallback">
        <img src="/img/candlefish-static.svg" alt="Candlefish logo" />
      </div>
    `
  }
  
  private initializeEngine() {
    if (!this.canvas || this.engine) return
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    if (prefersReducedMotion) {
      this.showFallback()
      return
    }
    
    try {
      this.engine = new CandlefishEngine(this.canvas)
      this.engine.start()
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.engine?.start()
            } else {
              this.engine?.stop()
            }
          })
        },
        { threshold: 0.1 }
      )
      
      observer.observe(this)
    } catch (error) {
      console.error('Failed to initialize candlefish engine:', error)
      this.showFallback()
    }
  }
  
  private showFallback() {
    this.cleanup()
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
            height: ${this.getAttribute('height') || '220'}px;
            background: #3A3A60;
            position: relative;
            overflow: hidden;
          }
          .fallback {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }
          .fallback img {
            width: auto;
            height: 60%;
            max-width: 90%;
            opacity: 0.8;
            filter: drop-shadow(0 0 20px #FFB347);
          }
        </style>
        ${this.getFallbackHTML()}
      `
    }
  }
  
  private updateHeight(height: string) {
    if (this.shadowRoot) {
      const style = this.shadowRoot.querySelector('style')
      if (style) {
        style.textContent = style.textContent?.replace(
          /height:\s*\d+px/g,
          `height: ${height}px`
        ) || ''
      }
    }
    
    if (this.canvas) {
      this.canvas.style.height = `${height}px`
    }
  }
  
  private cleanup() {
    if (this.engine) {
      this.engine.destroy()
      this.engine = null
    }
    this.canvas = null
  }
  
  public pause() {
    this.engine?.stop()
  }
  
  public resume() {
    this.engine?.start()
  }
}

if (!customElements.get('candle-fish')) {
  customElements.define('candle-fish', CandleFishElement)
}