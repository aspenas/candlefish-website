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
          }}>Candlefish AI Partners</h1>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <a href="/apply" style={{ color: '#94a3b8', textDecoration: 'none' }}>Apply</a>
            <a href="/portal" style={{ color: '#94a3b8', textDecoration: 'none' }}>Partner Portal</a>
            <a href="/resources" style={{ color: '#94a3b8', textDecoration: 'none' }}>Resources</a>
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
            Partner{' '}
            <span style={{ color: '#14b8a6' }}>Ecosystem</span>
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#a3b3bf',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Join our growing network of technology partners and solution providers
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
            <h3 style={{ color: '#14b8a6', marginBottom: '0.75rem', fontSize: '1.25rem' }}>Technology Partners</h3>
            <p style={{ color: '#a3b3bf', lineHeight: '1.5' }}>
              Integrate your solutions with Candlefish AI platform and infrastructure
            </p>
          </div>

          <div style={{
            padding: '2rem',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(20, 184, 166, 0.2)',
            borderRadius: '0.75rem'
          }}>
            <h3 style={{ color: '#22d3ee', marginBottom: '0.75rem', fontSize: '1.25rem' }}>Solution Providers</h3>
            <p style={{ color: '#a3b3bf', lineHeight: '1.5' }}>
              Deliver AI-powered solutions to your customers using our platform
            </p>
          </div>

          <div style={{
            padding: '2rem',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(20, 184, 166, 0.2)',
            borderRadius: '0.75rem'
          }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '0.75rem', fontSize: '1.25rem' }}>Channel Partners</h3>
            <p style={{ color: '#a3b3bf', lineHeight: '1.5' }}>
              Expand your portfolio with world-class AI infrastructure and services
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
            Become a Partner →
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
        <p>© 2025 Candlefish AI Partners</p>
      </footer>
    </div>
  )
}
