// Force dynamic rendering and skip layout
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <html>
      <head>
        <title>404 - Page Not Found | Paintbox</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: '1rem'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎨</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              Paintbox
            </h1>
          </div>
          <h2 style={{ marginBottom: '1rem', fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', margin: '0 0 1rem 0' }}>
            404
          </h2>
          <p style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: '#4b5563', margin: '0 0 1.5rem 0' }}>
            Page not found
          </p>
          <p style={{ marginBottom: '2rem', color: '#6b7280', margin: '0 0 2rem 0' }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(to right, #dc2626, #b91c1c)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '500',
              textDecoration: 'none',
              transition: 'all 0.3s ease'
            }}
          >
            Return Home
          </a>
        </div>
      </body>
    </html>
  )
}
