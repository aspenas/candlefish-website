'use client'

export default function Docs() {
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
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .doc-section {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .doc-section:hover {
          transform: translateY(-4px);
          box-shadow: 0 25px 50px rgba(20, 184, 166, 0.2);
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
              { name: 'Documentation', href: '/docs', color: '#14b8a6', active: true },
              { name: 'API', href: '/api', color: '#22d3ee' },
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

      {/* Documentation content */}
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
          <h2 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: '800',
            marginBottom: '1.5rem',
            lineHeight: '1.1',
            letterSpacing: '-0.03em',
            color: '#f8fafc'
          }}>
            Complete Documentation
          </h2>

          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
            color: '#94a3b8',
            maxWidth: '700px',
            margin: '0 auto 3rem',
            lineHeight: '1.7',
            fontWeight: '400'
          }}>
            Everything you need to build amazing applications with Candlefish AI. From quick starts to advanced integrations.
          </p>

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
            ✨ Updated for GraphQL Federation 2.0
          </div>
        </section>

        {/* Documentation sections */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '2rem',
          marginBottom: '4rem'
        }}>
          {[
            {
              title: 'Quick Start',
              description: 'Get up and running with Candlefish AI in minutes. Setup, authentication, and your first API call.',
              icon: '🚀',
              color: '#14b8a6',
              topics: ['Installation', 'Authentication', 'First API Call', 'Configuration'],
              time: '5 min read'
            },
            {
              title: 'GraphQL Guide',
              description: 'Master GraphQL with our federated schema. Queries, mutations, subscriptions, and best practices.',
              icon: '📊',
              color: '#22d3ee',
              topics: ['Schema Explorer', 'Query Building', 'Real-time Subscriptions', 'Caching'],
              time: '15 min read'
            },
            {
              title: 'Integration Patterns',
              description: 'Common integration patterns, SDKs, and frameworks. Build robust applications with confidence.',
              icon: '🔧',
              color: '#a855f7',
              topics: ['React Integration', 'Node.js Backend', 'Python SDK', 'Authentication'],
              time: '20 min read'
            },
            {
              title: 'Enterprise Features',
              description: 'Advanced features for enterprise deployment. Security, monitoring, and team management.',
              icon: '🏢',
              color: '#f59e0b',
              topics: ['SSO Integration', 'Audit Logging', 'Rate Limiting', 'Team Management'],
              time: '25 min read'
            },
            {
              title: 'API Reference',
              description: 'Complete API documentation with interactive examples and detailed parameter explanations.',
              icon: '📚',
              color: '#ef4444',
              topics: ['GraphQL Schema', 'REST Endpoints', 'Webhooks', 'Error Codes'],
              time: 'Reference'
            },
            {
              title: 'Deployment Guide',
              description: 'Deploy your applications to production with zero-config deployment and global CDN.',
              icon: '🌐',
              color: '#8b5cf6',
              topics: ['Zero Config Deploy', 'Custom Domains', 'Environment Variables', 'Monitoring'],
              time: '10 min read'
            }
          ].map((section, i) => (
            <div key={i}
              className="doc-section"
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
                width: '56px',
                height: '56px',
                background: `linear-gradient(135deg, ${section.color}20 0%, ${section.color}40 100%)`,
                borderRadius: '16px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                border: `1px solid ${section.color}30`,
                animation: 'float 4s ease-in-out infinite'
              }}>{section.icon}</div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <h3 style={{
                  color: section.color,
                  fontSize: '1.375rem',
                  fontWeight: '700',
                  letterSpacing: '-0.025em',
                  margin: 0
                }}>{section.title}</h3>

                <span style={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  background: 'rgba(100, 116, 139, 0.1)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px'
                }}>{section.time}</span>
              </div>

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
                {section.topics.map((topic, idx) => (
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
                    {topic}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Popular guides */}
        <section style={{
          marginBottom: '4rem'
        }}>
          <h3 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#f8fafc',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>Popular Guides</h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              {
                title: 'Building Your First GraphQL App',
                description: 'Step-by-step tutorial for creating a React app with GraphQL',
                readTime: '15 min',
                difficulty: 'Beginner',
                color: '#14b8a6'
              },
              {
                title: 'Real-time Data with Subscriptions',
                description: 'Implement real-time features using GraphQL subscriptions',
                readTime: '20 min',
                difficulty: 'Intermediate',
                color: '#22d3ee'
              },
              {
                title: 'Advanced Authentication Patterns',
                description: 'Secure your app with JWT, OAuth, and role-based access control',
                readTime: '30 min',
                difficulty: 'Advanced',
                color: '#a855f7'
              },
              {
                title: 'Performance Optimization Guide',
                description: 'Best practices for caching, batching, and query optimization',
                readTime: '25 min',
                difficulty: 'Intermediate',
                color: '#f59e0b'
              }
            ].map((guide, i) => (
              <div key={i} style={{
                padding: '2rem',
                background: 'rgba(15, 23, 42, 0.3)',
                border: '1px solid rgba(20, 184, 166, 0.1)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                animation: `slideInUp 0.5s ease-out ${i * 0.1}s both`
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = guide.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 25px ${guide.color}20`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem'
                }}>
                  <h4 style={{
                    color: guide.color,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    margin: 0,
                    flex: 1
                  }}>{guide.title}</h4>
                </div>

                <p style={{
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                  lineHeight: '1.5'
                }}>{guide.description}</p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem'
                  }}>
                    <span style={{
                      color: '#64748b',
                      fontSize: '0.75rem',
                      background: 'rgba(100, 116, 139, 0.1)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px'
                    }}>{guide.readTime}</span>

                    <span style={{
                      color: guide.color,
                      fontSize: '0.75rem',
                      background: `${guide.color}10`,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px'
                    }}>{guide.difficulty}</span>
                  </div>

                  <span style={{
                    color: guide.color,
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>Read →</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Search and filters */}
        <section style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(20, 184, 166, 0.15)',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)'
        }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#f8fafc',
            marginBottom: '1rem'
          }}>Can't find what you're looking for?</h3>

          <p style={{
            color: '#94a3b8',
            marginBottom: '2rem'
          }}>Search our comprehensive documentation or contact our support team</p>

          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              color: 'white',
              fontWeight: '600',
              borderRadius: '8px',
              border: 'none',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(20, 184, 166, 0.4)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
            >
              Search Documentation
            </button>

            <button style={{
              padding: '0.75rem 2rem',
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#e2e8f0',
              fontWeight: '600',
              borderRadius: '8px',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              fontSize: '1rem',
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
              Contact Support
            </button>
          </div>
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
