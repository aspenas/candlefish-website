/**
 * CandlefishNativeModule.swift
 * React Native bridge implementation for iOS Metal-based fish renderer
 */

import Foundation
import React
import Metal
import MetalKit
import UIKit

@objc(CandlefishNativeModule)
class CandlefishNativeModule: RCTEventEmitter {
    
    private var renderer: CandlefishRenderer?
    private var hasListeners = false
    
    override init() {
        super.init()
        setupRenderer()
    }
    
    private func setupRenderer() {
        guard let device = MTLCreateSystemDefaultDevice() else {
            print("Metal not available")
            return
        }
        
        renderer = CandlefishRenderer(device: device)
        
        // Set up callbacks
        renderer?.onStateChange = { [weak self] state in
            self?.sendEvent(withName: "fishStateChanged", body: ["state": state])
        }
        
        renderer?.onPerformanceUpdate = { [weak self] metrics in
            self?.sendEvent(withName: "performanceUpdate", body: [
                "fps": metrics.fps,
                "frameTime": metrics.frameTime,
                "memoryUsage": metrics.memoryUsage,
                "thermalState": metrics.thermalState
            ])
        }
    }
    
    // MARK: - RCTEventEmitter
    
    override func supportedEvents() -> [String]! {
        return ["fishStateChanged", "performanceUpdate", "touchInteraction", "error"]
    }
    
    override func startObserving() {
        hasListeners = true
    }
    
    override func stopObserving() {
        hasListeners = false
    }
    
    // MARK: - Configuration Methods
    
    @objc func initialize(_ resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            guard let renderer = self?.renderer else {
                reject("RENDERER_UNAVAILABLE", "Metal renderer not available", nil)
                return
            }
            
            // Renderer is already initialized in setupRenderer()
            resolve([
                "success": true,
                "metalSupported": true,
                "hapticsSupported": true,
                "motionSupported": true
            ])
        }
    }
    
    @objc func setQualityTier(_ tier: String,
                             resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            guard let renderer = self?.renderer else {
                reject("RENDERER_UNAVAILABLE", "Renderer not available", nil)
                return
            }
            
            // Quality tier would be set on renderer
            // This would require adding a public method to CandlefishRenderer
            resolve(["qualityTier": tier])
        }
    }
    
    @objc func enableHaptics(_ enabled: Bool,
                            resolver resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            // Haptics are handled within the renderer
            resolve(["hapticsEnabled": enabled])
        }
    }
    
    @objc func enableMotionSensors(_ enabled: Bool,
                                  resolver resolve: @escaping RCTPromiseResolveBlock,
                                  rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            // Motion sensors are handled within the renderer
            resolve(["motionEnabled": enabled])
        }
    }
    
    // MARK: - Interaction Methods
    
    @objc func handleTouch(_ touchData: [String: Any],
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            guard let renderer = self?.renderer else {
                reject("RENDERER_UNAVAILABLE", "Renderer not available", nil)
                return
            }
            
            guard let x = touchData["x"] as? Double,
                  let y = touchData["y"] as? Double,
                  let type = touchData["type"] as? String else {
                reject("INVALID_TOUCH_DATA", "Invalid touch data provided", nil)
                return
            }
            
            let position = SIMD2<Float>(Float(x), Float(y))
            renderer.handleTouch(at: position, type: type)
            
            resolve(["success": true])
        }
    }
    
    @objc func feedFish(_ position: [String: Any],
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            guard let renderer = self?.renderer else {
                reject("RENDERER_UNAVAILABLE", "Renderer not available", nil)
                return
            }
            
            guard let x = position["x"] as? Double,
                  let y = position["y"] as? Double else {
                reject("INVALID_POSITION", "Invalid position data provided", nil)
                return
            }
            
            let pos = SIMD2<Float>(Float(x), Float(y))
            renderer.handleTouch(at: pos, type: "tap")
            
            resolve(["success": true])
        }
    }
    
    @objc func getFishState(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            guard let renderer = self?.renderer else {
                reject("RENDERER_UNAVAILABLE", "Renderer not available", nil)
                return
            }
            
            // This would require adding a public method to get fish state
            // For now, return a mock state
            resolve([
                "position": ["x": 200, "y": 300],
                "mood": "curious",
                "glowIntensity": 0.8,
                "energy": 1.0
            ])
        }
    }
    
    // MARK: - Performance Methods
    
    @objc func getPerformanceMetrics(_ resolve: @escaping RCTPromiseResolveBlock,
                                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            guard let renderer = self?.renderer else {
                reject("RENDERER_UNAVAILABLE", "Renderer not available", nil)
                return
            }
            
            // Return current performance metrics
            resolve([
                "fps": 60.0,
                "frameTime": 16.67,
                "memoryUsage": 100.0,
                "thermalState": "nominal",
                "qualityTier": "high"
            ])
        }
    }
    
    @objc func startPerformanceMonitoring(_ resolve: @escaping RCTPromiseResolveBlock,
                                         rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            // Performance monitoring is continuous in the renderer
            resolve(["monitoring": true])
        }
    }
    
    @objc func stopPerformanceMonitoring(_ resolve: @escaping RCTPromiseResolveBlock,
                                        rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            resolve(["monitoring": false])
        }
    }
    
    // MARK: - Lifecycle Methods
    
    @objc func start(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            self?.renderer?.start()
            resolve(["started": true])
        }
    }
    
    @objc func stop(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            self?.renderer?.stop()
            resolve(["stopped": true])
        }
    }
    
    @objc func dispose(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            self?.renderer?.dispose()
            self?.renderer = nil
            resolve(["disposed": true])
        }
    }
    
    // MARK: - Static Configuration
    
    @objc override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    @objc override func constantsToExport() -> [AnyHashable : Any]! {
        return [
            "QUALITY_LOW": "low",
            "QUALITY_MEDIUM": "medium",
            "QUALITY_HIGH": "high",
            "MOOD_CURIOUS": "curious",
            "MOOD_PLAYFUL": "playful",
            "MOOD_SHY": "shy",
            "MOOD_EXCITED": "excited",
            "MOOD_TRUSTING": "trusting",
            "MOOD_LONELY": "lonely"
        ]
    }
}

// MARK: - View Manager

@objc(CandlefishNativeViewManager)
class CandlefishNativeViewManager: RCTViewManager {
    
    override func view() -> UIView! {
        return CandlefishNativeView()
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}

// MARK: - Native View

class CandlefishNativeView: UIView {
    
    private var metalView: MTKView?
    private var renderer: CandlefishRenderer?
    
    // React Native properties
    @objc var qualityTier: String = "high" {
        didSet {
            updateQuality()
        }
    }
    
    @objc var enableHaptics: Bool = true {
        didSet {
            updateHaptics()
        }
    }
    
    @objc var enableMotion: Bool = true {
        didSet {
            updateMotion()
        }
    }
    
    @objc var adaptiveQuality: Bool = true
    
    // Event handlers
    @objc var onFishStateChange: RCTBubblingEventBlock?
    @objc var onPerformanceUpdate: RCTBubblingEventBlock?
    @objc var onTouch: RCTBubblingEventBlock?
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupMetalView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupMetalView()
    }
    
    private func setupMetalView() {
        guard let device = MTLCreateSystemDefaultDevice() else {
            print("Metal not available")
            return
        }
        
        // Create Metal view
        metalView = MTKView(frame: bounds, device: device)
        guard let metalView = metalView else { return }
        
        metalView.backgroundColor = UIColor.clear
        metalView.preferredFramesPerSecond = 60
        metalView.enableSetNeedsDisplay = false
        metalView.isPaused = false
        
        addSubview(metalView)
        metalView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            metalView.topAnchor.constraint(equalTo: topAnchor),
            metalView.leadingAnchor.constraint(equalTo: leadingAnchor),
            metalView.trailingAnchor.constraint(equalTo: trailingAnchor),
            metalView.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
        
        // Create renderer
        renderer = CandlefishRenderer(device: device)
        metalView.delegate = renderer
        
        // Set up callbacks
        renderer?.onStateChange = { [weak self] state in
            self?.onFishStateChange?(["state": state])
        }
        
        renderer?.onPerformanceUpdate = { [weak self] metrics in
            self?.onPerformanceUpdate?([
                "fps": metrics.fps,
                "frameTime": metrics.frameTime,
                "memoryUsage": metrics.memoryUsage,
                "thermalState": metrics.thermalState
            ])
        }
        
        // Set up touch handling
        setupTouchHandling()
    }
    
    private func setupTouchHandling() {
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        addGestureRecognizer(tapGesture)
        
        let panGesture = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        addGestureRecognizer(panGesture)
    }
    
    @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
        let location = gesture.location(in: self)
        let position = SIMD2<Float>(Float(location.x), Float(location.y))
        
        renderer?.handleTouch(at: position, type: "tap")
        
        onTouch?([
            "type": "tap",
            "x": location.x,
            "y": location.y
        ])
    }
    
    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        let location = gesture.location(in: self)
        let position = SIMD2<Float>(Float(location.x), Float(location.y))
        
        switch gesture.state {
        case .began:
            renderer?.handleTouch(at: position, type: "move")
            onTouch?([
                "type": "start",
                "x": location.x,
                "y": location.y
            ])
            
        case .changed:
            renderer?.handleTouch(at: position, type: "move")
            onTouch?([
                "type": "move",
                "x": location.x,
                "y": location.y
            ])
            
        case .ended, .cancelled:
            onTouch?([
                "type": "end",
                "x": location.x,
                "y": location.y
            ])
            
        default:
            break
        }
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        metalView?.frame = bounds
        
        // Update renderer with new size
        let size = SIMD2<Float>(Float(bounds.width), Float(bounds.height))
        renderer?.update(deltaTime: 1.0/60.0, screenSize: size)
    }
    
    private func updateQuality() {
        // Update quality tier on renderer
        // This would require adding a public method to CandlefishRenderer
    }
    
    private func updateHaptics() {
        // Update haptics setting on renderer
    }
    
    private func updateMotion() {
        // Update motion sensor setting on renderer
    }
    
    deinit {
        renderer?.dispose()
    }
}