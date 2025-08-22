import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Activity,
  Users,
  Server,
  BarChart3,
  Clock,
  AlertCircle
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { PerformanceChart } from '../components/charts/PerformanceChart'
import { useRealtimeData } from '../hooks/useRealtimeData'

interface ReportData {
  id: string
  name: string
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  generatedAt: Date
  fileSize: string
  status: 'ready' | 'generating' | 'failed'
  metrics: {
    totalAgents: number
    activeAgents: number
    avgResponseTime: number
    totalRequests: number
    errorRate: number
    uptime: number
  }
}

export function ReportsPage() {
  const { agents, systemMetrics, performanceHistory } = useRealtimeData()
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | 'custom'>('7d')
  const [isGenerating, setIsGenerating] = useState(false)
  const [reports, setReports] = useState<ReportData[]>([])

  useEffect(() => {
    // Load existing reports
    loadReports()
  }, [])

  const loadReports = () => {
    // Simulate loading existing reports
    const mockReports: ReportData[] = [
      {
        id: '1',
        name: 'Weekly Performance Report',
        type: 'weekly',
        generatedAt: new Date(),
        fileSize: '2.4 MB',
        status: 'ready',
        metrics: {
          totalAgents: 127,
          activeAgents: 119,
          avgResponseTime: 234,
          totalRequests: 45678,
          errorRate: 0.02,
          uptime: 99.97
        }
      },
      {
        id: '2',
        name: 'Daily Agent Status',
        type: 'daily',
        generatedAt: subDays(new Date(), 1),
        fileSize: '1.1 MB',
        status: 'ready',
        metrics: {
          totalAgents: 125,
          activeAgents: 118,
          avgResponseTime: 198,
          totalRequests: 12456,
          errorRate: 0.01,
          uptime: 99.99
        }
      }
    ]
    setReports(mockReports)
  }

  const generateReport = async () => {
    setIsGenerating(true)

    // Simulate report generation
    setTimeout(() => {
      const newReport: ReportData = {
        id: Date.now().toString(),
        name: `${selectedPeriod === '24h' ? 'Daily' : selectedPeriod === '7d' ? 'Weekly' : 'Monthly'} Report`,
        type: selectedPeriod === '24h' ? 'daily' : selectedPeriod === '7d' ? 'weekly' : 'monthly',
        generatedAt: new Date(),
        fileSize: '1.8 MB',
        status: 'ready',
        metrics: {
          totalAgents: agents.length,
          activeAgents: agents.filter(a => a.status === 'online').length,
          avgResponseTime: agents.reduce((acc, a) => acc + a.responseTime, 0) / agents.length,
          totalRequests: Math.floor(Math.random() * 50000),
          errorRate: Math.random() * 0.05,
          uptime: 99 + Math.random()
        }
      }

      setReports([newReport, ...reports])
      setIsGenerating(false)

      // Trigger download
      downloadReport(newReport)
    }, 3000)
  }

  const downloadReport = (report: ReportData) => {
    // Create report content
    const reportContent = {
      title: report.name,
      generatedAt: report.generatedAt,
      period: selectedPeriod,
      summary: {
        totalAgents: report.metrics.totalAgents,
        activeAgents: report.metrics.activeAgents,
        avgResponseTime: `${Math.round(report.metrics.avgResponseTime)}ms`,
        totalRequests: report.metrics.totalRequests.toLocaleString(),
        errorRate: `${(report.metrics.errorRate * 100).toFixed(2)}%`,
        uptime: `${report.metrics.uptime.toFixed(2)}%`
      },
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        platform: agent.platform,
        region: agent.region,
        responseTime: agent.responseTime,
        successRate: agent.successRate
      })),
      performanceData: performanceHistory
    }

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nanda-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const MetricCard = ({ icon: Icon, label, value, trend }: {
    icon: any
    label: string
    value: string | number
    trend?: number
  }) => (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="glass-card mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Agent Performance Reports</h1>
              <p className="text-muted-foreground">Generate and download comprehensive reports for your agent network</p>
            </div>
            <div className="flex gap-3 mt-4 lg:mt-0">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={generateReport}
                disabled={isGenerating}
                className="btn-primary flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Report Configuration */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Report Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Time Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Report Type</label>
              <select className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option>Performance Summary</option>
                <option>Agent Health</option>
                <option>Error Analysis</option>
                <option>Comprehensive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Format</label>
              <select className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option>JSON</option>
                <option>CSV</option>
                <option>PDF</option>
                <option>Excel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Include</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Charts</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Raw Data</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Current Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            icon={Users}
            label="Total Agents"
            value={agents.length}
            trend={5.2}
          />
          <MetricCard
            icon={Activity}
            label="Active Agents"
            value={agents.filter(a => a.status === 'online').length}
            trend={2.1}
          />
          <MetricCard
            icon={Clock}
            label="Avg Response Time"
            value={`${Math.round(agents.reduce((acc, a) => acc + a.responseTime, 0) / agents.length)}ms`}
            trend={-3.5}
          />
          <MetricCard
            icon={AlertCircle}
            label="Error Rate"
            value="0.02%"
            trend={-1.2}
          />
        </div>

        {/* Performance Chart */}
        <div className="glass-card mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Performance Trends</h2>
          <PerformanceChart data={performanceHistory} type="area" height={300} />
        </div>

        {/* Previous Reports */}
        <div className="glass-card">
          <h2 className="text-xl font-semibold text-foreground mb-4">Previous Reports</h2>
          <div className="space-y-3">
            {reports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{report.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(report.generatedAt, 'MMM dd, yyyy HH:mm')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Server className="w-3 h-3" />
                        {report.metrics.totalAgents} agents
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {report.metrics.uptime.toFixed(2)}% uptime
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{report.fileSize}</span>
                  <button
                    onClick={() => downloadReport(report)}
                    className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                    aria-label="Download report"
                  >
                    <Download className="w-4 h-4 text-primary" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
