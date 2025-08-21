'use client';

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// Navigation for the transcendent experience
function SpatialNavigation() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const navItems = [
    { href: '/', label: 'Entry Portal', icon: '◎', description: 'Return to the beginning' },
    { href: '/workshop', label: 'Workshop', icon: '◈', description: 'Live operations center' },
    { href: '/instruments', label: 'Instruments', icon: '◇', description: 'Operational tools' },
    { href: '/queue', label: 'Queue', icon: '◆', description: 'Workshop access queue' },
    { href: '/manifesto', label: 'Manifesto', icon: '◐', description: 'Craft philosophy' },
  ]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.8, ease: 'easeOutCubic' }}
          className="fixed left-6 top-1/2 -translate-y-1/2 z-modal pointer-events-auto"
        >
          <div className="space-y-4">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href

              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                  className="relative group"
                >
                  <Link
                    href={item.href}
                    data-cursor={item.label.toLowerCase()}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg backdrop-blur-md transition-all duration-300 hover-lift ${
                      isActive
                        ? 'bg-copper/20 border border-copper/60 text-copper'
                        : 'bg-graphite/20 border border-living-cyan/20 text-pearl hover:border-living-cyan/40 hover:bg-graphite/40'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-interface-sm font-medium">{item.label}</span>
                  </Link>

                  {/* Tooltip */}
                  <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="bg-graphite/90 text-pearl text-interface-sm px-3 py-2 rounded border border-living-cyan/20 whitespace-nowrap">
                      {item.description}
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {/* Navigation Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-6 pt-6 border-t border-living-cyan/20"
            >
              <div className="text-center">
                <div className="text-code-sm text-pearl/40 mb-1">Navigation</div>
                <div className="text-code-sm text-living-cyan">{navItems.length} spaces</div>
              </div>
            </motion.div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}

// System Status Indicator - Fixed hydration issues
function SystemStatus() {
  const [isClient, setIsClient] = useState(false);
  const [metrics, setMetrics] = useState({
    operational: true,
    visitors: 247,
    latency: 12,
  })

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        operational: true,
        visitors: prev.visitors + Math.floor((Math.random() - 0.5) * 5),
        latency: Math.max(8, prev.latency + Math.floor((Math.random() - 0.5) * 4)),
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [isClient])

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.8 }}
      className="fixed bottom-6 right-6 z-modal pointer-events-auto"
    >
      <div className="bg-graphite/90 backdrop-blur-md border border-living-cyan/20 rounded-lg p-4">
        <div className="flex items-center space-x-4 text-code-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-living-cyan rounded-full animate-pulse-glow"></div>
            <span className="text-pearl/70">System</span>
          </div>
          <div className="text-pearl/60">•</div>
          {/* Only render dynamic values after client hydration */}
          <div className="text-living-cyan">
            {isClient ? metrics.visitors : 247} active
          </div>
          <div className="text-pearl/60">•</div>
          <div className="text-pearl/70">
            {isClient ? metrics.latency : 12}ms
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function SpatialLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Spatial Navigation System */}
      <SpatialNavigation />

      {/* System Status */}
      <SystemStatus />

      {/* Main Content with 3D Transform Context */}
      <main className="relative min-h-screen transform-style-3d">
        {children}
      </main>
    </>
  )
}
