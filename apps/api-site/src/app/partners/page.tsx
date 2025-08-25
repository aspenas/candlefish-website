'use client'

export default function Partners() {
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
        .partner-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .partner-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 32px 64px rgba(0, 0, 0, 0.3);
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
              { name: 'Documentation', href: '/documentation', color: '#14b8a6' },
              { name: 'Partners', href: '/partners', color: '#a855f7', active: true },
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

      {/* Partners content */}
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
            Partner Program
          </h2>

          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
            color: '#94a3b8',
            maxWidth: '700px',
            margin: '0 auto 3rem',
            lineHeight: '1.6',
            fontWeight: '400'
          }}>
            Join our ecosystem of technology partners and build powerful integrations with our API platform.
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
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
            Now accepting partner applications
          </div>
        </section>

        {/* Partner types */}
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
                title: 'Technology Partners',
                description: 'Integrate our API into your platform and offer enhanced capabilities to your users.',
                icon: '🔧',
                color: '#6366f1',
                benefits: ['Technical support', 'Co-marketing opportunities', 'Revenue sharing', 'Priority feature requests']
              },
              {
                title: 'Solution Partners',
                description: 'Build custom solutions using our API for specific industries or use cases.',
                icon: '💡',
                color: '#14b8a6',
                benefits: ['Consulting opportunities', 'Case study features', 'Technical certification', 'Lead referrals']
              },
              {
                title: 'Channel Partners',
                description: 'Resell our API services to your customer base with attractive partner margins.',
                icon: '📈',
                color: '#a855f7',
                benefits: ['Competitive margins', 'Sales training', 'Marketing materials', 'Dedicated support']
              }
            ].map((partner, i) => (
              <div key={i}
                className="partner-card"
                style={{
                  padding: '2.5rem',
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(30, 41, 59, 0.5)',
                  borderRadius: '20px',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  cursor: 'pointer',
                  animation: `fadeInUp 0.6s ease-out ${i * 0.15}s both`
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = partner.color;
                  e.currentTarget.style.boxShadow = `0 32px 64px rgba(0, 0, 0, 0.3), 0 0 0 1px ${partner.color}33`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(30, 41, 59, 0.5)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: `linear-gradient(135deg, ${partner.color}20 0%, ${partner.color}40 100%)`,
                  borderRadius: '20px',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  border: `1px solid ${partner.color}30`,
                  boxShadow: `0 8px 24px ${partner.color}20`
                }}>{partner.icon}</div>

                <h3 style={{
                  color: partner.color,
                  marginBottom: '1rem',
                  fontSize: '1.375rem',
                  fontWeight: '700',
                  letterSpacing: '-0.02em'
                }}>{partner.title}</h3>

                <p style={{
                  color: '#94a3b8',
                  lineHeight: '1.6',
                  marginBottom: '1.5rem',
                  fontSize: '1rem'
                }}>{partner.description}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
            ))}
          </div>

          {/* Partner success stories */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(30, 41, 59, 0.5)',
            borderRadius: '20px',
            padding: '3rem 2rem',
            marginBottom: '4rem',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#f1f5f9',
              marginBottom: '1rem',
              letterSpacing: '-0.02em'
            }}>Partner Success Stories</h3>

            <p style={{
              fontSize: '1.125rem',
              color: '#94a3b8',
              marginBottom: '3rem',
              maxWidth: '800px',
              margin: '0 auto 3rem'
            }}>See how our partners are building innovative solutions and growing their businesses</p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem'
            }}>
              {[
                {
                  company: 'TechFlow Solutions',
                  metric: '300%',
                  description: 'increase in customer engagement',
                  quote: 'The GraphQL API flexibility allowed us to create exactly what our customers needed.',
                  color: '#6366f1'
                },
                {
                  company: 'DataCorp Analytics',
                  metric: '2M+',
                  description: 'API calls processed monthly',
                  quote: 'Scalability and reliability have been game-changers for our platform.',
                  color: '#14b8a6'
                },
                {
                  company: 'CloudSync Enterprise',
                  metric: '50%',
                  description: 'reduction in development time',
                  quote: 'The comprehensive SDK and documentation made integration seamless.',
                  color: '#a855f7'
                }
              ].map((story, i) => (
                <div key={i} style={{
                  padding: '2rem',
                  background: 'rgba(30, 41, 59, 0.3)',
                  border: '1px solid rgba(51, 65, 85, 0.4)',
                  borderRadius: '16px',
                  textAlign: 'left'
                }}>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    color: story.color,
                    marginBottom: '0.5rem'
                  }}>{story.metric}</div>

                  <div style={{
                    color: '#cbd5e1',
                    fontSize: '1rem',
                    marginBottom: '1rem'
                  }}>{story.description}</div>

                  <div style={{
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    fontStyle: 'italic',
                    marginBottom: '1rem'
                  }}>"{story.quote}"</div>

                  <div style={{
                    color: story.color,
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}>— {story.company}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Application CTA */}
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            borderRadius: '20px'
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#f1f5f9',
              marginBottom: '1rem'
            }}>Ready to become a partner?</h3>

            <p style={{
              fontSize: '1.125rem',
              color: '#94a3b8',
              marginBottom: '2rem',
              maxWidth: '600px',
              margin: '0 auto 2rem'
            }}>Join our growing ecosystem and start building amazing integrations today</p>

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
                Partner Resources
              </button>
            </div>
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
