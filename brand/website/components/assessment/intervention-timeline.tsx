import { motion } from 'framer-motion'
import type { RecommendedIntervention } from '@/types/assessment'

interface InterventionTimelineProps {
  interventions: RecommendedIntervention[]
  timeline: string
}

export const InterventionTimeline = ({ interventions, timeline }: InterventionTimelineProps) => {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return '#3FD3C6'
      case 'medium': return '#FCBF49'
      case 'low': return '#415A77'
      default: return '#415A77'
    }
  }
  
  const getEffortSize = (effort: string) => {
    switch (effort) {
      case 'high': return 'Large effort'
      case 'medium': return 'Moderate effort'
      case 'low': return 'Quick win'
      default: return 'Moderate effort'
    }
  }
  
  return (
    <div className="relative">
      {/* Timeline Header */}
      <div className="mb-8 text-center">
        <p className="text-[#415A77] text-sm uppercase tracking-wider mb-2">
          Recommended Timeline
        </p>
        <p className="text-2xl text-[#E0E1DD] font-light">
          {timeline}
        </p>
      </div>
      
      {/* Timeline Visualization */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#415A77]" />
        
        {/* Interventions */}
        <div className="space-y-8">
          {interventions.map((intervention, idx) => (
            <motion.div
              key={intervention.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative flex items-start"
            >
              {/* Timeline Node */}
              <div className="absolute left-6 w-4 h-4 rounded-full border-2 border-[#3FD3C6] bg-[#0D1B2A]" />
              
              {/* Content Card */}
              <div className="ml-16 flex-1 bg-[#1B263B] border border-[#415A77] p-6 hover:border-[#3FD3C6] transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl text-[#F8F8F2] mb-2">
                      {intervention.title}
                    </h3>
                    <p className="text-[#E0E1DD] mb-4">
                      {intervention.description}
                    </p>
                  </div>
                  
                  {/* Impact Indicator */}
                  <div 
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: `${getImpactColor(intervention.impact)}20`,
                      color: getImpactColor(intervention.impact)
                    }}
                  >
                    {intervention.impact.toUpperCase()} IMPACT
                  </div>
                </div>
                
                {/* Metadata */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[#415A77]">Timeline:</span>
                    <span className="text-[#3FD3C6]">{intervention.timeline}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[#415A77]">Effort:</span>
                    <span className="text-[#E0E1DD]">{getEffortSize(intervention.effort)}</span>
                  </div>
                </div>
                
                {/* Dependencies */}
                {intervention.dependencies.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#415A77]">
                    <p className="text-xs text-[#415A77] mb-2">
                      Depends on:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {intervention.dependencies.map(dep => (
                        <span
                          key={dep}
                          className="px-2 py-1 bg-[#0D1B2A] text-[#3FD3C6] text-xs rounded"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Impact/Effort Matrix */}
      <div className="mt-16 p-8 bg-[#1C1C1C] rounded">
        <h3 className="text-xl text-[#F8F8F2] mb-6">
          Impact vs Effort Analysis
        </h3>
        
        <div className="relative h-64 border-l-2 border-b-2 border-[#415A77]">
          {/* Axes Labels */}
          <span className="absolute -left-8 top-0 text-xs text-[#415A77] -rotate-90 origin-left">
            Impact →
          </span>
          <span className="absolute bottom-0 right-0 text-xs text-[#415A77]">
            Effort →
          </span>
          
          {/* Quadrant Labels */}
          <div className="absolute top-4 left-4 text-xs text-[#3FD3C6]">
            Quick Wins
          </div>
          <div className="absolute top-4 right-4 text-xs text-[#FCBF49]">
            Major Projects
          </div>
          <div className="absolute bottom-4 left-4 text-xs text-[#415A77]">
            Fill-ins
          </div>
          <div className="absolute bottom-4 right-4 text-xs text-[#E84855]">
            Question Marks
          </div>
          
          {/* Plot Interventions */}
          {interventions.map((intervention, idx) => {
            const impactValue = intervention.impact === 'high' ? 80 : intervention.impact === 'medium' ? 50 : 20
            const effortValue = intervention.effort === 'high' ? 80 : intervention.effort === 'medium' ? 50 : 20
            
            return (
              <motion.div
                key={intervention.id}
                className="absolute w-3 h-3 rounded-full bg-[#3FD3C6]"
                style={{
                  bottom: `${impactValue}%`,
                  left: `${effortValue}%`,
                  transform: 'translate(-50%, 50%)'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                title={intervention.title}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}