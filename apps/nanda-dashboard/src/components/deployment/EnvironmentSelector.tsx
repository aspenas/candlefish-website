import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import {
  GlobeAmericasIcon,
  BeakerIcon,
  EyeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid'
import { Environment, EnvironmentType } from '../../types/deployment.types'

interface EnvironmentSelectorProps {
  environments: Environment[]
  selected: EnvironmentType
  onChange: (environment: EnvironmentType) => void
  className?: string
}

const environmentConfig = {
  production: {
    icon: GlobeAmericasIcon,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Production',
    description: 'Live production environment'
  },
  staging: {
    icon: BeakerIcon,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Staging',
    description: 'Pre-production testing'
  },
  preview: {
    icon: EyeIcon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Preview',
    description: 'Feature preview environment'
  }
}

export function EnvironmentSelector({
  environments,
  selected,
  onChange,
  className = ''
}: EnvironmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedEnv = environments.find(env => env.name === selected)
  const config = environmentConfig[selected]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleEnvironmentChange = (envType: EnvironmentType) => {
    onChange(envType)
    setIsOpen(false)
  }

  const getEnvironmentStatus = (env: Environment) => {
    // In a real app, this would come from health checks
    return env.name === 'production' ? 'healthy' : 'healthy'
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-3 bg-muted/50 hover:bg-muted/70
                   border border-border rounded-lg transition-all duration-200
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
                   min-w-[200px]"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {config && (
          <>
            <div className={`p-1.5 ${config.bgColor} rounded-md`}>
              <config.icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-foreground">{config.label}</div>
              {selectedEnv && (
                <div className="text-xs text-muted-foreground">
                  {selectedEnv.region} • {selectedEnv.replicas} replicas
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                getEnvironmentStatus(selectedEnv!) === 'healthy' ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <ChevronDownIcon
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background border border-border
                       rounded-lg shadow-lg backdrop-blur-sm z-50 overflow-hidden"
            role="listbox"
          >
            {environments.map((env) => {
              const envConfig = environmentConfig[env.name]
              const isSelected = env.name === selected
              const status = getEnvironmentStatus(env)

              return (
                <motion.button
                  key={env.name}
                  onClick={() => handleEnvironmentChange(env.name)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50
                             transition-colors duration-200 text-left
                             focus:outline-none focus:bg-muted/50"
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className={`p-1.5 ${envConfig.bgColor} rounded-md`}>
                    <envConfig.icon className={`w-4 h-4 ${envConfig.color}`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {envConfig.label}
                      </span>
                      {isSelected && (
                        <CheckCircleIcon className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {envConfig.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {env.region} • {env.replicas} replicas • {env.resources.cpu} CPU • {env.resources.memory} RAM
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <span className={`text-xs ${
                        status === 'healthy' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {env.tier}
                    </div>
                  </div>
                </motion.button>
              )
            })}

            {/* Environment Quick Actions */}
            <div className="border-t border-border p-3 bg-muted/20">
              <div className="text-xs text-muted-foreground mb-2">Quick Actions</div>
              <div className="flex gap-2">
                <button className="text-xs px-3 py-1.5 bg-primary/20 text-primary rounded-md
                                 hover:bg-primary/30 transition-colors">
                  View Logs
                </button>
                <button className="text-xs px-3 py-1.5 bg-muted/50 text-muted-foreground rounded-md
                                 hover:bg-muted/70 transition-colors">
                  Metrics
                </button>
                <button className="text-xs px-3 py-1.5 bg-muted/50 text-muted-foreground rounded-md
                                 hover:bg-muted/70 transition-colors">
                  Config
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Compact version for use in smaller spaces
export function EnvironmentBadge({
  environment,
  showStatus = true,
  onClick
}: {
  environment: EnvironmentType
  showStatus?: boolean
  onClick?: () => void
}) {
  const config = environmentConfig[environment]

  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
        ${config.bgColor} ${config.color} border border-current/20
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      `}
    >
      <config.icon className="w-3 h-3" />
      {config.label}
      {showStatus && (
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
      )}
    </Component>
  )
}
