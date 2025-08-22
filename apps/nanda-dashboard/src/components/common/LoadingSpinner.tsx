import React from 'react';
import { motion } from 'framer-motion';
import { CpuChipIcon } from '@heroicons/react/24/outline';

interface Props {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<Props> = ({
  message = 'Loading agents...',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const containerSizeClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerSizeClasses[size]} ${className}`}>
      {/* Animated Icon */}
      <motion.div
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{
          rotate: { duration: 2, repeat: Infinity, ease: "linear" },
          scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }}
        className={`${sizeClasses[size]} text-blue-400`}
      >
        <CpuChipIcon />
      </motion.div>

      {/* Animated Dots */}
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut"
            }}
            className="w-2 h-2 bg-blue-400 rounded-full"
          />
        ))}
      </div>

      {/* Message */}
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-slate-300 text-sm text-center max-w-xs"
        >
          {message}
        </motion.p>
      )}

      {/* Agent Network Simulation */}
      <div className="relative w-24 h-16 mt-2">
        {[0, 1, 2, 3].map((index) => {
          const positions = [
            { x: 0, y: 0 },
            { x: 16, y: 8 },
            { x: 8, y: 16 },
            { x: 20, y: 4 }
          ];

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.5, 1, 0.5],
                x: positions[index].x,
                y: positions[index].y
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.3,
                ease: "easeInOut"
              }}
              className="absolute w-2 h-2 bg-green-400 rounded-full"
            />
          );
        })}

        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full">
          <motion.line
            x1="2" y1="2" x2="18" y2="10"
            stroke="rgba(34, 197, 94, 0.3)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.line
            x1="18" y1="10" x2="10" y2="18"
            stroke="rgba(34, 197, 94, 0.3)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          />
        </svg>
      </div>
    </div>
  );
};

export default LoadingSpinner;
