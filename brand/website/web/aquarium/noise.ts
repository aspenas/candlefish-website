export class PerlinNoise {
  private gradients: { [key: string]: [number, number] } = {}
  private memory: { [key: string]: number } = {}
  
  constructor(private seed: number = Math.random()) {}
  
  private rand(): number {
    const x = Math.sin(this.seed++) * 10000
    return x - Math.floor(x)
  }
  
  private dotGridGradient(ix: number, iy: number, x: number, y: number): number {
    const key = `${ix},${iy}`
    
    if (!this.gradients[key]) {
      const angle = this.rand() * Math.PI * 2
      this.gradients[key] = [Math.cos(angle), Math.sin(angle)]
    }
    
    const [gx, gy] = this.gradients[key]
    const dx = x - ix
    const dy = y - iy
    
    return dx * gx + dy * gy
  }
  
  private interpolate(a: number, b: number, w: number): number {
    return (b - a) * ((w * (w * 6.0 - 15.0) + 10.0) * w * w * w) + a
  }
  
  public noise(x: number, y: number): number {
    const key = `${x},${y}`
    
    if (this.memory[key] !== undefined) {
      return this.memory[key]
    }
    
    const x0 = Math.floor(x)
    const x1 = x0 + 1
    const y0 = Math.floor(y)
    const y1 = y0 + 1
    
    const sx = x - x0
    const sy = y - y0
    
    const n0 = this.dotGridGradient(x0, y0, x, y)
    const n1 = this.dotGridGradient(x1, y0, x, y)
    const ix0 = this.interpolate(n0, n1, sx)
    
    const n2 = this.dotGridGradient(x0, y1, x, y)
    const n3 = this.dotGridGradient(x1, y1, x, y)
    const ix1 = this.interpolate(n2, n3, sx)
    
    const value = this.interpolate(ix0, ix1, sy)
    this.memory[key] = value
    
    return value
  }
  
  public octaveNoise(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let total = 0
    let frequency = 1
    let amplitude = 1
    let maxValue = 0
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= persistence
      frequency *= 2
    }
    
    return total / maxValue
  }
}

export class SimplexNoise {
  private perm: number[] = []
  
  constructor(seed: number = Math.random()) {
    const p: number[] = []
    for (let i = 0; i < 256; i++) {
      p[i] = i
    }
    
    for (let i = 255; i > 0; i--) {
      const n = Math.floor((seed = (seed * 16807) % 2147483647) / 2147483647 * (i + 1))
      const q = p[i]
      p[i] = p[n]
      p[n] = q
    }
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255]
    }
  }
  
  public noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0)
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0
    
    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const t = (i + j) * G2
    
    const X0 = i - t
    const Y0 = j - t
    const x0 = x - X0
    const y0 = y - Y0
    
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1.0 + 2.0 * G2
    const y2 = y0 - 1.0 + 2.0 * G2
    
    const ii = i & 255
    const jj = j & 255
    
    const gi0 = this.perm[ii + this.perm[jj]] % 12
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12
    
    let t0 = 0.5 - x0 * x0 - y0 * y0
    const n0 = t0 < 0 ? 0 : Math.pow(t0, 4) * this.dot(gi0, x0, y0)
    
    let t1 = 0.5 - x1 * x1 - y1 * y1
    const n1 = t1 < 0 ? 0 : Math.pow(t1, 4) * this.dot(gi1, x1, y1)
    
    let t2 = 0.5 - x2 * x2 - y2 * y2
    const n2 = t2 < 0 ? 0 : Math.pow(t2, 4) * this.dot(gi2, x2, y2)
    
    return 70.0 * (n0 + n1 + n2)
  }
  
  private dot(gi: number, x: number, y: number): number {
    const grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ]
    
    const g = grad3[gi]
    return g[0] * x + g[1] * y
  }
}