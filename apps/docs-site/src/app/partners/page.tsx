'use client'

export default function Partners() {
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
        .partner-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .partner-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 32px 64px rgba(168, 85, 247, 0.3);
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
              { name: 'API', href: '/api', color: '#22d3ee' },
              { name: 'Partners', href: '/partners', color: '#a855f7', active: true }
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

      {/* Partners content */}
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
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            borderRadius: '50px',
            marginBottom: '2rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#a855f7'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              background: '#a855f7',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
            Partner Program Now Open
          </div>

          <h2 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: '800',
            marginBottom: '1.5rem',
            lineHeight: '1.1',
            letterSpacing: '-0.03em',
            color: '#f8fafc'
          }}>
            Partner Ecosystem
          </h2>

          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
            color: '#94a3b8',
            maxWidth: '700px',
            margin: '0 auto 3rem',
            lineHeight: '1.7',
            fontWeight: '400'
          }}>
            Join our growing ecosystem of technology partners, solution providers, and integrators building the future of AI applications.
          </p>
        </section>

        {/* Partner tiers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '2rem',
          marginBottom: '4rem'
        }}>
          {[
            {
              tier: 'Technology Partners',
              description: 'Build platform integrations and extend our core capabilities with your technology.',
              icon: '⚡',
              color: '#a855f7',
              benefits: ['Technical co-development', 'Joint go-to-market', 'API priority access', 'Developer resources'],
              requirements: ['Production-ready integration', 'Technical documentation', 'Support commitment'],
              badge: 'Elite'
            },
            {
              tier: 'Solution Partners',
              description: 'Create industry-specific solutions and consulting services using our platform.',
              icon: '🎯',
              color: '#14b8a6',
              benefits: ['Lead sharing', 'Sales enablement', 'Co-marketing opportunities', 'Training programs'],
              requirements: ['Certified expertise', 'Customer case studies', 'Support capabilities'],
              badge: 'Certified'
            },
            {
              tier: 'Integration Partners',
              description: 'Connect existing systems and workflows with our AI-powered platform.',
              icon: '🔗',
              color: '#22d3ee',
              benefits: ['Integration marketplace', 'Technical support', 'Revenue sharing', 'Developer tools'],
              requirements: ['Maintained integrations', 'Documentation quality', 'User support'],
              badge: 'Active'
            }
          ].map((partner, i) => (
            <div key={i}
              className="partner-card"
              style={{
                padding: '2.5rem',
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(20, 184, 166, 0.15)',
                borderRadius: '16px',
                backdropFilter: 'blur(20px) saturate(180%)',
                cursor: 'pointer',
                animation: `slideInUp 0.6s ease-out ${i * 0.15}s both`,
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = partner.color;
                e.currentTarget.style.boxShadow = `0 32px 64px rgba(0, 0, 0, 0.3), 0 0 0 1px ${partner.color}33`;
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
                  background: `linear-gradient(135deg, ${partner.color}20 0%, ${partner.color}40 100%)`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  border: `1px solid ${partner.color}30`
                }}>{partner.icon}</div>

                <span style={{
                  color: partner.color,
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  background: `${partner.color}15`,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  border: `1px solid ${partner.color}30`
                }}>{partner.badge}</span>
              </div>

              <h3 style={{
                color: partner.color,
                fontSize: '1.375rem',
                fontWeight: '700',
                letterSpacing: '-0.025em',
                marginBottom: '1rem'
              }}>{partner.tier}</h3>

              <p style={{
                color: '#94a3b8',
                lineHeight: '1.6',
                fontSize: '1rem',
                marginBottom: '2rem'
              }}>{partner.description}</p>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{
                  color: '#cbd5e1',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem'
                }}>Benefits</h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {partner.benefits.map((benefit, idx) => (
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
                        background: partner.color,
                        borderRadius: '50%'
                      }} />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{
                  color: '#cbd5e1',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem'
                }}>Requirements</h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {partner.requirements.map((req, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: '#94a3b8'
                    }}>
                      <div style={{
                        width: '4px',
                        height: '4px',
                        background: '#64748b',
                        borderRadius: '50%'
                      }} />
                      {req}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Partner success metrics */}
        <section style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(20, 184, 166, 0.15)',
          borderRadius: '20px',
          marginBottom: '4rem'
        }}>
          <h3 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#f8fafc',
            marginBottom: '1rem'
          }}>Partner Impact</h3>

          <p style={{
            color: '#94a3b8',
            marginBottom: '3rem',
            maxWidth: '600px',
            margin: '0 auto 3rem'
          }}>Our partners drive innovation and growth across the ecosystem</p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minMax(200px, 1fr))',
            gap: '3rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {[
              { number: '150+', label: 'Active Partners', color: '#a855f7' },
              { number: '$2.5M+', label: 'Partner Revenue', color: '#14b8a6' },
              { number: '500K+', label: 'Users Reached', color: '#22d3ee' },
              { number: '40+', label: 'Integrations Built', color: '#f59e0b' }
            ].map((stat, i) => (
              <div key={i} style={{
                animation: `slideInUp 0.8s ease-out ${i * 0.1}s both`
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: '800',
                  color: stat.color,
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

        {/* Application process */}
        <section style={{
          marginBottom: '4rem'
        }}>
          <h3 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#f8fafc',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>How to Become a Partner</h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem'
          }}>
            {[
              {
                step: '01',
                title: 'Apply',
                description: 'Submit your partner application with your company details and integration plans',
                color: '#a855f7'
              },
              {
                step: '02',
                title: 'Review',
                description: 'Our partner team evaluates your application and technical capabilities',
                color: '#14b8a6'
              },
              {
                step: '03',
                title: 'Onboard',
                description: 'Get access to partner resources, documentation, and dedicated support',
                color: '#22d3ee'
              },
              {
                step: '04',
                title: 'Launch',
                description: 'Build your integration, go to market, and start growing together',
                color: '#f59e0b'
              }
            ].map((process, i) => (
              <div key={i} style={{
                padding: '2rem',
                background: 'rgba(15, 23, 42, 0.3)',
                border: '1px solid rgba(20, 184, 166, 0.1)',
                borderRadius: '12px',
                textAlign: 'center',
                animation: `slideInUp 0.5s ease-out ${i * 0.1}s both`
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `${process.color}15`,
                  border: `2px solid ${process.color}30`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: process.color
                }}>{process.step}</div>

                <h4 style={{
                  color: process.color,
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem'
                }}>{process.title}</h4>

                <p style={{
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  lineHeight: '1.5'
                }}>{process.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA section */}
        <section style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '20px'
        }}>
          <h3 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#f8fafc',
            marginBottom: '1rem'
          }}>Ready to Partner with Us?</h3>

          <p style={{
            color: '#94a3b8',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem'
          }}>Join our ecosystem and build the future of AI-powered applications together</p>

          <div style={{
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button style={{
              padding: '1rem 2.5rem',
              background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)',
              color: 'white',
              fontWeight: '600',
              borderRadius: '12px',
              border: 'none',
              fontSize: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 20px 40px rgba(168, 85, 247, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 25px 50px rgba(168, 85, 247, 0.5)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 40px rgba(168, 85, 247, 0.4)';
            }}
            >
              Apply Now
            </button>

            <button style={{
              padding: '1rem 2.5rem',
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#e2e8f0',
              fontWeight: '600',
              borderRadius: '12px',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(168, 85, 247, 0.1)';
              (e.currentTarget as HTMLElement).style.borderColor = '#a855f7';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(15, 23, 42, 0.8)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168, 85, 247, 0.3)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
            >
              Partner Portal
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
