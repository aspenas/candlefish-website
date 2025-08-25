'use client'

export default function Solutions() {
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
        .solution-card {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .solution-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
          transition: left 0.6s ease;
        }
        .solution-card:hover::after {
          left: 100%;
        }
        .solution-card:hover {
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
              { name: 'Solutions', href: '/solutions', color: '#4f46e5', active: true },
              { name: 'Benefits', href: '/benefits', color: '#22c55e' },
              { name: 'Apply', href: '/apply', color: '#ec4899' },
              { name: 'Documentation', href: '/documentation', color: '#f59e0b' },
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

      {/* Solutions content */}
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
            Partner Solutions
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
            Comprehensive{' '}
            <span style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 25%, #ec4899 50%, #f59e0b 100%)',
              backgroundSize: '400% 400%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradientFlow 8s ease-in-out infinite'
            }}>
              Solutions
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
            Explore our partner solutions designed to accelerate your business growth and enhance customer experiences
          </p>
        </section>

        {/* Solution categories */}
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
                category: 'Enterprise Integration',
                title: 'Seamless System Integration',
                description: 'Connect your existing enterprise systems with our AI platform through robust APIs and enterprise-grade connectors.',
                icon: '🔗',
                color: '#4f46e5',
                features: ['SSO Integration', 'Data Synchronization', 'Legacy System Support', 'Custom Middleware'],
                industries: ['Healthcare', 'Finance', 'Manufacturing', 'Retail'],
                badge: 'Most Popular'
              },
              {
                category: 'Industry Solutions',
                title: 'Vertical-Specific Applications',
                description: 'Purpose-built solutions tailored for specific industries with deep domain expertise and regulatory compliance.',
                icon: '🏢',
                color: '#22c55e',
                features: ['Industry Templates', 'Compliance Framework', 'Regulatory Reporting', 'Sector Expertise'],
                industries: ['Legal', 'Healthcare', 'Education', 'Government'],
                badge: 'Certified'
              },
              {
                category: 'Custom Development',
                title: 'Bespoke AI Solutions',
                description: 'Fully customized AI applications built to your exact specifications with dedicated development teams.',
                icon: '⚙️',
                color: '#ec4899',
                features: ['Custom AI Models', 'Dedicated Teams', 'Agile Development', 'Full Ownership'],
                industries: ['All Industries', 'Custom Requirements', 'Specialized Needs', 'Enterprise'],
                badge: 'Premium'
              }
            ].map((solution, i) => (
              <div key={i}
                className="solution-card"
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
                  e.currentTarget.style.borderColor = solution.color;
                  e.currentTarget.style.boxShadow = `0 32px 64px rgba(0, 0, 0, 0.3), 0 0 0 1px ${solution.color}33`;
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
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: `linear-gradient(135deg, ${solution.color}20 0%, ${solution.color}40 100%)`,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    border: `1px solid ${solution.color}30`,
                    boxShadow: `0 8px 24px ${solution.color}15`
                  }}>{solution.icon}</div>

                  <span style={{
                    color: solution.color,
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: `${solution.color}15`,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    border: `1px solid ${solution.color}30`
                  }}>{solution.badge}</span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    color: solution.color,
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>{solution.category}</div>

                  <h3 style={{
                    color: '#ffffff',
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    marginBottom: '1rem',
                    letterSpacing: '-0.02em'
                  }}>{solution.title}</h3>
                </div>

                <p style={{
                  color: '#a1a1aa',
                  lineHeight: '1.6',
                  marginBottom: '2rem',
                  fontSize: '1rem'
                }}>{solution.description}</p>

                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Key Features</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {solution.features.map((feature, idx) => (
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
                          background: solution.color,
                          flexShrink: 0
                        }} />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Target Industries</h4>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    {solution.industries.map((industry, idx) => (
                      <span key={idx} style={{
                        color: '#a1a1aa',
                        fontSize: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        {industry}
                      </span>
                    ))}
                  </div>
                </div>

                <button style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: `linear-gradient(135deg, ${solution.color}15, ${solution.color}25)`,
                  color: solution.color,
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: `1px solid ${solution.color}30`,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease'
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${solution.color}25, ${solution.color}35)`;
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${solution.color}15, ${solution.color}25)`;
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
                >
                  Learn More →
                </button>
              </div>
            ))}
          </div>

          {/* Implementation process */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            marginBottom: '4rem',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>Implementation Process</h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem'
            }}>
              {[
                {
                  step: '01',
                  title: 'Discovery & Analysis',
                  description: 'We analyze your current systems, requirements, and goals to design the optimal solution',
                  color: '#4f46e5',
                  duration: '1-2 weeks'
                },
                {
                  step: '02',
                  title: 'Solution Design',
                  description: 'Create detailed architecture and implementation plan with clear milestones and deliverables',
                  color: '#22c55e',
                  duration: '1-3 weeks'
                },
                {
                  step: '03',
                  title: 'Development & Integration',
                  description: 'Build and integrate the solution with rigorous testing and quality assurance',
                  color: '#ec4899',
                  duration: '4-12 weeks'
                },
                {
                  step: '04',
                  title: 'Deployment & Support',
                  description: 'Deploy to production with comprehensive training and ongoing support',
                  color: '#f59e0b',
                  duration: 'Ongoing'
                }
              ].map((process, i) => (
                <div key={i} style={{
                  padding: '2rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${process.color}20`,
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
                    color: '#a1a1aa',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    marginBottom: '1rem'
                  }}>{process.description}</p>

                  <div style={{
                    color: '#71717a',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    background: 'rgba(113, 113, 122, 0.1)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    display: 'inline-block'
                  }}>
                    Duration: {process.duration}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Success metrics */}
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
              marginBottom: '3rem'
            }}>Solution Impact</h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '3rem',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              {[
                { number: '95%', label: 'Implementation Success Rate', color: '#22c55e' },
                { number: '40%', label: 'Average Time Savings', color: '#4f46e5' },
                { number: '60%', label: 'Cost Reduction', color: '#f59e0b' },
                { number: '24/7', label: 'Support Coverage', color: '#ec4899' }
              ].map((stat, i) => (
                <div key={i} style={{
                  animation: `fadeInScale 0.8s ease-out ${i * 0.1}s both`
                }}>
                  <div style={{
                    fontSize: '2.5rem',
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

          {/* CTA section */}
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
            border: '1px solid rgba(79, 70, 229, 0.2)',
            borderRadius: '20px'
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '1rem'
            }}>Ready to Transform Your Business?</h3>

            <p style={{
              color: '#a1a1aa',
              marginBottom: '2rem',
              maxWidth: '600px',
              margin: '0 auto 2rem'
            }}>Let's discuss how our solutions can accelerate your growth and enhance your competitive advantage</p>

            <div style={{
              display: 'flex',
              gap: '1.5rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button style={{
                padding: '1rem 2.5rem',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: 'white',
                fontWeight: '600',
                borderRadius: '12px',
                border: 'none',
                fontSize: '1.1rem',
                cursor: 'pointer',
                boxShadow: '0 20px 40px rgba(79, 70, 229, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 25px 50px rgba(79, 70, 229, 0.5)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 40px rgba(79, 70, 229, 0.4)';
              }}
              >
                Schedule Consultation
              </button>

              <button style={{
                padding: '1rem 2.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontWeight: '600',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '1.1rem',
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
                View Case Studies
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
