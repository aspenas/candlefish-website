'use client'

export default function Documentation() {
  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse at top, rgba(79, 70, 229, 0.12) 0%, transparent 70%),
        radial-gradient(ellipse at bottom right, rgba(168, 85, 247, 0.1) 0%, transparent 60%),
        radial-gradient(ellipse at bottom left, rgba(14, 165, 233, 0.08) 0%, transparent 50%),
        linear-gradient(to bottom, #000000 0%, #0a0a0a 25%, #0f172a 100%)
      `,
      color: '#ffffff',
      fontFamily: '"Geist", "Inter", system-ui, -apple-system, sans-serif',
      position: 'relative'
    }}>
      {/* Subtle dot pattern */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        animation: 'dotPattern 40s linear infinite',
        zIndex: 0
      }} />

      <style jsx>{`
        @keyframes dotPattern {
          0% { transform: translate(0, 0); }
          100% { transform: translate(32px, 32px); }
        }
        @keyframes fadeInScale {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes slideInUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(79, 70, 229, 0.4); }
          50% { box-shadow: 0 0 40px rgba(79, 70, 229, 0.6), 0 0 60px rgba(168, 85, 247, 0.3); }
        }
        .doc-card {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .doc-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
          transition: left 0.6s ease;
        }
        .doc-card:hover::after {
          left: 100%;
        }
        .doc-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 32px 64px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      {/* Navigation */}
      <nav style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(24px) saturate(180%)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 40px rgba(0, 0, 0, 0.4)'
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
            gap: '1rem'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              animation: 'glow 4s ease-in-out infinite'
            }}>
              <span style={{ color: 'white', fontSize: '1.2rem', fontWeight: '700' }}>C</span>
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em'
            }}>Partners</h1>
          </div>

          <div style={{
            display: 'flex',
            gap: '2rem',
            alignItems: 'center'
          }}>
            {[
              { name: 'Home', href: '/', color: '#a1a1aa' },
              { name: 'Solutions', href: '/solutions', color: '#4f46e5' },
              { name: 'Benefits', href: '/benefits', color: '#22c55e' },
              { name: 'Apply', href: '/apply', color: '#ec4899' },
              { name: 'Documentation', href: '/documentation', color: '#f59e0b', active: true },
              { name: 'API', href: '/api', color: '#8b5cf6' }
            ].map((item, i) => (
              <a key={item.name} href={item.href} style={{
                color: item.active ? item.color : '#a1a1aa',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                background: item.active ? `${item.color}10` : 'transparent',
                border: item.active ? `1px solid ${item.color}30` : '1px solid transparent'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.color = item.color;
                (e.currentTarget as HTMLElement).style.background = `${item.color}10`;
                (e.currentTarget as HTMLElement).style.borderColor = `${item.color}30`;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.color = item.active ? item.color : '#a1a1aa';
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
        position: 'relative',
        zIndex: 10
      }}>
        {/* Hero section */}
        <section style={{
          padding: '6rem 2rem 4rem',
          textAlign: 'center',
          maxWidth: '1400px',
          margin: '0 auto',
          animation: 'fadeInScale 1s ease-out'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '50px',
            marginBottom: '2rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#fbbf24'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: 'linear-gradient(45deg, #f59e0b, #d97706)',
              borderRadius: '50%',
              animation: 'glow 2s infinite'
            }} />
            Partner Resources
          </div>

          <h2 style={{
            fontSize: 'clamp(3rem, 7vw, 5rem)',
            fontWeight: '700',
            marginBottom: '2rem',
            lineHeight: '1.05',
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #ffffff 0%, #d4d4d8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Partner{' '}
            <span style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 25%, #b45309 50%, #92400e 100%)',
              backgroundSize: '400% 400%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradientFlow 8s ease-in-out infinite'
            }}>
              Documentation
            </span>
          </h2>

          <p style={{
            fontSize: 'clamp(1.125rem, 2vw, 1.375rem)',
            color: '#a1a1aa',
            maxWidth: '800px',
            margin: '0 auto 3rem',
            lineHeight: '1.6',
            fontWeight: '400'
          }}>
            Complete documentation, guides, and resources to help you succeed as a Candlefish AI partner
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '2rem',
            marginBottom: '4rem'
          }}>
            {[
              {
                title: 'Getting Started Guide',
                subtitle: 'Partner Onboarding',
                description: 'Step-by-step guide to get started as a Candlefish AI partner, from application to first integration.',
                icon: '🚀',
                color: '#f59e0b',
                sections: ['Account setup', 'API access', 'First integration', 'Testing environment'],
                readTime: '15 min',
                badge: 'Essential'
              },
              {
                title: 'API Integration',
                subtitle: 'Technical Documentation',
                description: 'Complete API reference, authentication guides, and integration examples for our partner API.',
                icon: '⚡',
                color: '#4f46e5',
                sections: ['Authentication', 'Endpoints', 'Code examples', 'Error handling'],
                readTime: '30 min',
                badge: 'Technical'
              },
              {
                title: 'Partner Portal',
                subtitle: 'Platform Guide',
                description: 'Learn how to use the partner portal for managing your account, tracking performance, and accessing resources.',
                icon: '📊',
                color: '#22c55e',
                sections: ['Dashboard overview', 'Performance metrics', 'Resource library', 'Support tickets'],
                readTime: '20 min',
                badge: 'Platform'
              },
              {
                title: 'Marketing Resources',
                subtitle: 'Co-Marketing Materials',
                description: 'Brand guidelines, marketing materials, and co-marketing templates for promoting our partnership.',
                icon: '📢',
                color: '#ec4899',
                sections: ['Brand guidelines', 'Logo assets', 'Marketing templates', 'Press releases'],
                readTime: '10 min',
                badge: 'Marketing'
              },
              {
                title: 'Sales Enablement',
                subtitle: 'Sales Resources',
                description: 'Sales training materials, competitive analysis, and customer success stories to help you sell effectively.',
                icon: '💼',
                color: '#8b5cf6',
                sections: ['Sales training', 'Competitive analysis', 'Case studies', 'Pricing guides'],
                readTime: '25 min',
                badge: 'Sales'
              },
              {
                title: 'Support & Training',
                subtitle: 'Learning Resources',
                description: 'Training programs, certification paths, and support resources to enhance your expertise.',
                icon: '🎓',
                color: '#06b6d4',
                sections: ['Training courses', 'Certification', 'Webinars', 'Knowledge base'],
                readTime: '60+ min',
                badge: 'Learning'
              }
            ].map((doc, i) => (
              <div key={i}
                className="doc-card"
                style={{
                  padding: '2.5rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  cursor: 'pointer',
                  animation: `slideInUp 0.6s ease-out ${i * 0.15}s both`,
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = doc.color;
                  e.currentTarget.style.boxShadow = `0 32px 64px rgba(0, 0, 0, 0.3), 0 0 0 1px ${doc.color}33`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: `linear-gradient(135deg, ${doc.color}20 0%, ${doc.color}40 100%)`,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    border: `1px solid ${doc.color}30`,
                    boxShadow: `0 8px 24px ${doc.color}15`
                  }}>{doc.icon}</div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{
                      color: doc.color,
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: `${doc.color}15`,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      border: `1px solid ${doc.color}30`
                    }}>{doc.badge}</span>

                    <span style={{
                      color: '#71717a',
                      fontSize: '0.75rem',
                      background: 'rgba(113, 113, 122, 0.1)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px'
                    }}>{doc.readTime}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    color: doc.color,
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>{doc.subtitle}</div>

                  <h3 style={{
                    color: '#ffffff',
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    marginBottom: '1rem',
                    letterSpacing: '-0.02em'
                  }}>{doc.title}</h3>
                </div>

                <p style={{
                  color: '#a1a1aa',
                  lineHeight: '1.6',
                  marginBottom: '2rem',
                  fontSize: '1rem'
                }}>{doc.description}</p>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${doc.color}20`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>What's Included</h4>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem'
                  }}>
                    {doc.sections.map((section, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#e4e4e7'
                      }}>
                        <div style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: doc.color,
                          flexShrink: 0
                        }} />
                        {section}
                      </div>
                    ))}
                  </div>
                </div>

                <button style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: `linear-gradient(135deg, ${doc.color}15, ${doc.color}25)`,
                  color: doc.color,
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: `1px solid ${doc.color}30`,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease'
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${doc.color}25, ${doc.color}35)`;
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${doc.color}15, ${doc.color}25)`;
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
                >
                  Access Documentation →
                </button>
              </div>
            ))}
          </div>

          {/* Quick access resources */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            marginBottom: '4rem'
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>Quick Access Resources</h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem'
            }}>
              {[
                {
                  title: 'Partner Portal Login',
                  description: 'Access your partner dashboard and resources',
                  icon: '🔐',
                  action: 'Login',
                  color: '#4f46e5'
                },
                {
                  title: 'API Documentation',
                  description: 'Complete API reference and examples',
                  icon: '📚',
                  action: 'View Docs',
                  color: '#22c55e'
                },
                {
                  title: 'Support Center',
                  description: 'Get help and submit support tickets',
                  icon: '🎧',
                  action: 'Get Help',
                  color: '#ec4899'
                },
                {
                  title: 'Training Portal',
                  description: 'Access courses and certification programs',
                  icon: '🎓',
                  action: 'Start Learning',
                  color: '#f59e0b'
                },
                {
                  title: 'Community Forum',
                  description: 'Connect with other partners and experts',
                  icon: '👥',
                  action: 'Join Discussion',
                  color: '#8b5cf6'
                },
                {
                  title: 'Resource Library',
                  description: 'Download marketing materials and assets',
                  icon: '📁',
                  action: 'Browse Library',
                  color: '#06b6d4'
                }
              ].map((resource, i) => (
                <div key={i} style={{
                  padding: '2rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${resource.color}20`,
                  borderRadius: '12px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  animation: `slideInUp 0.5s ease-out ${i * 0.1}s both`
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = resource.color;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 25px ${resource.color}20`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = `${resource.color}20`;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: `${resource.color}15`,
                    border: `1px solid ${resource.color}30`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    margin: '0 auto 1rem'
                  }}>{resource.icon}</div>

                  <h4 style={{
                    color: resource.color,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    marginBottom: '0.75rem'
                  }}>{resource.title}</h4>

                  <p style={{
                    color: '#a1a1aa',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    marginBottom: '1.5rem'
                  }}>{resource.description}</p>

                  <button style={{
                    padding: '0.5rem 1.25rem',
                    background: `${resource.color}15`,
                    color: resource.color,
                    fontWeight: '500',
                    borderRadius: '8px',
                    border: `1px solid ${resource.color}30`,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease'
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLElement).style.background = `${resource.color}25`;
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLElement).style.background = `${resource.color}15`;
                  }}
                  >
                    {resource.action}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ section */}
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '16px',
            marginBottom: '4rem'
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '1rem'
            }}>Need Help?</h3>

            <p style={{
              color: '#a1a1aa',
              marginBottom: '2rem',
              maxWidth: '600px',
              margin: '0 auto 2rem'
            }}>Can't find what you're looking for? Our support team is here to help</p>

            <div style={{
              display: 'flex',
              gap: '1.5rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                fontWeight: '600',
                borderRadius: '12px',
                border: 'none',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 20px 40px rgba(245, 158, 11, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 25px 50px rgba(245, 158, 11, 0.5)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 40px rgba(245, 158, 11, 0.4)';
              }}
              >
                Contact Support
              </button>

              <button style={{
                padding: '1rem 2rem',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontWeight: '600',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '1rem',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.08)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.2)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.1)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
              >
                Schedule Training
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '4rem 2rem 2rem',
        textAlign: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)',
        marginTop: '4rem'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <p style={{
            color: '#71717a',
            fontSize: '0.95rem',
            marginBottom: '1.5rem'
          }}>© 2025 Candlefish AI · Empowering partnerships that drive innovation</p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            {['Partner Agreement', 'Support Center', 'Case Studies', 'Contact'].map((item) => (
              <a key={item} href={`/${item.toLowerCase().replace(' ', '-')}`} style={{
                color: '#a1a1aa',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'color 0.3s ease'
              }}
              onMouseOver={(e) => (e.currentTarget as HTMLElement).style.color = '#ffffff'}
              onMouseOut={(e) => (e.currentTarget as HTMLElement).style.color = '#a1a1aa'}
              >{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
