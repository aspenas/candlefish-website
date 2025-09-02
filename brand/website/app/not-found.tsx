import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl mb-8">Page Not Found</h2>
        <p className="text-[#888] mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link 
          href="/" 
          className="inline-block px-6 py-3 border border-[#3FD3C6] text-[#3FD3C6] hover:bg-[#3FD3C6] hover:text-[#0a0a0a] transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}