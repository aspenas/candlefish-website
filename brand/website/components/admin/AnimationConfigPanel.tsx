'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { AnimationConfig, AnimationConfigPanelProps } from '../../types/animation'
import { useAnimationConfig } from '../../hooks/useAnimationConfig'

export const AnimationConfigPanel: React.FC<AnimationConfigPanelProps> = ({
  animationId,
  onConfigChange,
  readOnly = false
}) => {
  const { config, loading, error, updateConfig } = useAnimationConfig(animationId)
  const [localConfig, setLocalConfig] = useState<AnimationConfig | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync local config with fetched config
  useEffect(() => {
    if (config && !isDirty) {
      setLocalConfig(config)
    }
  }, [config, isDirty])

  const handleConfigUpdate = useCallback((
    section: keyof AnimationConfig,
    updates: Record<string, unknown>
  ) => {
    if (readOnly || !localConfig) return

    setLocalConfig(prev => {
      if (!prev) return prev
      return {
        ...prev,
        [section]: {
          ...(prev[section] as Record<string, unknown>),
          ...updates
        }
      }
    })
    setIsDirty(true)
  }, [readOnly, localConfig])

  const handleSave = useCallback(async () => {
    if (!localConfig || saving) return

    setSaving(true)
    setSaveError(null)

    try {
      const updatedConfig = await updateConfig(localConfig)
      setIsDirty(false)
      onConfigChange?.(updatedConfig)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }, [localConfig, saving, updateConfig, onConfigChange])

  const handleReset = useCallback(() => {
    if (config) {
      setLocalConfig(config)
      setIsDirty(false)
      setSaveError(null)
    }
  }, [config])

  if (loading) {
    return (
      <div className="animate-pulse bg-[#1B263B]/20 border border-[#415A77]/20 rounded-lg p-6">
        <div className="h-6 bg-[#415A77]/20 rounded mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-4 bg-[#415A77]/10 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !localConfig) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
        <h3 className="text-red-300 font-medium mb-2">Configuration Error</h3>
        <p className="text-red-200 text-sm">{error || 'No configuration found'}</p>
      </div>
    )
  }

  return (
    <div className="bg-[#1B263B]/20 border border-[#415A77]/20 rounded-lg p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-light text-[#F8F8F2] mb-2">
            Animation Configuration
          </h2>
          <p className="text-[#415A77] text-sm">
            ID: {animationId}
            {readOnly && <span className="ml-2 text-amber-400">(Read Only)</span>}
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-3">
            {isDirty && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-[#415A77] hover:text-[#F8F8F2] transition-colors text-sm"
                disabled={saving}
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="px-6 py-2 bg-[#3FD3C6] text-[#0D1B2A] rounded hover:bg-[#3FD3C6]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {saveError && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300 text-sm">{saveError}</p>
        </div>
      )}

      {/* Basic Settings */}
      <section className="space-y-4">
        <h3 className="text-lg font-light text-[#F8F8F2] border-b border-[#415A77]/20 pb-2">
          Basic Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[#E0E1DD] text-sm mb-2 block">Enabled</span>
            <input
              type="checkbox"
              checked={localConfig.enabled}
              onChange={(e) => handleConfigUpdate('enabled' as keyof AnimationConfig, e.target.checked)}
              disabled={readOnly}
              className="w-5 h-5 text-[#3FD3C6] bg-[#1B263B] border border-[#415A77] rounded focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-0"
            />
          </label>
          <label className="block">
            <span className="text-[#E0E1DD] text-sm mb-2 block">
              Speed ({localConfig.speed.toFixed(1)})
            </span>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={localConfig.speed}
              onChange={(e) => handleConfigUpdate('speed' as keyof AnimationConfig, parseFloat(e.target.value))}
              disabled={readOnly}
              className="w-full h-2 bg-[#1B263B] rounded-lg appearance-none cursor-pointer slider"
            />
          </label>
        </div>
      </section>

      {/* Colors */}
      <section className="space-y-4">
        <h3 className="text-lg font-light text-[#F8F8F2] border-b border-[#415A77]/20 pb-2">
          Colors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(localConfig.colors).map(([key, value]) => (
            <label key={key} className="block">
              <span className="text-[#E0E1DD] text-sm mb-2 block capitalize">{key}</span>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleConfigUpdate('colors', { [key]: e.target.value })}
                  disabled={readOnly}
                  className="w-12 h-8 bg-[#1B263B] border border-[#415A77] rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleConfigUpdate('colors', { [key]: e.target.value })}
                  disabled={readOnly}
                  className="flex-1 px-3 py-2 bg-[#1B263B] border border-[#415A77] rounded text-[#F8F8F2] text-sm focus:ring-2 focus:ring-[#3FD3C6] focus:border-transparent"
                />
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Behavior */}
      <section className="space-y-4">
        <h3 className="text-lg font-light text-[#F8F8F2] border-b border-[#415A77]/20 pb-2">
          Behavior
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[#E0E1DD] text-sm mb-2 block">
              Curiosity Radius ({localConfig.behavior.curiosityRadius}px)
            </span>
            <input
              type="range"
              min="50"
              max="300"
              step="10"
              value={localConfig.behavior.curiosityRadius}
              onChange={(e) => handleConfigUpdate('behavior', { curiosityRadius: parseInt(e.target.value) })}
              disabled={readOnly}
              className="w-full h-2 bg-[#1B263B] rounded-lg appearance-none cursor-pointer slider"
            />
          </label>
          <label className="block">
            <span className="text-[#E0E1DD] text-sm mb-2 block">
              Dart Frequency ({(localConfig.behavior.dartFrequency * 100).toFixed(1)}%)
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={localConfig.behavior.dartFrequency}
              onChange={(e) => handleConfigUpdate('behavior', { dartFrequency: parseFloat(e.target.value) })}
              disabled={readOnly}
              className="w-full h-2 bg-[#1B263B] rounded-lg appearance-none cursor-pointer slider"
            />
          </label>
          <label className="block">
            <span className="text-[#E0E1DD] text-sm mb-2 block">
              Trail Length ({localConfig.behavior.trailLength})
            </span>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={localConfig.behavior.trailLength}
              onChange={(e) => handleConfigUpdate('behavior', { trailLength: parseInt(e.target.value) })}
              disabled={readOnly}
              className="w-full h-2 bg-[#1B263B] rounded-lg appearance-none cursor-pointer slider"
            />
          </label>
          <label className="block">
            <span className="text-[#E0E1DD] text-sm mb-2 block">
              Glow Intensity ({(localConfig.behavior.glowIntensity * 100).toFixed(0)}%)
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localConfig.behavior.glowIntensity}
              onChange={(e) => handleConfigUpdate('behavior', { glowIntensity: parseFloat(e.target.value) })}
              disabled={readOnly}
              className="w-full h-2 bg-[#1B263B] rounded-lg appearance-none cursor-pointer slider"
            />
          </label>
        </div>
      </section>

      {/* Performance */}
      <section className="space-y-4">
        <h3 className="text-lg font-light text-[#F8F8F2] border-b border-[#415A77]/20 pb-2">
          Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[#E0E1DD] text-sm mb-2 block">
              Max FPS ({localConfig.performance.maxFPS})
            </span>
            <input
              type="range"
              min="30"
              max="120"
              step="10"
              value={localConfig.performance.maxFPS}
              onChange={(e) => handleConfigUpdate('performance', { maxFPS: parseInt(e.target.value) })}
              disabled={readOnly}
              className="w-full h-2 bg-[#1B263B] rounded-lg appearance-none cursor-pointer slider"
            />
          </label>
          <label className="block">
            <span className="text-[#E0E1DD] text-sm mb-2 block">Quality Level</span>
            <select
              value={localConfig.performance.qualityLevel}
              onChange={(e) => handleConfigUpdate('performance', { qualityLevel: e.target.value })}
              disabled={readOnly}
              className="w-full px-3 py-2 bg-[#1B263B] border border-[#415A77] rounded text-[#F8F8F2] focus:ring-2 focus:ring-[#3FD3C6] focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['enableTrail', 'enableRipples', 'enableBubbles'] as const).map(key => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localConfig.performance[key]}
                onChange={(e) => handleConfigUpdate('performance', { [key]: e.target.checked })}
                disabled={readOnly}
                className="w-5 h-5 text-[#3FD3C6] bg-[#1B263B] border border-[#415A77] rounded focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-0"
              />
              <span className="text-[#E0E1DD] text-sm capitalize">
                {key.replace('enable', '').replace(/([A-Z])/g, ' $1').toLowerCase()}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Responsive Settings */}
      <section className="space-y-4">
        <h3 className="text-lg font-light text-[#F8F8F2] border-b border-[#415A77]/20 pb-2">
          Responsive
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-[#E0E1DD] text-sm mb-2 block">
              Mobile Height ({localConfig.responsive.mobileHeight}px)
            </span>
            <input
              type="number"
              min="100"
              max="400"
              value={localConfig.responsive.mobileHeight}
              onChange={(e) => handleConfigUpdate('responsive', { mobileHeight: parseInt(e.target.value) })}
              disabled={readOnly}
              className="w-full px-3 py-2 bg-[#1B263B] border border-[#415A77] rounded text-[#F8F8F2] focus:ring-2 focus:ring-[#3FD3C6] focus:border-transparent"
            />
          </label>
          <label className="block">
            <span className="text-[#E0E1DD] text-sm mb-2 block">
              Desktop Height ({localConfig.responsive.desktopHeight}px)
            </span>
            <input
              type="number"
              min="200"
              max="600"
              value={localConfig.responsive.desktopHeight}
              onChange={(e) => handleConfigUpdate('responsive', { desktopHeight: parseInt(e.target.value) })}
              disabled={readOnly}
              className="w-full px-3 py-2 bg-[#1B263B] border border-[#415A77] rounded text-[#F8F8F2] focus:ring-2 focus:ring-[#3FD3C6] focus:border-transparent"
            />
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={localConfig.responsive.disableOnMobile}
              onChange={(e) => handleConfigUpdate('responsive', { disableOnMobile: e.target.checked })}
              disabled={readOnly}
              className="w-5 h-5 text-[#3FD3C6] bg-[#1B263B] border border-[#415A77] rounded focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-0"
            />
            <span className="text-[#E0E1DD] text-sm">Disable on Mobile</span>
          </label>
        </div>
      </section>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3FD3C6;
          cursor: pointer;
          box-shadow: 0 0 2px 0 #000;
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3FD3C6;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 2px 0 #000;
        }
      `}</style>
    </div>
  )
}