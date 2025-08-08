import Link from 'next/link'
import PaintboxLogo from '@/components/ui/PaintboxLogo'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <PaintboxLogo size="large" showText className="flex flex-col items-center space-y-3" />
        </div>
        <h2 className="mb-4 text-4xl font-bold text-gray-900">
          404
        </h2>
        <p className="mb-6 text-xl text-gray-600">
          Page not found
        </p>
        <p className="mb-8 text-gray-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}
