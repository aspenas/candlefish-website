'use client'

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2v20M2 12h20"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Paintbox - Offline Mode
          </h1>
          <p className="text-gray-600">
            You're currently offline, but you can still use Paintbox for calculations and creating estimates.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Available Offline:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Create new estimates</li>
              <li>• Calculate pricing</li>
              <li>• Store photos locally</li>
              <li>• Review saved data</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Requires Connection:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Salesforce sync</li>
              <li>• Photo uploads</li>
              <li>• Customer lookup</li>
              <li>• Final estimate submission</li>
            </ul>
          </div>

          <div className="space-y-3 mt-6">
            <Button asChild className="w-full">
              <Link href="/estimate/new">
                Create New Estimate
              </Link>
            </Button>

            <Button variant="outline" className="w-full" onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}>
              Check Connection
            </Button>

            <Button variant="ghost" asChild className="w-full">
              <Link href="/">
                Return Home
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 text-xs text-gray-500">
          <p>Your data will sync automatically when you're back online.</p>
        </div>
      </div>
    </div>
  );
}
