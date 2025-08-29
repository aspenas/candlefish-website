'use client'

interface Service {
  name: string
  status: 'running' | 'stopped' | 'unhealthy'
  port: number
  group: string
}

export function PortAllocationMap({ services }: { services: Service[] }) {
  const portRanges = [
    { name: 'Candlefish Frontend', range: '3000-3099', color: 'bg-blue-500' },
    { name: 'Security Dashboard', range: '3100-3199', color: 'bg-purple-500' },
    { name: 'PKB Services', range: '3200-3299', color: 'bg-green-500' },
    { name: 'Candlefish APIs', range: '4000-4099', color: 'bg-indigo-500' },
    { name: 'Security APIs', range: '4100-4199', color: 'bg-pink-500' },
    { name: 'PostgreSQL', range: '5432-5439', color: 'bg-cyan-500' },
    { name: 'Redis', range: '6379-6389', color: 'bg-red-500' },
  ]

  const getPortStatus = (port: number) => {
    const service = services.find(s => s.port === port)
    if (!service) return null
    return service
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="space-y-6">
        {portRanges.map((range) => {
          const [start, end] = range.range.split('-').map(Number)
          const ports = []
          for (let i = start; i <= end && i < start + 10; i++) {
            ports.push(i)
          }

          return (
            <div key={range.name}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  {range.name}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {range.range}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {ports.map((port) => {
                  const service = getPortStatus(port)
                  const isActive = service && service.status === 'running'
                  const isAllocated = service !== null

                  return (
                    <div
                      key={port}
                      className={`
                        w-12 h-8 rounded text-xs flex items-center justify-center
                        ${
                          isActive
                            ? `${range.color} text-white`
                            : isAllocated
                            ? 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                        }
                      `}
                      title={service ? `${service.name} (${service.status})` : `Port ${port}`}
                    >
                      {port === start ? port : port % 10}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-slate-600 dark:text-slate-400">Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-slate-300 dark:bg-slate-600 rounded"></div>
          <span className="text-slate-600 dark:text-slate-400">Allocated</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-slate-100 dark:bg-slate-700 rounded"></div>
          <span className="text-slate-600 dark:text-slate-400">Available</span>
        </div>
      </div>
    </div>
  )
}