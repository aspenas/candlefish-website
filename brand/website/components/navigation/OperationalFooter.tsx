'use client'

import React from 'react'

// Real operational status
const getCurrentFocus = () => {
  return 'Engraving Automation Platform'
}

const getQueueStatus = () => {
  return '47 organizations in queue · 3 slots Q1 2026'
}

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#1B263B] mt-32">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div>
            <p className="text-[#415A77] text-sm font-light">
              Operational Design Atelier
            </p>
            <p className="text-[#415A77] text-sm mt-1 font-light">
              Est. 2025 · Building systems that outlive their creators
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-[#415A77] text-sm font-light">
              Current Focus: {getCurrentFocus()}
            </p>
            <p className="text-[#415A77] text-sm mt-1 font-light">
              {getQueueStatus()}
            </p>
          </div>
        </div>
        
        {/* Minimal copyright line */}
        <div className="mt-8 pt-8 border-t border-[#1B263B]/30">
          <p className="text-[#415A77] text-xs text-center">
            © 2025 Candlefish. Operational systems for impossible problems.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer