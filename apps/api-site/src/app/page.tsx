'use client'

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 50% 10%, rgba(14, 165, 233, 0.06) 0%, transparent 40%),
        linear-gradient(180deg, #020617 0%, #0c0a15 30%, #0f172a 100%)
      `,
      color: '#f1f5f9',
      fontFamily: '"SF Pro Display", "Inter", system-ui, -apple-system, sans-serif',
      position: 'relative'
    }}>
      {/* Animated mesh background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          linear-gradient(90deg, rgba(20, 184, 166, 0.02) 50%, transparent 50%),
          linear-gradient(rgba(20, 184, 166, 0.02) 50%, transparent 50%)
        `,
        backgroundSize: '100px 100px',
        animation: 'meshMove 30s linear infinite',
        zIndex: 0
      }} />

      <style jsx>{`
        @keyframes meshMove {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(50px, 50px) rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .feature-card {
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.1), transparent);
          transition: left 0.5s ease;
        }
        .feature-card:hover::before {
          left: 100%;
        }
      `}</style>

      {/* Premium navigation */}
      <nav style={{
        padding: '1.5rem 2rem',
        borderBottom: '1px solid rgba(30, 41, 59, 0.4)',
        background: 'rgba(2, 6, 23, 0.95)',
        backdropFilter: 'blur(24px) saturate(200%)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)'
            }}>
              <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: 'bold' }}>C</span>
            </div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #14b8a6 0%, #6366f1 50%, #a855f7 100%)',
              backgroundSize: '300% 300%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 4s ease-in-out infinite',
              letterSpacing: '-0.02em'
            }}>Candlefish API</h1>
          </div>

          <div style={{
            display: 'flex',
            gap: '2rem',
            alignItems: 'center'
          }}>
            {[
              { name: 'Playground', color: '#6366f1' },
              { name: 'Documentation', color: '#14b8a6' },
              { name: 'SDKs', color: '#a855f7' }
            ].map((item, i) => (
              <a key={item.name} href={`/${item.name.toLowerCase()}`} style={{
                color: '#cbd5e1',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                background: 'transparent',
                border: '1px solid transparent'
              }}
              onMouseOver={(e) => {
                e.target.style.color = item.color;
                e.target.style.background = `${item.color}10`;
                e.target.style.borderColor = `${item.color}30`;
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.color = '#cbd5e1';
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'transparent';
                e.target.style.transform = 'translateY(0)';
              }}
              >{item.name}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero section with Stripe-style layout */}
      <main style={{
        padding: '0',
        position: 'relative',
        zIndex: 10
      }}>
        <section style={{
          padding: '8rem 2rem 6rem',
          textAlign: 'center',
          maxWidth: '1400px',
          margin: '0 auto',
          animation: 'fadeInUp 1s ease-out'
        }}>
          {/* Status badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.25rem',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '50px',
            marginBottom: '2.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#22c55e'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              background: '#22c55e',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
            API Status: All systems operational
          </div>

          <h2 style={{
            fontSize: 'clamp(3rem, 8vw, 5rem)',
            fontWeight: '800',
            marginBottom: '2rem',
            lineHeight: '1.1',
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            The API that{' '}
            <span style={{
              background: 'linear-gradient(135deg, #14b8a6 0%, #6366f1 25%, #a855f7 50%, #ec4899 100%)',
              backgroundSize: '400% 400%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 6s ease-in-out infinite'
            }}>
              scales with you
            </span>
          </h2>

          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
            color: '#94a3b8',
            maxWidth: '700px',
            margin: '0 auto 3rem',
            lineHeight: '1.6',
            fontWeight: '400'
          }}>
            GraphQL Federation, real-time subscriptions, and enterprise-grade security.
            Build faster with our comprehensive API platform.
          </p>

          {/* Interactive code preview */}
          <div style={{
            maxWidth: '600px',
            margin: '0 auto 3rem',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(30, 41, 59, 0.5)',
            borderRadius: '16px',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
            animation: 'slideInLeft 0.8s ease-out 0.3s both'
          }}>
            {/* Code window header */}
            <div style={{
              padding: '1rem 1.5rem',
              background: 'rgba(30, 41, 59, 0.4)',
              borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                <div style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%' }} />
                <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }} />
              </div>
              <span style={{ color: '#64748b', fontSize: '0.875rem', marginLeft: '1rem' }}>GraphQL Query</span>
            </div>

            {/* Code content */}
            <div style={{
              padding: '1.5rem',
              fontFamily: '"SF Mono", "Monaco", Consolas, monospace',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              textAlign: 'left'
            }}>
              <div style={{ color: '#64748b' }}>query GetUser {`{`}</div>
              <div style={{ color: '#14b8a6', marginLeft: '1rem' }}>  user(id: "123") {`{`}</div>
              <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>    name</div>
              <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>    email</div>
              <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>    profile {`{`}</div>
              <div style={{ color: '#a855f7', marginLeft: '3rem' }}>      avatar</div>
              <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>{`    }`}</div>
              <div style={{ color: '#14b8a6', marginLeft: '1rem' }}>{`  }`}</div>
              <div style={{ color: '#64748b' }}>{`}`}</div>
            </div>
          </div>

          {/* CTA buttons */}
          <div style={{
            display: 'flex',
            gap: '1.25rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button style={{
              padding: '1rem 2.5rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              fontWeight: '600',
              borderRadius: '12px',
              border: 'none',
              fontSize: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 20px 40px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px) scale(1.02)';
              e.target.style.boxShadow = '0 25px 50px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 20px 40px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            }}
            >
              Try GraphQL Playground
            </button>

            <button style={{
              padding: '1rem 2.5rem',
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#e2e8f0',
              fontWeight: '600',
              borderRadius: '12px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(99, 102, 241, 0.1)';
              e.target.style.borderColor = '#6366f1';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(15, 23, 42, 0.8)';
              e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)';
              e.target.style.transform = 'translateY(0)';
            }}
            >
              View Documentation
            </button>
          </div>
        </section>

        {/* Features section with Stripe-style cards */}
        <section style={{
          padding: '6rem 2rem',
          background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.3) 100%)',
          borderTop: '1px solid rgba(30, 41, 59, 0.3)'
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '4rem'
            }}>
              <h3 style={{
                fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                fontWeight: '700',
                color: '#f1f5f9',
                marginBottom: '1rem',
                letterSpacing: '-0.02em'
              }}>Built for developers</h3>
              <p style={{
                fontSize: '1.125rem',
                color: '#94a3b8',
                maxWidth: '600px',
                margin: '0 auto'
              }}>Everything you need to build production-ready applications</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '2rem'
            }}>
              {[
                {
                  icon: '🚀',
                  title: 'GraphQL Federation',
                  description: 'Distributed schema with automatic gateway routing, real-time subscriptions, and type-safe code generation',
                  color: '#6366f1',
                  features: ['Schema stitching', 'Real-time subscriptions', 'Type generation']
                },
                {
                  icon: '🔒',
                  title: 'Enterprise Security',
                  description: 'JWT authentication, role-based access control, rate limiting, and comprehensive audit logging',
                  color: '#14b8a6',
                  features: ['JWT authentication', 'RBAC', 'Rate limiting']
                },
                {
                  icon: '📊',
                  title: 'Analytics & Monitoring',
                  description: 'Real-time metrics, performance tracking, error monitoring, and detailed usage analytics',
                  color: '#a855f7',
                  features: ['Real-time metrics', 'Error tracking', 'Usage analytics']
                }
              ].map((feature, i) => (
                <div key={i}
                className="feature-card"
                style={{
                  padding: '2.5rem',
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(30, 41, 59, 0.5)',
                  borderRadius: '20px',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  animation: `slideInRight 0.6s ease-out ${i * 0.15}s both`
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.borderColor = feature.color;
                  e.currentTarget.style.boxShadow = `0 32px 64px rgba(0, 0, 0, 0.3), 0 0 0 1px ${feature.color}33`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(30, 41, 59, 0.5)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: `linear-gradient(135deg, ${feature.color}20 0%, ${feature.color}40 100%)`,
                    borderRadius: '20px',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    border: `1px solid ${feature.color}30`,
                    boxShadow: `0 8px 24px ${feature.color}20`
                  }}>{feature.icon}</div>

                  <h4 style={{
                    color: feature.color,
                    marginBottom: '1rem',
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    letterSpacing: '-0.02em'
                  }}>{feature.title}</h4>

                  <p style={{
                    color: '#94a3b8',
                    lineHeight: '1.6',
                    marginBottom: '1.5rem',
                    fontSize: '1rem'
                  }}>{feature.description}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {feature.features.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#cbd5e1'
                      }}>
                        <div style={{
                          width: '4px',
                          height: '4px',
                          background: feature.color,
                          borderRadius: '50%'
                        }} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Performance metrics */}
        <section style={{
          padding: '6rem 2rem',
          textAlign: 'center',
          background: 'rgba(2, 6, 23, 0.4)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#f1f5f9',
              marginBottom: '3rem',
              letterSpacing: '-0.02em'
            }}>Performance at scale</h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '3rem'
            }}>
              {[
                { number: '<50ms', label: 'Average Response Time', color: '#22c55e' },
                { number: '99.99%', label: 'API Uptime', color: '#14b8a6' },
                { number: '1M+', label: 'Requests/Day', color: '#6366f1' },
                { number: '24/7', label: 'Global Support', color: '#a855f7' }
              ].map((stat, i) => (
                <div key={i} style={{
                  animation: `fadeInUp 0.8s ease-out ${i * 0.1}s both`
                }}>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    color: stat.color,
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.03em'
                  }}>{stat.number}</div>
                  <div style={{
                    color: '#94a3b8',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Premium footer */}
      <footer style={{
        borderTop: '1px solid rgba(30, 41, 59, 0.3)',
        padding: '3rem 2rem',
        textAlign: 'center',
        background: 'rgba(2, 6, 23, 0.8)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <p style={{
            color: '#64748b',
            fontSize: '0.95rem',
            marginBottom: '1.5rem'
          }}>© 2025 Candlefish AI · Powering the next generation of applications</p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2.5rem',
            flexWrap: 'wrap'
          }}>
            {['API Reference', 'Status Page', 'Support', 'Pricing'].map((item) => (
              <a key={item} href={`/${item.toLowerCase().replace(' ', '-')}`} style={{
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'color 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.color = '#6366f1'}
              onMouseOut={(e) => e.target.style.color = '#94a3b8'}
              >{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
