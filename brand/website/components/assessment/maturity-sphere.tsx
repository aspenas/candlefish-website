'use client';

import { motion } from 'framer-motion';

interface MaturitySphereProps {
  score: number;
  className?: string;
}

// Placeholder component - will be enhanced with Three.js later
export default function MaturitySphere({ score, className = '' }: MaturitySphereProps) {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className={`relative ${className}`}>
      <svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx="150"
          cy="150"
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-gray-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx="150"
          cy="150"
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="text-cyan-400"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
      </svg>
      
      {/* Center score display */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center"
        >
          <div className="text-5xl font-bold text-cyan-400">{score}</div>
          <div className="text-sm text-gray-400 uppercase tracking-wider">Maturity Score</div>
        </motion.div>
      </div>
    </div>
  );
}