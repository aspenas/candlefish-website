'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationNode {
  path: string;
  label: string;
  isActive?: boolean;
  depth: number;
  coordinates: { x: number; y: number };
}

const navigationNodes: NavigationNode[] = [
  { path: '/', label: 'Entry', depth: 0, coordinates: { x: 0, y: 0 } },
  { path: '/workshop', label: 'Workshop', depth: 1, coordinates: { x: -1, y: 1 } },
  { path: '/instruments', label: 'Instruments', depth: 1, coordinates: { x: 1, y: 1 } },
  { path: '/manifesto', label: 'Manifesto', depth: 2, coordinates: { x: 0, y: 2 } },
  { path: '/queue', label: 'Queue', depth: 1, coordinates: { x: -1, y: -1 } },
  { path: '/archive', label: 'Archive', depth: 3, coordinates: { x: 0, y: 3 } },
];

export function SpatialNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleNodeClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="fixed top-6 right-6 z-50">
      {/* Navigation Activator */}
      <motion.div
        className="relative"
        onHoverStart={() => setIsExpanded(true)}
        onHoverEnd={() => setIsExpanded(false)}
      >
        {/* Core Node */}
        <motion.div
          className="w-12 h-12 bg-graphite border border-copper/30 rounded-full flex items-center justify-center cursor-pointer backdrop-blur-workshop"
          whileHover={{ scale: 1.1 }}
          animate={{
            boxShadow: isExpanded
              ? '0 0 30px rgba(184, 115, 51, 0.4)'
              : '0 0 10px rgba(184, 115, 51, 0.2)'
          }}
        >
          <div className="w-2 h-2 bg-copper rounded-full animate-pulse-slow" />
        </motion.div>

        {/* Spatial Network */}
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: isExpanded ? 1 : 0,
            scale: isExpanded ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {navigationNodes.map((node, index) => {
            const isCurrentPath = pathname === node.path;
            const x = node.coordinates.x * 80;
            const y = node.coordinates.y * 60;

            return (
              <motion.div
                key={node.path}
                className="absolute"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: isExpanded ? 1 : 0,
                  scale: isExpanded ? 1 : 0
                }}
                transition={{
                  delay: index * 0.05,
                  duration: 0.2
                }}
              >
                <motion.button
                  className={`
                    relative px-4 py-2 rounded-full text-xs font-mono backdrop-blur-workshop
                    ${isCurrentPath
                      ? 'bg-copper/20 text-copper border border-copper/50'
                      : 'bg-graphite/80 text-pearl/70 border border-pearl/20 hover:border-copper/50'
                    }
                    transition-all duration-300
                  `}
                  onClick={() => handleNodeClick(node.path)}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: '0 0 20px rgba(184, 115, 51, 0.3)'
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {node.label}

                  {/* Depth Indicator */}
                  <div
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2"
                    style={{
                      width: `${2 + node.depth * 2}px`,
                      height: '1px',
                      background: `rgba(184, 115, 51, ${0.3 + node.depth * 0.2})`,
                    }}
                  />
                </motion.button>

                {/* Connection Lines */}
                {node.depth > 0 && (
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      width: `${Math.abs(x) + 50}px`,
                      height: `${Math.abs(y) + 50}px`,
                      left: x > 0 ? '-50px' : `${x}px`,
                      top: y > 0 ? '-50px' : `${y}px`,
                    }}
                  >
                    <line
                      x1={x > 0 ? 50 : Math.abs(x)}
                      y1={y > 0 ? 50 : Math.abs(y)}
                      x2={x > 0 ? Math.abs(x) : 50}
                      y2={y > 0 ? Math.abs(y) : 50}
                      stroke="rgba(184, 115, 51, 0.2)"
                      strokeWidth="1"
                      className="animate-pulse-slow"
                    />
                  </svg>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Operational Status */}
      <motion.div
        className="mt-4 text-right"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="text-xs font-mono text-pearl/40">
          operational
        </div>
        <div className="w-8 h-px bg-copper/30 ml-auto animate-glow" />
      </motion.div>
    </div>
  );
}
