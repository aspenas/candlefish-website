'use client'

export default function Home() {
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
        @keyframes gradientFlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(79, 70, 229, 0.4); }
          50% { box-shadow: 0 0 40px rgba(79, 70, 229, 0.6), 0 0 60px rgba(168, 85, 247, 0.3); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .partner-card {
          position: relative;
          overflow: hidden;
        }
        .partner-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
          transition: left 0.6s ease;
        }
        .partner-card:hover::after {
          left: 100%;
        }
        .floating {
          animation: bounce 3s ease-in-out infinite;
        }
      `}</style>

      {/* Navigation with Vercel-style design */}
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
            {/* Logo with animated border */}
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
              { name: 'Apply', href: '/apply' },
              { name: 'Portal', href: '/portal' },
              { name: 'Resources', href: '/resources' }
            ].map((item, i) => (
              <a key={item.name} href={item.href} style={{
                color: '#a1a1aa',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#ffffff';
                (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#a1a1aa';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
              >{item.name}</a>
            ))}

            <button style={{
              padding: '0.5rem 1.25rem',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white',
              fontWeight: '500',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px) scale(1.02)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.4)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
            }}
            >
              Join Program
            </button>
          </div>
        </div>
      </nav>

      {/* Hero section with Vercel-style layout */}
      <main style={{
        position: 'relative',
        zIndex: 10
      }}>
        <section style={{
          padding: '8rem 2rem 6rem',
          textAlign: 'center',
          maxWidth: '1400px',
          margin: '0 auto',
          animation: 'fadeInScale 1s ease-out'
        }}>
          {/* Partnership badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(79, 70, 229, 0.1)',
            border: '1px solid rgba(79, 70, 229, 0.2)',
            borderRadius: '50px',
            marginBottom: '2rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#a78bfa'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: 'linear-gradient(45deg, #4f46e5, #7c3aed)',
              borderRadius: '50%',
              animation: 'glow 2s infinite'
            }} />
            Partner Program 2025
          </div>

          <h2 style={{
            fontSize: 'clamp(3.5rem, 8vw, 6rem)',
            fontWeight: '700',
            marginBottom: '2rem',
            lineHeight: '1.05',
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #ffffff 0%, #d4d4d8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Build the{' '}
            <span style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 25%, #ec4899 50%, #f59e0b 100%)',
              backgroundSize: '400% 400%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradientFlow 8s ease-in-out infinite'
            }}>
              future together
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
            Join our ecosystem of leading technology partners, solution providers, and innovators
            building the next generation of AI-powered applications
          </p>

          {/* Partnership types with floating animation */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
            marginBottom: '3rem'
          }}>
            {[
              { label: 'Technology', icon: '⚡' },
              { label: 'Solutions', icon: '🛠️' },
              { label: 'Channel', icon: '🌐' }
            ].map((type, i) => (
              <div key={type.label}
              className="floating"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '50px',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#e4e4e7',
                backdropFilter: 'blur(10px)',
                animationDelay: `${i * 0.2}s`
              }}>
                <span style={{ fontSize: '1rem' }}>{type.icon}</span>
                {type.label} Partner
              </div>
            ))}
          </div>

          {/* CTA buttons with Vercel styling */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #ffffff, #f4f4f5)',
              color: '#000000',
              fontWeight: '600',
              borderRadius: '10px',
              border: 'none',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative'
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 15px 40px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 30px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            }}
            >
              Become a Partner
            </button>

            <button style={{
              padding: '1rem 2rem',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontWeight: '600',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '1rem',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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
              View Partner Portal
            </button>
          </div>
        </section>

        {/* Partnership tiers with sophisticated cards */}
        <section style={{
          padding: '6rem 2rem',
          background: `
            linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.2) 50%, rgba(79, 70, 229, 0.05) 100%)
          `
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
                fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '1rem',
                letterSpacing: '-0.03em'
              }}>Partnership Tiers</h3>
              <p style={{
                fontSize: '1.125rem',
                color: '#a1a1aa',
                maxWidth: '600px',
                margin: '0 auto'
              }}>Choose the partnership level that aligns with your business goals</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '2rem'
            }}>
              {[
                {
                  tier: 'Silver',
                  title: 'Technology Partner',
                  description: 'Integrate your technology with our platform and reach new markets',
                  color: '#94a3b8',
                  benefits: ['API access', 'Co-marketing support', 'Technical documentation'],
                  price: 'Free to join'
                },
                {
                  tier: 'Gold',
                  title: 'Solution Partner',
                  description: 'Build and deliver complete solutions using our platform',
                  color: '#fbbf24',
                  benefits: ['Priority support', 'Sales enablement', 'Revenue sharing'],
                  price: 'Revenue share model',
                  featured: true
                },
                {
                  tier: 'Platinum',
                  title: 'Strategic Partner',
                  description: 'Deep collaboration for enterprise-scale deployments',
                  color: '#a855f7',
                  benefits: ['Dedicated support', 'Joint go-to-market', 'Custom integrations'],
                  price: 'Custom agreement'
                }
              ].map((partner, i) => (
                <div key={i}
                className="partner-card"
                style={{
                  padding: '2.5rem',
                  background: partner.featured
                    ? 'rgba(251, 191, 36, 0.05)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: partner.featured
                    ? '1px solid rgba(251, 191, 36, 0.2)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  animation: `slideInUp 0.6s ease-out ${i * 0.1}s both`,
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-12px) scale(1.02)';
                  e.currentTarget.style.borderColor = partner.color;
                  e.currentTarget.style.boxShadow = `0 40px 80px rgba(0, 0, 0, 0.3), 0 0 0 1px ${partner.color}33`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.borderColor = partner.featured
                    ? 'rgba(251, 191, 36, 0.2)'
                    : 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  {partner.featured && (
                    <div style={{
                      position: 'absolute',
                      top: '-1px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '0.375rem 1rem',
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                      color: '#000000',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      borderRadius: '0 0 8px 8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Most Popular
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: `linear-gradient(135deg, ${partner.color}20 0%, ${partner.color}40 100%)`,
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      border: `1px solid ${partner.color}30`,
                      boxShadow: `0 8px 24px ${partner.color}15`
                    }}>
                      {partner.tier === 'Silver' ? '🥈' : partner.tier === 'Gold' ? '🥇' : '💎'}
                    </div>

                    <div>
                      <div style={{
                        color: partner.color,
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem'
                      }}>{partner.tier} Tier</div>
                      <h4 style={{
                        color: '#ffffff',
                        fontSize: '1.375rem',
                        fontWeight: '700',
                        margin: 0,
                        letterSpacing: '-0.02em'
                      }}>{partner.title}</h4>
                    </div>
                  </div>

                  <p style={{
                    color: '#a1a1aa',
                    lineHeight: '1.6',
                    marginBottom: '2rem',
                    fontSize: '1rem'
                  }}>{partner.description}</p>

                  <div style={{ marginBottom: '2rem' }}>
                    <h5 style={{
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      marginBottom: '1rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Benefits</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {partner.benefits.map((benefit, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          fontSize: '0.95rem',
                          color: '#e4e4e7'
                        }}>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${partner.color}40, ${partner.color}60)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ color: '#ffffff', fontSize: '0.75rem' }}>✓</span>
                          </div>
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    padding: '1rem 0',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      color: '#a1a1aa',
                      fontSize: '0.875rem'
                    }}>{partner.price}</span>

                    <button style={{
                      padding: '0.5rem 1.25rem',
                      background: partner.featured
                        ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: partner.featured ? '#000000' : '#ffffff',
                      fontWeight: '600',
                      borderRadius: '8px',
                      border: partner.featured
                        ? 'none'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease'
                    }}
                    onMouseOver={(e) => {
                      if (partner.featured) {
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                      } else {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (partner.featured) {
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                      } else {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Partner success metrics */}
        <section style={{
          padding: '6rem 2rem',
          textAlign: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            <h3 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '3rem',
              letterSpacing: '-0.02em'
            }}>Partner Success</h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '3rem'
            }}>
              {[
                { number: '500+', label: 'Active Partners', color: '#4f46e5' },
                { number: '$10M+', label: 'Partner Revenue', color: '#22c55e' },
                { number: '50%', label: 'Average Growth', color: '#f59e0b' },
                { number: '98%', label: 'Satisfaction Rate', color: '#ec4899' }
              ].map((stat, i) => (
                <div key={i} style={{
                  animation: `fadeInScale 0.8s ease-out ${i * 0.1}s both`
                }}>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: '800',
                    background: `linear-gradient(135deg, ${stat.color}, ${stat.color}80)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.03em'
                  }}>{stat.number}</div>
                  <div style={{
                    color: '#a1a1aa',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Elegant footer */}
      <footer style={{
        padding: '4rem 2rem 2rem',
        textAlign: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* Contact CTA */}
          <div style={{
            marginBottom: '3rem',
            padding: '2rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)'
          }}>
            <h4 style={{
              color: '#ffffff',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1rem'
            }}>Ready to partner with us?</h4>
            <p style={{
              color: '#a1a1aa',
              marginBottom: '1.5rem'
            }}>Let's discuss how we can grow together</p>
            <button style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white',
              fontWeight: '600',
              borderRadius: '10px',
              border: 'none',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(79, 70, 229, 0.4)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(79, 70, 229, 0.3)';
            }}
            >
              Contact Partnership Team
            </button>
          </div>

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
