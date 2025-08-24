import { Metadata } from 'next'
import { WifiOff, RefreshCw, Home, FileText, Users } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Offline',
  description: 'You are currently offline. Some features are available without an internet connection.',
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Offline icon and status */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-4">
            <WifiOff className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're Offline
          </h1>
          <p className="text-gray-600">
            No internet connection detected. Some features are still available.
          </p>
        </div>

        {/* Available offline features */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Available Offline
          </h2>
          
          <div className="space-y-3">
            <OfflineFeature
              icon={<Users className="w-4 h-4" />}
              title="Cached Operator Network"
              description="View previously loaded operator information"
              href="/network"
            />
            <OfflineFeature
              icon={<FileText className="w-4 h-4" />}
              title="Implementation Guides"
              description="Access downloaded implementation documentation"
              href="/guides"
            />
            <OfflineFeature
              icon={<Home className="w-4 h-4" />}
              title="Partner Directory"
              description="Browse cached partner information"
              href="/"
            />
          </div>
        </div>

        {/* Retry connection */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-green-600" />
            Retry Connection
          </h2>
          
          <p className="text-sm text-gray-600 mb-4">
            Check your internet connection and try refreshing the page.
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Now
          </button>
        </div>

        {/* Offline tips */}
        <div className="mt-6 text-center">
          <details className="text-left">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Offline Tips for Field Operators
            </summary>
            <div className="mt-3 text-xs text-gray-600 space-y-2 bg-gray-50 p-3 rounded">
              <p>
                • <strong>Data Sync:</strong> Your work will sync automatically when reconnected
              </p>
              <p>
                • <strong>Critical Info:</strong> Implementation guides remain accessible offline
              </p>
              <p>
                • <strong>Updates:</strong> Partner status updates will resume when online
              </p>
              <p>
                • <strong>Storage:</strong> App data is stored locally for offline access
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

interface OfflineFeatureProps {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}

function OfflineFeature({ icon, title, description, href }: OfflineFeatureProps) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-600 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
          {title}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {description}
        </p>
      </div>
    </Link>
  )
}