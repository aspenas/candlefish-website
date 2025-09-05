/**
 * CandlefishRenderer.swift
 * High-performance Metal-based fish animation renderer for iOS
 */

import Foundation
import Metal
import MetalKit
import UIKit
import CoreHaptics
import CoreMotion

@objc public class CandlefishRenderer: NSObject, MTKViewDelegate {
    
    // MARK: - Metal Resources
    private var device: MTLDevice
    private var commandQueue: MTLCommandQueue
    private var renderPipelineState: MTLRenderPipelineState?
    private var computePipelineState: MTLComputePipelineState?
    private var depthStencilState: MTLDepthStencilState?
    
    // MARK: - Buffers
    private var fishVertexBuffer: MTLBuffer?
    private var trailVertexBuffer: MTLBuffer?
    private var particleBuffer: MTLBuffer?
    private var uniformBuffer: MTLBuffer?
    
    // MARK: - Textures
    private var fishTexture: MTLTexture?
    private var glowTexture: MTLTexture?
    private var noiseTexture: MTLTexture?
    
    // MARK: - Animation State
    private var fishState = FishState()
    private var particles: [Particle] = []
    private var ripples: [Ripple] = []
    private var trail: [SIMD2<Float>] = []
    private var emotionalState = EmotionalState()
    
    // MARK: - Timing
    private var lastUpdateTime: CFTimeInterval = 0
    private var frameCount: Int = 0
    
    // MARK: - Services
    private var hapticEngine: CHHapticEngine?
    private var motionManager: CMMotionManager?
    
    // MARK: - Configuration
    private var qualityTier: QualityTier = .high
    private var performanceMetrics = PerformanceMetrics()
    
    // MARK: - Callbacks
    public var onStateChange: ((String) -> Void)?
    public var onPerformanceUpdate: ((PerformanceMetrics) -> Void)?
    
    // MARK: - Structs for Metal
    struct FishState {
        var position: SIMD2<Float> = SIMD2<Float>(150, 200)
        var velocity: SIMD2<Float> = SIMD2<Float>(1.2, 0)
        var angle: Float = 0
        var glowIntensity: Float = 0.8
        var eyeDilation: Float = 0.5
        var finSpread: Float = 0.5
        var bodyTension: Float = 0.3
        var mood: Int32 = 0 // 0=curious, 1=playful, 2=shy, 3=excited, 4=trusting, 5=lonely
    }
    
    struct Particle {
        var position: SIMD2<Float>
        var velocity: SIMD2<Float>
        var life: Float
        var size: Float
        var type: Int32 // 0=food, 1=bubble
    }
    
    struct Ripple {
        var center: SIMD2<Float>
        var radius: Float
        var opacity: Float
        var maxRadius: Float
    }
    
    struct EmotionalState {
        var mood: Int32 = 0
        var intensity: Float = 0.5
        var transitionSpeed: Float = 1.0
        var timeSinceLastInteraction: Float = 0
    }
    
    struct Uniforms {
        var modelViewProjectionMatrix: simd_float4x4
        var time: Float
        var moodColor: SIMD4<Float>
        var screenSize: SIMD2<Float>
        var fishState: FishState
        var qualitySettings: SIMD4<Float> // particleCount, trailLength, enableBloom, textureQuality
    }
    
    struct PerformanceMetrics {
        var fps: Float = 60.0
        var frameTime: Float = 16.67
        var memoryUsage: Float = 0
        var thermalState: Int = 0 // 0=nominal, 1=fair, 2=serious, 3=critical
    }
    
    enum QualityTier: Int {
        case low = 0, medium = 1, high = 2
        
        var particleCount: Int {
            switch self {
            case .low: return 15
            case .medium: return 30
            case .high: return 50
            }
        }
        
        var trailLength: Int {
            switch self {
            case .low: return 10
            case .medium: return 25
            case .high: return 40
            }
        }
        
        var enableBloom: Bool {
            return self == .high
        }
    }
    
    // MARK: - Initialization
    public init(device: MTLDevice) {
        self.device = device
        self.commandQueue = device.makeCommandQueue()!
        
        super.init()
        
        setupMetal()
        setupHaptics()
        setupMotion()
        createBuffers()
        createTextures()
        
        // Initialize fish at screen center
        fishState.position = SIMD2<Float>(200, 300)
        
        // Start with some trail points
        for _ in 0..<qualityTier.trailLength {
            trail.append(fishState.position)
        }
    }
    
    private func setupMetal() {
        // Create render pipeline state
        guard let library = device.makeDefaultLibrary() else {
            fatalError("Unable to create Metal library")
        }
        
        let vertexFunction = library.makeFunction(name: "fishVertexShader")
        let fragmentFunction = library.makeFunction(name: "fishFragmentShader")
        
        let pipelineDescriptor = MTLRenderPipelineDescriptor()
        pipelineDescriptor.vertexFunction = vertexFunction
        pipelineDescriptor.fragmentFunction = fragmentFunction
        pipelineDescriptor.colorAttachments[0].pixelFormat = .bgra8Unorm
        pipelineDescriptor.colorAttachments[0].isBlendingEnabled = true
        pipelineDescriptor.colorAttachments[0].sourceRGBBlendFactor = .sourceAlpha
        pipelineDescriptor.colorAttachments[0].destinationRGBBlendFactor = .oneMinusSourceAlpha
        
        do {
            renderPipelineState = try device.makeRenderPipelineState(descriptor: pipelineDescriptor)
        } catch {
            fatalError("Unable to create render pipeline state: \(error)")
        }
        
        // Create compute pipeline for particles
        if let computeFunction = library.makeFunction(name: "particleComputeShader") {
            do {
                computePipelineState = try device.makeComputePipelineState(function: computeFunction)
            } catch {
                print("Warning: Unable to create compute pipeline state: \(error)")
            }
        }
        
        // Create depth stencil state
        let depthStencilDescriptor = MTLDepthStencilDescriptor()
        depthStencilDescriptor.depthCompareFunction = .less
        depthStencilDescriptor.isDepthWriteEnabled = true
        depthStencilState = device.makeDepthStencilState(descriptor: depthStencilDescriptor)
    }
    
    private func setupHaptics() {
        // Initialize Core Haptics
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else {
            print("Haptics not supported on this device")
            return
        }
        
        do {
            hapticEngine = try CHHapticEngine()
            try hapticEngine?.start()
        } catch {
            print("Failed to start haptic engine: \(error)")
        }
    }
    
    private func setupMotion() {
        motionManager = CMMotionManager()
        
        if motionManager?.isDeviceMotionAvailable == true {
            motionManager?.deviceMotionUpdateInterval = 0.1 // 10 Hz
            motionManager?.startDeviceMotionUpdates()
        }
    }
    
    private func createBuffers() {
        // Fish vertex buffer (for fish body shape)
        let fishVertices: [SIMD2<Float>] = createFishVertices()
        fishVertexBuffer = device.makeBuffer(
            bytes: fishVertices,
            length: MemoryLayout<SIMD2<Float>>.stride * fishVertices.count,
            options: []
        )
        
        // Trail vertex buffer
        trailVertexBuffer = device.makeBuffer(
            length: MemoryLayout<SIMD2<Float>>.stride * qualityTier.trailLength,
            options: .storageModeShared
        )
        
        // Particle buffer
        particles = Array(repeating: Particle(
            position: SIMD2<Float>(0, 0),
            velocity: SIMD2<Float>(0, 0),
            life: 0,
            size: 0,
            type: 0
        ), count: qualityTier.particleCount)
        
        particleBuffer = device.makeBuffer(
            bytes: particles,
            length: MemoryLayout<Particle>.stride * particles.count,
            options: .storageModeShared
        )
        
        // Uniform buffer
        uniformBuffer = device.makeBuffer(
            length: MemoryLayout<Uniforms>.stride,
            options: .storageModeShared
        )
    }
    
    private func createTextures() {
        // Create procedural glow texture
        glowTexture = createGlowTexture()
        
        // Create noise texture for organic movement
        noiseTexture = createNoiseTexture()
    }
    
    private func createFishVertices() -> [SIMD2<Float>] {
        // Create fish body vertices (simplified fish shape)
        var vertices: [SIMD2<Float>] = []
        
        // Fish body (ellipse)
        let segments = 20
        for i in 0...segments {
            let angle = Float(i) * 2.0 * Float.pi / Float(segments)
            let x = cos(angle) * 12.0
            let y = sin(angle) * 6.0
            vertices.append(SIMD2<Float>(x, y))
        }
        
        // Tail vertices
        vertices.append(SIMD2<Float>(-12, 0))
        vertices.append(SIMD2<Float>(-18, -6))
        vertices.append(SIMD2<Float>(-20, 0))
        vertices.append(SIMD2<Float>(-18, 6))
        
        return vertices
    }
    
    private func createGlowTexture() -> MTLTexture? {
        let size = 64
        let textureDescriptor = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: .rgba8Unorm,
            width: size,
            height: size,
            mipmapped: false
        )
        textureDescriptor.usage = [.shaderRead, .shaderWrite]
        
        guard let texture = device.makeTexture(descriptor: textureDescriptor) else {
            return nil
        }
        
        // Generate glow gradient
        var pixels = Array<UInt8>(repeating: 0, count: size * size * 4)
        let center = Float(size) / 2.0
        
        for y in 0..<size {
            for x in 0..<size {
                let dx = Float(x) - center
                let dy = Float(y) - center
                let distance = sqrt(dx * dx + dy * dy)
                let normalized = distance / center
                let intensity = max(0, 1.0 - normalized)
                let alpha = UInt8(intensity * 255)
                
                let index = (y * size + x) * 4
                pixels[index] = 255     // R
                pixels[index + 1] = 200 // G
                pixels[index + 2] = 100 // B
                pixels[index + 3] = alpha // A
            }
        }
        
        texture.replace(
            region: MTLRegionMake2D(0, 0, size, size),
            mipmapLevel: 0,
            withBytes: pixels,
            bytesPerRow: size * 4
        )
        
        return texture
    }
    
    private func createNoiseTexture() -> MTLTexture? {
        let size = 256
        let textureDescriptor = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: .r8Unorm,
            width: size,
            height: size,
            mipmapped: true
        )
        
        guard let texture = device.makeTexture(descriptor: textureDescriptor) else {
            return nil
        }
        
        // Generate Perlin noise
        var pixels = Array<UInt8>(repeating: 0, count: size * size)
        
        for y in 0..<size {
            for x in 0..<size {
                let noise = perlinNoise(x: Float(x) / 32.0, y: Float(y) / 32.0)
                let intensity = UInt8((noise + 1.0) * 127.5) // Convert from [-1,1] to [0,255]
                pixels[y * size + x] = intensity
            }
        }
        
        texture.replace(
            region: MTLRegionMake2D(0, 0, size, size),
            mipmapLevel: 0,
            withBytes: pixels,
            bytesPerRow: size
        )
        
        return texture
    }
    
    private func perlinNoise(x: Float, y: Float) -> Float {
        // Simplified Perlin noise implementation
        let xi = Int(floor(x)) & 255
        let yi = Int(floor(y)) & 255
        
        let xf = x - floor(x)
        let yf = y - floor(y)
        
        let u = fade(xf)
        let v = fade(yf)
        
        let aa = hash(xi, yi)
        let ab = hash(xi, yi + 1)
        let ba = hash(xi + 1, yi)
        let bb = hash(xi + 1, yi + 1)
        
        let x1 = mix(grad(aa, xf, yf), grad(ba, xf - 1, yf), u)
        let x2 = mix(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u)
        
        return mix(x1, x2, v)
    }
    
    private func fade(_ t: Float) -> Float {
        return t * t * t * (t * (t * 6 - 15) + 10)
    }
    
    private func mix(_ a: Float, _ b: Float, _ t: Float) -> Float {
        return a + t * (b - a)
    }
    
    private func grad(_ hash: Int, _ x: Float, _ y: Float) -> Float {
        let h = hash & 15
        let u = h < 8 ? x : y
        let v = h < 4 ? y : (h == 12 || h == 14 ? x : 0)
        return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v)
    }
    
    private func hash(_ x: Int, _ y: Int) -> Int {
        var hash = x
        hash = hash &* 374761393 &+ y
        hash = (hash << 13) | (hash >> 19)
        return hash & 0x7FFFFFFF
    }
    
    // MARK: - Update Logic
    public func update(deltaTime: Float, screenSize: SIMD2<Float>) {
        let currentTime = CACurrentMediaTime()
        
        updateFishBehavior(deltaTime: deltaTime, screenSize: screenSize)
        updateParticles(deltaTime: deltaTime)
        updateRipples(deltaTime: deltaTime)
        updateTrail()
        updateEmotionalState(deltaTime: deltaTime)
        
        // Performance tracking
        if lastUpdateTime > 0 {
            let frameDelta = currentTime - lastUpdateTime
            performanceMetrics.frameTime = Float(frameDelta * 1000) // Convert to ms
            performanceMetrics.fps = 1.0 / Float(frameDelta)
            
            // Adaptive quality based on performance
            adaptQualityToPerformance()
        }
        
        lastUpdateTime = currentTime
        frameCount += 1
        
        // Notify performance update every 60 frames
        if frameCount % 60 == 0 {
            onPerformanceUpdate?(performanceMetrics)
        }
    }
    
    private func updateFishBehavior(deltaTime: Float, screenSize: SIMD2<Float>) {
        // Apply device motion influence if available
        if let motion = motionManager?.deviceMotion {
            let tilt = SIMD2<Float>(Float(motion.attitude.roll) * 0.1, Float(motion.attitude.pitch) * 0.05)
            fishState.velocity = fishState.velocity + tilt * deltaTime
        }
        
        // Update position based on emotional state
        let mood = getMoodFromState()
        updateFishMovement(mood: mood, deltaTime: deltaTime, screenSize: screenSize)
        
        // Boundary checking
        let margin: Float = 40
        if fishState.position.x < margin || fishState.position.x > screenSize.x - margin {
            fishState.velocity.x *= -0.9
        }
        if fishState.position.y < margin || fishState.position.y > screenSize.y - margin {
            fishState.velocity.y *= -0.9
        }
        
        fishState.position = fishState.position + fishState.velocity * deltaTime
        fishState.angle = atan2(fishState.velocity.y, fishState.velocity.x)
    }
    
    private func updateFishMovement(mood: String, deltaTime: Float, screenSize: SIMD2<Float>) {
        switch mood {
        case "playful":
            // Figure-8 patterns and playful darting
            let time = Float(CACurrentMediaTime())
            fishState.velocity.x = cos(time * 2.0) * 3.0
            fishState.velocity.y = sin(time * 4.0) * 2.0
            
        case "shy":
            // Move toward edges slowly
            let centerX = screenSize.x / 2
            let centerY = screenSize.y / 2
            let edgeDirection = SIMD2<Float>(
                fishState.position.x < centerX ? -1 : 1,
                fishState.position.y < centerY ? -1 : 1
            )
            fishState.velocity = fishState.velocity + edgeDirection * 0.5 * deltaTime
            
        case "excited":
            // Rapid, erratic movements
            if Int.random(in: 0...120) == 0 { // Random dart
                fishState.velocity = SIMD2<Float>(
                    Float.random(in: -8...8),
                    Float.random(in: -4...4)
                )
                triggerHaptic(type: .dart)
            }
            
        default: // curious
            // Gentle wandering
            let time = Float(CACurrentMediaTime())
            let baseSpeed: Float = 1.2
            fishState.velocity.x = baseSpeed * (1.0 + sin(time * 0.5) * 0.3)
            fishState.velocity.y = sin(time * 0.3) * 0.4
        }
        
        // Clamp velocity
        let maxSpeed: Float = 6.0
        let speed = length(fishState.velocity)
        if speed > maxSpeed {
            fishState.velocity = fishState.velocity / speed * maxSpeed
        }
    }
    
    private func updateParticles(deltaTime: Float) {
        for i in 0..<particles.count {
            if particles[i].life > 0 {
                particles[i].position = particles[i].position + particles[i].velocity * deltaTime
                particles[i].life -= deltaTime
                
                // Apply gravity to food particles
                if particles[i].type == 0 {
                    particles[i].velocity.y += 50.0 * deltaTime
                }
            }
        }
    }
    
    private func updateRipples(deltaTime: Float) {
        for i in 0..<ripples.count {
            if ripples[i].opacity > 0 {
                ripples[i].radius += 100.0 * deltaTime
                ripples[i].opacity = max(0, ripples[i].opacity - deltaTime)
            }
        }
        
        // Remove expired ripples
        ripples.removeAll { $0.opacity <= 0 }
    }
    
    private func updateTrail() {
        trail.insert(fishState.position, at: 0)
        if trail.count > qualityTier.trailLength {
            trail.removeLast()
        }
        
        // Update trail buffer
        if let buffer = trailVertexBuffer {
            let bufferPointer = buffer.contents().bindMemory(to: SIMD2<Float>.self, capacity: trail.count)
            for (index, point) in trail.enumerated() {
                bufferPointer[index] = point
            }
        }
    }
    
    private func updateEmotionalState(deltaTime: Float) {
        emotionalState.timeSinceLastInteraction += deltaTime
        
        // Transition to lonely if no interaction
        if emotionalState.timeSinceLastInteraction > 60.0 && fishState.mood != 5 {
            transitionToMood(5, intensity: 0.8) // lonely
        }
    }
    
    private func adaptQualityToPerformance() {
        // Reduce quality if FPS drops below 30
        if performanceMetrics.fps < 30 && qualityTier != .low {
            let newTier: QualityTier = qualityTier == .high ? .medium : .low
            setQualityTier(newTier)
            print("Quality reduced to \(newTier)")
        }
        // Increase quality if FPS is stable above 55
        else if performanceMetrics.fps > 55 && qualityTier != .high {
            let newTier: QualityTier = qualityTier == .low ? .medium : .high
            setQualityTier(newTier)
            print("Quality increased to \(newTier)")
        }
    }
    
    private func setQualityTier(_ tier: QualityTier) {
        qualityTier = tier
        
        // Recreate buffers with new particle count
        particles = Array(repeating: Particle(
            position: SIMD2<Float>(0, 0),
            velocity: SIMD2<Float>(0, 0),
            life: 0,
            size: 0,
            type: 0
        ), count: qualityTier.particleCount)
        
        particleBuffer = device.makeBuffer(
            bytes: particles,
            length: MemoryLayout<Particle>.stride * particles.count,
            options: .storageModeShared
        )
        
        // Adjust trail length
        while trail.count > qualityTier.trailLength {
            trail.removeLast()
        }
        
        trailVertexBuffer = device.makeBuffer(
            length: MemoryLayout<SIMD2<Float>>.stride * qualityTier.trailLength,
            options: .storageModeShared
        )
    }
    
    // MARK: - Interaction Handling
    public func handleTouch(at position: SIMD2<Float>, type: String) {
        switch type {
        case "tap":
            addRipple(at: position)
            addFoodParticle(at: position)
            transitionToMood(3, intensity: 1.0) // excited
            triggerHaptic(type: .feed)
            
        case "move":
            // Fish follows touch gently
            let direction = position - fishState.position
            let distance = length(direction)
            if distance > 50 {
                fishState.velocity = fishState.velocity + normalize(direction) * 2.0
            }
            
        default:
            break
        }
        
        emotionalState.timeSinceLastInteraction = 0
    }
    
    private func addRipple(at position: SIMD2<Float>) {
        let ripple = Ripple(
            center: position,
            radius: 0,
            opacity: 0.6,
            maxRadius: 100
        )
        ripples.append(ripple)
    }
    
    private func addFoodParticle(at position: SIMD2<Float>) {
        // Find an unused particle
        for i in 0..<particles.count {
            if particles[i].life <= 0 {
                particles[i] = Particle(
                    position: position,
                    velocity: SIMD2<Float>(0, 1.5),
                    life: 5.0,
                    size: 6.0,
                    type: 0 // food
                )
                break
            }
        }
    }
    
    private func transitionToMood(_ mood: Int32, intensity: Float) {
        fishState.mood = mood
        emotionalState.mood = mood
        emotionalState.intensity = intensity
        
        // Update fish visual properties based on mood
        switch mood {
        case 0: // curious
            fishState.eyeDilation = 0.6
            fishState.finSpread = 0.5
        case 1: // playful
            fishState.eyeDilation = 0.8
            fishState.finSpread = 0.9
        case 2: // shy
            fishState.eyeDilation = 0.3
            fishState.finSpread = 0.2
        case 3: // excited
            fishState.eyeDilation = 1.0
            fishState.finSpread = 1.0
        case 4: // trusting
            fishState.eyeDilation = 0.7
            fishState.finSpread = 0.6
        case 5: // lonely
            fishState.eyeDilation = 0.4
            fishState.finSpread = 0.3
        default:
            break
        }
        
        let moodName = getMoodFromState()
        onStateChange?(moodName)
    }
    
    private func getMoodFromState() -> String {
        switch fishState.mood {
        case 0: return "curious"
        case 1: return "playful"
        case 2: return "shy"
        case 3: return "excited"
        case 4: return "trusting"
        case 5: return "lonely"
        default: return "curious"
        }
    }
    
    // MARK: - Haptic Feedback
    private func triggerHaptic(type: HapticType) {
        guard let engine = hapticEngine else { return }
        
        let events: [CHHapticEvent]
        
        switch type {
        case .feed:
            events = [
                CHHapticEvent(eventType: .hapticContinuous, parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.3),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.5)
                ], relativeTime: 0, duration: 0.1),
                CHHapticEvent(eventType: .hapticTransient, parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.5),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.8)
                ], relativeTime: 0.15)
            ]
        case .dart:
            events = [
                CHHapticEvent(eventType: .hapticTransient, parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.7),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 1.0)
                ], relativeTime: 0)
            ]
        }
        
        do {
            let pattern = try CHHapticPattern(events: events, parameters: [])
            let player = try engine.makePlayer(with: pattern)
            try player.start(atTime: CHHapticTimeImmediate)
        } catch {
            print("Haptic playback failed: \(error)")
        }
    }
    
    enum HapticType {
        case feed, dart
    }
    
    // MARK: - MTKViewDelegate
    public func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
        // Handle size changes if needed
    }
    
    public func draw(in view: MTKView) {
        guard let drawable = view.currentDrawable,
              let renderPassDescriptor = view.currentRenderPassDescriptor,
              let pipelineState = renderPipelineState,
              let commandBuffer = commandQueue.makeCommandBuffer(),
              let encoder = commandBuffer.makeRenderCommandEncoder(descriptor: renderPassDescriptor) else {
            return
        }
        
        let screenSize = SIMD2<Float>(Float(view.drawableSize.width), Float(view.drawableSize.height))
        
        // Update uniforms
        updateUniforms(screenSize: screenSize)
        
        encoder.setRenderPipelineState(pipelineState)
        encoder.setDepthStencilState(depthStencilState)
        
        // Draw fish trail
        drawTrail(encoder: encoder)
        
        // Draw ripples
        drawRipples(encoder: encoder)
        
        // Draw particles
        drawParticles(encoder: encoder)
        
        // Draw fish
        drawFish(encoder: encoder)
        
        encoder.endEncoding()
        commandBuffer.present(drawable)
        commandBuffer.commit()
    }
    
    private func updateUniforms(screenSize: SIMD2<Float>) {
        guard let buffer = uniformBuffer else { return }
        
        let uniforms = buffer.contents().bindMemory(to: Uniforms.self, capacity: 1)
        
        // Create orthographic projection matrix
        let left: Float = 0
        let right = screenSize.x
        let bottom = screenSize.y
        let top: Float = 0
        let near: Float = -1
        let far: Float = 1
        
        let projectionMatrix = simd_float4x4(
            SIMD4<Float>(2 / (right - left), 0, 0, -(right + left) / (right - left)),
            SIMD4<Float>(0, 2 / (top - bottom), 0, -(top + bottom) / (top - bottom)),
            SIMD4<Float>(0, 0, -2 / (far - near), -(far + near) / (far - near)),
            SIMD4<Float>(0, 0, 0, 1)
        )
        
        uniforms.pointee.modelViewProjectionMatrix = projectionMatrix
        uniforms.pointee.time = Float(CACurrentMediaTime())
        uniforms.pointee.moodColor = getMoodColor()
        uniforms.pointee.screenSize = screenSize
        uniforms.pointee.fishState = fishState
        uniforms.pointee.qualitySettings = SIMD4<Float>(
            Float(qualityTier.particleCount),
            Float(qualityTier.trailLength),
            qualityTier.enableBloom ? 1.0 : 0.0,
            1.0 // texture quality
        )
    }
    
    private func getMoodColor() -> SIMD4<Float> {
        switch fishState.mood {
        case 0: return SIMD4<Float>(1.0, 0.7, 0.28, 1.0) // curious - orange
        case 1: return SIMD4<Float>(1.0, 0.42, 0.61, 1.0) // playful - pink
        case 2: return SIMD4<Float>(0.7, 0.61, 0.86, 1.0) // shy - purple
        case 3: return SIMD4<Float>(1.0, 0.92, 0.23, 1.0) // excited - yellow
        case 4: return SIMD4<Float>(0.51, 0.78, 0.52, 1.0) // trusting - green
        case 5: return SIMD4<Float>(0.56, 0.64, 0.68, 1.0) // lonely - grey
        default: return SIMD4<Float>(1.0, 0.7, 0.28, 1.0)
        }
    }
    
    private func drawTrail(encoder: MTLRenderCommandEncoder) {
        guard let buffer = trailVertexBuffer else { return }
        
        encoder.setVertexBuffer(buffer, offset: 0, index: 0)
        encoder.setVertexBuffer(uniformBuffer, offset: 0, index: 1)
        encoder.drawPrimitives(type: .lineStrip, vertexStart: 0, vertexCount: trail.count)
    }
    
    private func drawRipples(encoder: MTLRenderCommandEncoder) {
        // Draw ripples as circles
        for ripple in ripples {
            if ripple.opacity > 0 {
                // This would use a circle geometry buffer
                // Implementation simplified for brevity
            }
        }
    }
    
    private func drawParticles(encoder: MTLRenderCommandEncoder) {
        guard let buffer = particleBuffer else { return }
        
        encoder.setVertexBuffer(buffer, offset: 0, index: 0)
        encoder.setVertexBuffer(uniformBuffer, offset: 0, index: 1)
        encoder.drawPrimitives(type: .point, vertexStart: 0, vertexCount: particles.count)
    }
    
    private func drawFish(encoder: MTLRenderCommandEncoder) {
        guard let buffer = fishVertexBuffer else { return }
        
        encoder.setVertexBuffer(buffer, offset: 0, index: 0)
        encoder.setVertexBuffer(uniformBuffer, offset: 0, index: 1)
        encoder.setFragmentTexture(glowTexture, index: 0)
        encoder.setFragmentTexture(noiseTexture, index: 1)
        
        // Draw fish body as triangle fan
        encoder.drawPrimitives(type: .triangleFan, vertexStart: 0, vertexCount: 22) // 20 body + center
        
        // Draw tail
        encoder.drawPrimitives(type: .triangleFan, vertexStart: 22, vertexCount: 4)
    }
    
    // MARK: - Public Interface
    public func start() {
        // Animation is driven by MTKView's preferred frames per second
    }
    
    public func stop() {
        // Pause rendering if needed
    }
    
    public func dispose() {
        hapticEngine?.stop()
        motionManager?.stopDeviceMotionUpdates()
    }
}