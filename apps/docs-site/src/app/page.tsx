'use client'

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(circle at 20% 80%, rgba(20, 184, 166, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(168, 85, 247, 0.08) 0%, transparent 50%),
        linear-gradient(135deg, #020617 0%, #0f172a 25%, #1e293b 100%)
      `,
      color: '#f8fafc',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: `
          linear-gradient(rgba(20, 184, 166, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(20, 184, 166, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
        animation: 'gridMove 20s linear infinite',
        zIndex: 0
      }} />

      <style jsx>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(64px, 64px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(20, 184, 166, 0.3); }
          50% { box-shadow: 0 0 40px rgba(20, 184, 166, 0.6); }
        }
        @keyframes slideInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Navigation with glassmorphism */}
      <nav style={{
        padding: '1.5rem 2rem',
        borderBottom: '1px solid rgba(20, 184, 166, 0.1)',
        background: 'rgba(2, 6, 23, 0.8)',
        backdropFilter: 'blur(20px) saturate(180%)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontSize: '1.625rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #14b8a6 0%, #22d3ee 50%, #a855f7 100%)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'shimmer 3s ease-in-out infinite',
            letterSpacing: '-0.025em'
          }}>Candlefish Documentation</h1>
          <div style={{
            display: 'flex',
            gap: '2.5rem',
            alignItems: 'center'
          }}>
            {['Documentation', 'API', 'Partners'].map((item, i) => (
              <a key={item} href={`/${item.toLowerCase()}`} style={{
                color: '#cbd5e1',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                background: 'transparent'
              }}
              onMouseOver={(e) => {
                e.target.style.color = '#14b8a6';
                e.target.style.background = 'rgba(20, 184, 166, 0.1)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.color = '#cbd5e1';
                e.target.style.background = 'transparent';
                e.target.style.transform = 'translateY(0)';
              }}
              >{item}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content with enhanced animations */}
      <main style={{
        padding: '6rem 2rem',
        maxWidth: '1400px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Hero section with floating elements */}
        <section style={{
          textAlign: 'center',
          marginBottom: '8rem',
          animation: 'slideInUp 1s ease-out'
        }}>
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1.5rem',
            background: 'rgba(20, 184, 166, 0.1)',
            border: '1px solid rgba(20, 184, 166, 0.2)',
            borderRadius: '50px',
            marginBottom: '2rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#14b8a6'
          }}>
            ✨ Now with GraphQL Federation 2.0
          </div>

          <h2 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: '800',
            marginBottom: '2rem',
            lineHeight: '1.1',
            letterSpacing: '-0.03em',
            animation: 'float 6s ease-in-out infinite'
          }}>
            Build with{' '}
            <span style={{
              background: 'linear-gradient(135deg, #14b8a6 0%, #22d3ee 25%, #a855f7 50%, #f59e0b 100%)',
              backgroundSize: '400% 400%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 4s ease-in-out infinite',
              position: 'relative'
            }}>
              Operational Craft
            </span>
          </h2>

          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.375rem)',
            color: '#94a3b8',
            maxWidth: '800px',
            margin: '0 auto 3rem',
            lineHeight: '1.7',
            fontWeight: '400'
          }}>
            World-class infrastructure and developer experience for building AI-powered applications at enterprise scale with zero-config deployment
          </p>

          {/* CTA buttons with advanced hover effects */}
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button style={{
              padding: '1.25rem 2.5rem',
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              color: 'white',
              fontWeight: '600',
              borderRadius: '12px',
              border: 'none',
              fontSize: '1.125rem',
              cursor: 'pointer',
              boxShadow: '0 20px 40px rgba(20, 184, 166, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px) scale(1.02)';
              e.target.style.boxShadow = '0 25px 50px rgba(20, 184, 166, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 20px 40px rgba(20, 184, 166, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            }}
            >
              Get Started →
            </button>

            <button style={{
              padding: '1.25rem 2.5rem',
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#e2e8f0',
              fontWeight: '600',
              borderRadius: '12px',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              fontSize: '1.125rem',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(20, 184, 166, 0.1)';
              e.target.style.borderColor = '#14b8a6';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(15, 23, 42, 0.8)';
              e.target.style.borderColor = 'rgba(20, 184, 166, 0.3)';
              e.target.style.transform = 'translateY(0)';
            }}
            >
              View Docs
            </button>
          </div>
        </section>

        {/* Enhanced feature grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '2rem',
          marginBottom: '6rem'
        }}>
          {[
            {
              icon: '🚀',
              title: 'Enterprise Ready',
              color: '#14b8a6',
              description: 'Production-grade infrastructure with 99.99% uptime SLA, enterprise security, and SOC 2 compliance'
            },
            {
              icon: '⚡',
              title: 'GraphQL Federation',
              color: '#22d3ee',
              description: 'Distributed architecture with real-time subscriptions, automatic schema stitching, and code generation'
            },
            {
              icon: '✨',
              title: 'Zero Config Deploy',
              color: '#f59e0b',
              description: 'Deploy globally in seconds with automatic CDN, edge functions, and intelligent caching'
            }
          ].map((feature, i) => (
            <div key={i} style={{
              padding: '2.5rem',
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid rgba(20, 184, 166, 0.15)',
              borderRadius: '16px',
              backdropFilter: 'blur(20px) saturate(180%)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              animation: `slideInUp 0.6s ease-out ${i * 0.1}s both`
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
              e.currentTarget.style.borderColor = feature.color;
              e.currentTarget.style.boxShadow = `0 25px 50px rgba(20, 184, 166, 0.2), 0 0 0 1px ${feature.color}33`;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.15)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              {/* Gradient overlay on hover */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(135deg, ${feature.color}08 0%, transparent 100%)`,
                opacity: 0,
                transition: 'opacity 0.4s ease'
              }} />

              <div style={{
                width: '56px',
                height: '56px',
                background: `linear-gradient(135deg, ${feature.color}20 0%, ${feature.color}40 100%)`,
                borderRadius: '16px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                border: `1px solid ${feature.color}30`,
                animation: 'float 4s ease-in-out infinite'
              }}>{feature.icon}</div>

              <h3 style={{
                color: feature.color,
                marginBottom: '1rem',
                fontSize: '1.375rem',
                fontWeight: '700',
                letterSpacing: '-0.025em'
              }}>{feature.title}</h3>

              <p style={{
                color: '#94a3b8',
                lineHeight: '1.6',
                fontSize: '1rem'
              }}>{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Stats section with animated counters */}
        <section style={{
          textAlign: 'center',
          padding: '4rem 0',
          borderTop: '1px solid rgba(20, 184, 166, 0.1)',
          borderBottom: '1px solid rgba(20, 184, 166, 0.1)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {[
              { number: '99.99%', label: 'Uptime SLA' },
              { number: '<100ms', label: 'API Response' },
              { number: '50+', label: 'Integrations' },
              { number: '24/7', label: 'Support' }
            ].map((stat, i) => (
              <div key={i} style={{
                animation: `slideInUp 0.8s ease-out ${i * 0.1}s both`
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: '800',
                  color: '#14b8a6',
                  marginBottom: '0.5rem',
                  letterSpacing: '-0.05em'
                }}>{stat.number}</div>
                <div style={{
                  color: '#94a3b8',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Enhanced footer */}
      <footer style={{
        borderTop: '1px solid rgba(20, 184, 166, 0.1)',
        marginTop: '8rem',
        padding: '3rem 2rem',
        textAlign: 'center',
        background: 'rgba(2, 6, 23, 0.5)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <p style={{
            color: '#64748b',
            fontSize: '0.95rem',
            marginBottom: '1rem'
          }}>© 2025 Candlefish AI · Building systems that outlive their creators</p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            {['Privacy', 'Terms', 'Security', 'Status'].map((item) => (
              <a key={item} href={`/${item.toLowerCase()}`} style={{
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.color = '#14b8a6'}
              onMouseOut={(e) => e.target.style.color = '#94a3b8'}
              >{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
