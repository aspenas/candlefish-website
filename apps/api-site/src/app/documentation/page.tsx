'use client'

export default function Documentation() {
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
        @keyframes fadeInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .doc-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .doc-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
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
              { name: 'Home', href: '/', color: '#94a3b8' },
              { name: 'Playground', href: '/playground', color: '#6366f1' },
              { name: 'Documentation', href: '/documentation', color: '#14b8a6', active: true },
              { name: 'Partners', href: '/partners', color: '#a855f7' },
              { name: 'Contact', href: '/contact', color: '#ec4899' }
            ].map((item, i) => (
              <a key={item.name} href={item.href} style={{
                color: item.active ? item.color : '#cbd5e1',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
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

      {/* Documentation content */}
      <main style={{
        padding: '0',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Hero section */}
        <section style={{
          padding: '6rem 2rem 4rem',
          textAlign: 'center',
          maxWidth: '1400px',
          margin: '0 auto',
          animation: 'fadeInUp 1s ease-out'
        }}>
          <h2 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: '800',
            marginBottom: '1.5rem',
            lineHeight: '1.1',
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            API Documentation
          </h2>

          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
            color: '#94a3b8',
            maxWidth: '700px',
            margin: '0 auto 3rem',
            lineHeight: '1.6',
            fontWeight: '400'
          }}>
            Comprehensive guides, references, and examples to get you started with our GraphQL API.
          </p>
        </section>

        {/* Documentation sections */}
        <section style={{
          padding: '2rem',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '2rem',
            marginBottom: '4rem'
          }}>
            {[
              {
                title: 'Getting Started',
                description: 'Learn the basics of our GraphQL API, authentication, and making your first requests.',
                icon: '🚀',
                color: '#6366f1',
                items: ['Quick Start Guide', 'Authentication', 'First Query', 'Error Handling']
              },
              {
                title: 'GraphQL Reference',
                description: 'Complete schema documentation, queries, mutations, and subscription examples.',
                icon: '📚',
                color: '#14b8a6',
                items: ['Schema Explorer', 'Query Examples', 'Mutations', 'Subscriptions']
              },
              {
                title: 'SDKs & Libraries',
                description: 'Official SDKs and community libraries for popular programming languages.',
                icon: '🛠️',
                color: '#a855f7',
                items: ['JavaScript SDK', 'Python SDK', 'Go SDK', 'Community Libraries']
              }
            ].map((section, i) => (
              <div key={i}
                className="doc-card"
                style={{
                  padding: '2.5rem',
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(30, 41, 59, 0.5)',
                  borderRadius: '20px',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  cursor: 'pointer',
                  animation: `fadeInUp 0.6s ease-out ${i * 0.15}s both`
                }}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: `linear-gradient(135deg, ${section.color}20 0%, ${section.color}40 100%)`,
                  borderRadius: '20px',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  border: `1px solid ${section.color}30`,
                  boxShadow: `0 8px 24px ${section.color}20`
                }}>{section.icon}</div>

                <h3 style={{
                  color: section.color,
                  marginBottom: '1rem',
                  fontSize: '1.375rem',
                  fontWeight: '700',
                  letterSpacing: '-0.02em'
                }}>{section.title}</h3>

                <p style={{
                  color: '#94a3b8',
                  lineHeight: '1.6',
                  marginBottom: '1.5rem',
                  fontSize: '1rem'
                }}>{section.description}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {section.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
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
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive GraphQL Explorer */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(30, 41, 59, 0.5)',
            borderRadius: '20px',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
            marginBottom: '4rem'
          }}>
            <div style={{
              padding: '2rem',
              borderBottom: '1px solid rgba(30, 41, 59, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #14b8a620 0%, #14b8a640 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                border: '1px solid #14b8a630'
              }}>⚡</div>
              <div>
                <h3 style={{
                  color: '#14b8a6',
                  marginBottom: '0.25rem',
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>Interactive GraphQL Explorer</h3>
                <p style={{
                  color: '#94a3b8',
                  fontSize: '1rem'
                }}>Try queries, explore the schema, and see real-time responses</p>
              </div>
            </div>

            <div style={{
              padding: '2rem',
              fontFamily: '"SF Mono", "Monaco", Consolas, monospace',
              fontSize: '0.875rem',
              lineHeight: '1.6'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ color: '#6366f1', marginBottom: '0.5rem', fontWeight: '600' }}>Example Query:</div>
                <div style={{ color: '#64748b' }}>query GetUserProfile {`{`}</div>
                <div style={{ color: '#14b8a6', marginLeft: '1rem' }}>  user(id: $userId) {`{`}</div>
                <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>    id</div>
                <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>    name</div>
                <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>    email</div>
                <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>    profile {`{`}</div>
                <div style={{ color: '#a855f7', marginLeft: '3rem' }}>      avatar</div>
                <div style={{ color: '#a855f7', marginLeft: '3rem' }}>      bio</div>
                <div style={{ color: '#a855f7', marginLeft: '3rem' }}>      preferences {`{`}</div>
                <div style={{ color: '#ec4899', marginLeft: '4rem' }}>        theme</div>
                <div style={{ color: '#ec4899', marginLeft: '4rem' }}>        language</div>
                <div style={{ color: '#a855f7', marginLeft: '3rem' }}>{`      }`}</div>
                <div style={{ color: '#e2e8f0', marginLeft: '2rem' }}>{`    }`}</div>
                <div style={{ color: '#14b8a6', marginLeft: '1rem' }}>{`  }`}</div>
                <div style={{ color: '#64748b' }}>{`}`}</div>
              </div>

              <button style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                color: 'white',
                fontWeight: '600',
                borderRadius: '12px',
                border: 'none',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(20, 184, 166, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(20, 184, 166, 0.5)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(20, 184, 166, 0.4)';
              }}
              >
                Open GraphQL Playground
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              { title: 'API Reference', description: 'Complete API documentation', icon: '📖', color: '#6366f1' },
              { title: 'Code Examples', description: 'Ready-to-use code snippets', icon: '💻', color: '#14b8a6' },
              { title: 'Tutorials', description: 'Step-by-step guides', icon: '🎯', color: '#a855f7' },
              { title: 'Community', description: 'Join our developer community', icon: '👥', color: '#ec4899' }
            ].map((link, i) => (
              <div key={i} style={{
                padding: '1.5rem',
                background: 'rgba(15, 23, 42, 0.3)',
                border: '1px solid rgba(30, 41, 59, 0.4)',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                animation: `fadeInUp 0.5s ease-out ${i * 0.1}s both`
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = link.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(30, 41, 59, 0.4)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>{link.icon}</span>
                  <h4 style={{
                    color: link.color,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    margin: 0
                  }}>{link.title}</h4>
                </div>
                <p style={{
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  margin: 0
                }}>{link.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
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
              onMouseOver={(e) => (e.currentTarget as HTMLElement).style.color = '#6366f1'}
              onMouseOut={(e) => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
              >{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
