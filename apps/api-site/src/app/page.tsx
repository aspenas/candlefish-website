'use client'

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0b0f13 0%, #0f172a 100%)',
      color: '#e6f9f6',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <nav style={{
        padding: '1.5rem 2rem',
        borderBottom: '1px solid rgba(20, 184, 166, 0.1)',
        background: 'rgba(11, 15, 19, 0.8)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#14b8a6'
          }}>Candlefish AI API</h1>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <a href="/docs" style={{ color: '#94a3b8', textDecoration: 'none' }}>Documentation</a>
            <a href="/playground" style={{ color: '#94a3b8', textDecoration: 'none' }}>GraphQL Playground</a>
            <a href="/rest" style={{ color: '#94a3b8', textDecoration: 'none' }}>REST API</a>
          </div>
        </div>
      </nav>

      <main style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <section style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '3.5rem',
            fontWeight: 'bold',
            marginBottom: '1.5rem',
            lineHeight: '1.2'
          }}>
            API{' '}
            <span style={{ color: '#14b8a6' }}>Explorer</span>
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#a3b3bf',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Interactive API documentation and testing environment for Candlefish AI services
          </p>
        </section>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '4rem'
        }}>
          <div style={{
            padding: '2rem',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(20, 184, 166, 0.2)',
            borderRadius: '0.75rem'
          }}>
            <h3 style={{ color: '#14b8a6', marginBottom: '0.75rem', fontSize: '1.25rem' }}>GraphQL API</h3>
            <p style={{ color: '#a3b3bf', lineHeight: '1.5' }}>
              Explore our GraphQL schema with real-time introspection and testing
            </p>
          </div>

          <div style={{
            padding: '2rem',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(20, 184, 166, 0.2)',
            borderRadius: '0.75rem'
          }}>
            <h3 style={{ color: '#22d3ee', marginBottom: '0.75rem', fontSize: '1.25rem' }}>REST Endpoints</h3>
            <p style={{ color: '#a3b3bf', lineHeight: '1.5' }}>
              Traditional REST API endpoints with comprehensive documentation
            </p>
          </div>

          <div style={{
            padding: '2rem',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(20, 184, 166, 0.2)',
            borderRadius: '0.75rem'
          }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '0.75rem', fontSize: '1.25rem' }}>Authentication</h3>
            <p style={{ color: '#a3b3bf', lineHeight: '1.5' }}>
              JWT-based authentication with API key management
            </p>
          </div>
        </div>

        <section style={{ textAlign: 'center' }}>
          <button style={{
            padding: '1rem 2.5rem',
            background: '#14b8a6',
            color: 'white',
            fontWeight: '600',
            borderRadius: '0.5rem',
            border: 'none',
            fontSize: '1.125rem',
            cursor: 'pointer'
          }}>
            Try API →
          </button>
        </section>
      </main>

      <footer style={{
        borderTop: '1px solid rgba(20, 184, 166, 0.2)',
        marginTop: '8rem',
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b'
      }}>
        <p>© 2025 Candlefish AI API</p>
      </footer>
    </div>
  )
}
