'use client'

export default function API() {
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
        @keyframes slideInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .api-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .api-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 25px 50px rgba(34, 211, 238, 0.2);
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
            {[
              { name: 'Home', href: '/', color: '#94a3b8' },
              { name: 'Documentation', href: '/docs', color: '#14b8a6' },
              { name: 'API', href: '/api', color: '#22d3ee', active: true },
              { name: 'Partners', href: '/partners', color: '#a855f7' }
            ].map((item, i) => (
              <a key={item.name} href={item.href} style={{
                color: item.active ? item.color : '#cbd5e1',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                background: item.active ? `${item.color}10` : 'transparent',
                border: `1px solid ${item.active ? `${item.color}30` : 'transparent'}`
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.color = item.color;
                (e.currentTarget as HTMLElement).style.background = `${item.color}10`;
                (e.currentTarget as HTMLElement).style.borderColor = `${item.color}30`;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.color = item.active ? item.color : '#cbd5e1';
                (e.currentTarget as HTMLElement).style.background = item.active ? `${item.color}10` : 'transparent';
                (e.currentTarget as HTMLElement).style.borderColor = item.active ? `${item.color}30` : 'transparent';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
              >{item.name}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* API Reference content */}
      <main style={{
        padding: '4rem 2rem',
        maxWidth: '1400px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Hero section */}
        <section style={{
          textAlign: 'center',
          marginBottom: '4rem',
          animation: 'slideInUp 1s ease-out'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.5rem',
            background: 'rgba(34, 211, 238, 0.1)',
            border: '1px solid rgba(34, 211, 238, 0.2)',
            borderRadius: '50px',
            marginBottom: '2rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#22d3ee'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              background: '#22d3ee',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
            GraphQL Federation 2.0 Ready
          </div>

          <h2 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: '800',
            marginBottom: '1.5rem',
            lineHeight: '1.1',
            letterSpacing: '-0.03em',
            color: '#f8fafc'
          }}>
            API Reference
          </h2>

          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
            color: '#94a3b8',
            maxWidth: '700px',
            margin: '0 auto 3rem',
            lineHeight: '1.7',
            fontWeight: '400'
          }}>
            Complete GraphQL API documentation with interactive examples, schema exploration, and real-time testing.
          </p>
        </section>

        {/* API sections */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '2rem',
          marginBottom: '4rem'
        }}>
          {[
            {
              title: 'Schema Explorer',
              description: 'Interactive GraphQL schema browser with field documentation and type relationships.',
              icon: '🔍',
              color: '#22d3ee',
              features: ['Type definitions', 'Field documentation', 'Query validation', 'Schema introspection'],
              badge: 'Interactive'
            },
            {
              title: 'Query Builder',
              description: 'Visual query builder with auto-completion, syntax highlighting, and real-time validation.',
              icon: '⚡',
              color: '#14b8a6',
              features: ['Visual query building', 'Auto-completion', 'Syntax highlighting', 'Query optimization'],
              badge: 'New'
            },
            {
              title: 'Mutations Reference',
              description: 'Complete guide to all available mutations with examples and parameter documentation.',
              icon: '✏️',
              color: '#a855f7',
              features: ['Create operations', 'Update operations', 'Delete operations', 'Batch mutations'],
              badge: 'Complete'
            },
            {
              title: 'Subscriptions Guide',
              description: 'Real-time subscriptions for live updates, notifications, and data synchronization.',
              icon: '📡',
              color: '#f59e0b',
              features: ['Real-time updates', 'Event subscriptions', 'Connection management', 'Error handling'],
              badge: 'Real-time'
            },
            {
              title: 'Authentication',
              description: 'JWT tokens, API keys, OAuth integration, and role-based access control.',
              icon: '🔐',
              color: '#ef4444',
              features: ['JWT authentication', 'API keys', 'OAuth 2.0', 'Role-based access'],
              badge: 'Secure'
            },
            {
              title: 'Rate Limiting',
              description: 'Query complexity analysis, rate limiting, and cost-based query limiting.',
              icon: '🚦',
              color: '#8b5cf6',
              features: ['Query complexity', 'Rate limits', 'Cost analysis', 'Throttling'],
              badge: 'Enterprise'
            }
          ].map((section, i) => (
            <div key={i}
              className="api-card"
              style={{
                padding: '2.5rem',
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(20, 184, 166, 0.15)',
                borderRadius: '16px',
                backdropFilter: 'blur(20px) saturate(180%)',
                cursor: 'pointer',
                animation: `slideInUp 0.6s ease-out ${i * 0.1}s both`,
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = section.color;
                e.currentTarget.style.boxShadow = `0 25px 50px rgba(20, 184, 166, 0.2), 0 0 0 1px ${section.color}33`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  background: `linear-gradient(135deg, ${section.color}20 0%, ${section.color}40 100%)`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  border: `1px solid ${section.color}30`
                }}>{section.icon}</div>

                <span style={{
                  color: section.color,
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  background: `${section.color}15`,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  border: `1px solid ${section.color}30`
                }}>{section.badge}</span>
              </div>

              <h3 style={{
                color: section.color,
                fontSize: '1.375rem',
                fontWeight: '700',
                letterSpacing: '-0.025em',
                marginBottom: '1rem'
              }}>{section.title}</h3>

              <p style={{
                color: '#94a3b8',
                lineHeight: '1.6',
                fontSize: '1rem',
                marginBottom: '1.5rem'
              }}>{section.description}</p>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {section.features.map((feature, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#cbd5e1',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = `${section.color}05`;
                    e.currentTarget.style.color = section.color;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#cbd5e1';
                  }}
                  >
                    <div style={{
                      width: '4px',
                      height: '4px',
                      background: section.color,
                      borderRadius: '50%'
                    }} />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Interactive GraphQL Playground */}
        <section style={{
          marginBottom: '4rem'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(20, 184, 166, 0.15)',
            borderRadius: '20px',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{
              padding: '2rem',
              borderBottom: '1px solid rgba(20, 184, 166, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{
                  color: '#22d3ee',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem'
                }}>GraphQL Playground</h3>
                <p style={{
                  color: '#94a3b8',
                  fontSize: '1rem'
                }}>Interactive API explorer with real-time query execution</p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '20px',
                fontSize: '0.75rem',
                color: '#22c55e'
              }}>
                <div style={{
                  width: '4px',
                  height: '4px',
                  background: '#22c55e',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite'
                }} />
                Online
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              height: '400px'
            }}>
              {/* Query panel */}
              <div style={{
                padding: '2rem',
                borderRight: '1px solid rgba(20, 184, 166, 0.15)'
              }}>
                <div style={{
                  color: '#22d3ee',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '1rem'
                }}>Query</div>

                <div style={{
                  fontFamily: '"SF Mono", "Monaco", Consolas, monospace',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  color: '#e2e8f0'
                }}>
                  <div style={{ color: '#64748b' }}>query GetUserProfile {`{`}</div>
                  <div style={{ color: '#22d3ee', marginLeft: '1rem' }}>  user(id: "123") {`{`}</div>
                  <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>    id</div>
                  <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>    name</div>
                  <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>    email</div>
                  <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>    profile {`{`}</div>
                  <div style={{ color: '#a855f7', marginLeft: '3rem' }}>      avatar</div>
                  <div style={{ color: '#a855f7', marginLeft: '3rem' }}>      bio</div>
                  <div style={{ color: '#a855f7', marginLeft: '3rem' }}>      settings {`{`}</div>
                  <div style={{ color: '#f59e0b', marginLeft: '4rem' }}>        theme</div>
                  <div style={{ color: '#f59e0b', marginLeft: '4rem' }}>        notifications</div>
                  <div style={{ color: '#a855f7', marginLeft: '3rem' }}>{`      }`}</div>
                  <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>{`    }`}</div>
                  <div style={{ color: '#22d3ee', marginLeft: '1rem' }}>{`  }`}</div>
                  <div style={{ color: '#64748b' }}>{`}`}</div>
                </div>
              </div>

              {/* Response panel */}
              <div style={{
                padding: '2rem'
              }}>
                <div style={{
                  color: '#14b8a6',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '1rem'
                }}>Response</div>

                <div style={{
                  fontFamily: '"SF Mono", "Monaco", Consolas, monospace',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  color: '#e2e8f0'
                }}>
                  <div style={{ color: '#64748b' }}>{`{`}</div>
                  <div style={{ color: '#22d3ee', marginLeft: '1rem' }}>"data": {`{`}</div>
                  <div style={{ color: '#14b8a6', marginLeft: '2rem' }}>"user": {`{`}</div>
                  <div style={{ color: '#e2e8f0', marginLeft: '3rem' }}>"id": "123",</div>
                  <div style={{ color: '#e2e8f0', marginLeft: '3rem' }}>"name": "John Doe",</div>
                  <div style={{ color: '#e2e8f0', marginLeft: '3rem' }}>"email": "john@example.com",</div>
                  <div style={{ color: '#a855f7', marginLeft: '3rem' }}>"profile": {`{`}</div>
                  <div style={{ color: '#f59e0b', marginLeft: '4rem' }}>"avatar": "https://...",</div>
                  <div style={{ color: '#f59e0b', marginLeft: '4rem' }}>"bio": "Developer"</div>
                  <div style={{ color: '#a855f7', marginLeft: '3rem' }}>{`}`}</div>
                  <div style={{ color: '#14b8a6', marginLeft: '2rem' }}>{`}`}</div>
                  <div style={{ color: '#22d3ee', marginLeft: '1rem' }}>{`}`}</div>
                  <div style={{ color: '#64748b' }}>{`}`}</div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '2rem',
              borderTop: '1px solid rgba(20, 184, 166, 0.15)',
              display: 'flex',
              gap: '1rem'
            }}>
              <button style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
                color: 'white',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(34, 211, 238, 0.4)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
              >
                ▶ Run Query
              </button>

              <button style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#cbd5e1',
                fontWeight: '500',
                borderRadius: '8px',
                border: '1px solid rgba(20, 184, 166, 0.3)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(20, 184, 166, 0.1)';
                (e.currentTarget as HTMLElement).style.borderColor = '#14b8a6';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(15, 23, 42, 0.8)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(20, 184, 166, 0.3)';
              }}
              >
                Format Query
              </button>

              <button style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#cbd5e1',
                fontWeight: '500',
                borderRadius: '8px',
                border: '1px solid rgba(20, 184, 166, 0.3)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(20, 184, 166, 0.1)';
                (e.currentTarget as HTMLElement).style.borderColor = '#14b8a6';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(15, 23, 42, 0.8)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(20, 184, 166, 0.3)';
              }}
              >
                Copy cURL
              </button>
            </div>
          </div>
        </section>

        {/* Quick reference */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          {[
            {
              title: 'GraphQL Endpoint',
              content: 'https://api.candlefish.ai/graphql',
              description: 'Main GraphQL endpoint for all queries and mutations',
              color: '#22d3ee'
            },
            {
              title: 'WebSocket Endpoint',
              content: 'wss://api.candlefish.ai/graphql',
              description: 'WebSocket endpoint for real-time subscriptions',
              color: '#14b8a6'
            },
            {
              title: 'Authentication Header',
              content: 'Authorization: Bearer <token>',
              description: 'JWT token authentication header format',
              color: '#a855f7'
            },
            {
              title: 'API Version',
              content: 'v2.0 (GraphQL Federation)',
              description: 'Current API version with federation support',
              color: '#f59e0b'
            }
          ].map((item, i) => (
            <div key={i} style={{
              padding: '2rem',
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid rgba(20, 184, 166, 0.15)',
              borderRadius: '12px',
              animation: `slideInUp 0.5s ease-out ${i * 0.1}s both`
            }}>
              <h4 style={{
                color: item.color,
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '0.75rem'
              }}>{item.title}</h4>

              <div style={{
                fontFamily: '"SF Mono", "Monaco", Consolas, monospace',
                fontSize: '0.875rem',
                color: '#e2e8f0',
                background: 'rgba(30, 41, 59, 0.4)',
                padding: '0.75rem',
                borderRadius: '6px',
                marginBottom: '0.75rem',
                border: `1px solid ${item.color}20`
              }}>{item.content}</div>

              <p style={{
                color: '#94a3b8',
                fontSize: '0.875rem',
                margin: 0
              }}>{item.description}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(20, 184, 166, 0.1)',
        marginTop: '4rem',
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
              onMouseOver={(e) => (e.currentTarget as HTMLElement).style.color = '#14b8a6'}
              onMouseOut={(e) => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
              >{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
