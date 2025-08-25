'use client'

export default function Benefits() {
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
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes gradientFlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .benefit-card {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .benefit-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
          transition: left 0.6s ease;
        }
        .benefit-card:hover::after {
          left: 100%;
        }
        .benefit-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 32px 64px rgba(0, 0, 0, 0.3);
        }
        .floating-icon {
          animation: bounce 3s ease-in-out infinite;
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
              { name: 'Benefits', href: '/benefits', color: '#22c55e', active: true },
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

      {/* Benefits content */}
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
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '50px',
            marginBottom: '2rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#4ade80'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: 'linear-gradient(45deg, #22c55e, #16a34a)',
              borderRadius: '50%',
              animation: 'glow 2s infinite'
            }} />
            Partner Benefits
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
            Unlock Your{' '}
            <span style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 25%, #10b981 50%, #059669 100%)',
              backgroundSize: '400% 400%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradientFlow 8s ease-in-out infinite'
            }}>
              Growth Potential
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
            Discover the comprehensive benefits of partnering with Candlefish AI and accelerate your business growth
          </p>

          <div className="floating-icon" style={{
            fontSize: '4rem',
            marginBottom: '2rem',
            display: 'inline-block'
          }}>🚀</div>
        </section>

        {/* Core benefits */}
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
                title: 'Revenue Growth',
                subtitle: 'Accelerated Business Growth',
                description: 'Generate new revenue streams through our partner program with competitive margins and performance incentives.',
                icon: '💰',
                color: '#22c55e',
                metrics: [
                  { label: 'Average Revenue Increase', value: '150%' },
                  { label: 'Partner Margins', value: 'Up to 40%' },
                  { label: 'Time to First Sale', value: '30 days' }
                ],
                badge: 'High Impact'
              },
              {
                title: 'Technical Advantage',
                subtitle: 'Cutting-Edge Technology Access',
                description: 'Get early access to our latest AI technologies, APIs, and development tools before public release.',
                icon: '⚡',
                color: '#4f46e5',
                metrics: [
                  { label: 'Early Access', value: '30 days' },
                  { label: 'API Response Time', value: '<100ms' },
                  { label: 'Uptime SLA', value: '99.99%' }
                ],
                badge: 'Exclusive'
              },
              {
                title: 'Market Expansion',
                subtitle: 'Global Reach & Scale',
                description: 'Expand your market reach through our global network and joint go-to-market strategies.',
                icon: '🌐',
                color: '#ec4899',
                metrics: [
                  { label: 'Global Markets', value: '50+' },
                  { label: 'Partner Network', value: '500+' },
                  { label: 'Market Penetration', value: '+200%' }
                ],
                badge: 'Worldwide'
              },
              {
                title: 'Dedicated Support',
                subtitle: 'Premium Partner Experience',
                description: 'Receive priority technical support, dedicated account management, and comprehensive training programs.',
                icon: '🎯',
                color: '#f59e0b',
                metrics: [
                  { label: 'Response Time', value: '< 4 hours' },
                  { label: 'Success Manager', value: 'Dedicated' },
                  { label: 'Training Hours', value: '40+ hours' }
                ],
                badge: '24/7 Support'
              }
            ].map((benefit, i) => (
              <div key={i}
                className="benefit-card"
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
                  e.currentTarget.style.borderColor = benefit.color;
                  e.currentTarget.style.boxShadow = `0 32px 64px rgba(0, 0, 0, 0.3), 0 0 0 1px ${benefit.color}33`;
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
                  <div className="floating-icon" style={{
                    width: '60px',
                    height: '60px',
                    background: `linear-gradient(135deg, ${benefit.color}20 0%, ${benefit.color}40 100%)`,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    border: `1px solid ${benefit.color}30`,
                    boxShadow: `0 8px 24px ${benefit.color}15`,
                    animationDelay: `${i * 0.2}s`
                  }}>{benefit.icon}</div>

                  <span style={{
                    color: benefit.color,
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: `${benefit.color}15`,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    border: `1px solid ${benefit.color}30`
                  }}>{benefit.badge}</span>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    color: benefit.color,
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>{benefit.subtitle}</div>

                  <h3 style={{
                    color: '#ffffff',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '1rem',
                    letterSpacing: '-0.02em'
                  }}>{benefit.title}</h3>
                </div>

                <p style={{
                  color: '#a1a1aa',
                  lineHeight: '1.6',
                  marginBottom: '2rem',
                  fontSize: '1rem'
                }}>{benefit.description}</p>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${benefit.color}20`,
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h4 style={{
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Key Metrics</h4>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {benefit.metrics.map((metric, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '6px'
                      }}>
                        <span style={{
                          color: '#e4e4e7',
                          fontSize: '0.875rem'
                        }}>{metric.label}</span>
                        <span style={{
                          color: benefit.color,
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional benefits grid */}
          <div style={{
            marginBottom: '4rem'
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>Additional Partner Advantages</h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem'
            }}>
              {[
                {
                  icon: '🎓',
                  title: 'Training & Certification',
                  description: 'Comprehensive training programs and certification paths for your team',
                  benefits: ['Online courses', 'Certification exams', 'Expert-led workshops', 'Regular updates']
                },
                {
                  icon: '📈',
                  title: 'Marketing Support',
                  description: 'Co-marketing opportunities and marketing resource access',
                  benefits: ['Co-branded materials', 'Event sponsorship', 'PR opportunities', 'Lead sharing']
                },
                {
                  icon: '🔧',
                  title: 'Technical Resources',
                  description: 'Access to development tools, documentation, and technical expertise',
                  benefits: ['Developer tools', 'API documentation', 'Code samples', 'Sandbox access']
                },
                {
                  icon: '🤝',
                  title: 'Community Access',
                  description: 'Exclusive partner community and networking opportunities',
                  benefits: ['Partner forums', 'Networking events', 'Best practices', 'Peer support']
                },
                {
                  icon: '📊',
                  title: 'Business Intelligence',
                  description: 'Market insights, analytics, and business intelligence tools',
                  benefits: ['Market research', 'Performance analytics', 'Competitive analysis', 'Trend reports']
                },
                {
                  icon: '🏆',
                  title: 'Recognition Programs',
                  description: 'Partner awards and recognition for outstanding performance',
                  benefits: ['Annual awards', 'Case studies', 'Success stories', 'Public recognition']
                }
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '2rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  animation: `slideInUp 0.5s ease-out ${i * 0.1}s both`
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem'
                    }}>{item.icon}</div>

                    <h4 style={{
                      color: '#22c55e',
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      margin: 0
                    }}>{item.title}</h4>
                  </div>

                  <p style={{
                    color: '#a1a1aa',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    marginBottom: '1.5rem'
                  }}>{item.description}</p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem'
                  }}>
                    {item.benefits.map((benefit, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        color: '#e4e4e7'
                      }}>
                        <div style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: '#22c55e',
                          flexShrink: 0
                        }} />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROI Calculator */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            marginBottom: '4rem',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '1rem'
            }}>Partnership ROI</h3>

            <p style={{
              color: '#a1a1aa',
              marginBottom: '3rem',
              maxWidth: '600px',
              margin: '0 auto 3rem'
            }}>See the potential return on investment from our partnership program</p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2rem',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              {[
                {
                  period: 'Month 1-3',
                  roi: '125%',
                  revenue: '$50K+',
                  description: 'Initial partnership setup and first deals',
                  color: '#22c55e'
                },
                {
                  period: 'Month 4-6',
                  roi: '200%',
                  revenue: '$150K+',
                  description: 'Scaling operations and market expansion',
                  color: '#4f46e5'
                },
                {
                  period: 'Month 7-12',
                  roi: '350%',
                  revenue: '$500K+',
                  description: 'Full partnership benefits realized',
                  color: '#ec4899'
                }
              ].map((phase, i) => (
                <div key={i} style={{
                  padding: '2rem',
                  background: `${phase.color}05`,
                  border: `1px solid ${phase.color}20`,
                  borderRadius: '12px',
                  animation: `slideInUp 0.6s ease-out ${i * 0.2}s both`
                }}>
                  <div style={{
                    color: phase.color,
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem'
                  }}>{phase.period}</div>

                  <div style={{
                    fontSize: '2rem',
                    fontWeight: '800',
                    color: phase.color,
                    marginBottom: '0.5rem'
                  }}>{phase.roi}</div>

                  <div style={{
                    color: '#ffffff',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem'
                  }}>{phase.revenue}</div>

                  <p style={{
                    color: '#a1a1aa',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>{phase.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA section */}
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '20px'
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '1rem'
            }}>Ready to Maximize Your Benefits?</h3>

            <p style={{
              color: '#a1a1aa',
              marginBottom: '2rem',
              maxWidth: '600px',
              margin: '0 auto 2rem'
            }}>Join our partner program today and start realizing these benefits immediately</p>

            <div style={{
              display: 'flex',
              gap: '1.5rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button style={{
                padding: '1rem 2.5rem',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white',
                fontWeight: '600',
                borderRadius: '12px',
                border: 'none',
                fontSize: '1.1rem',
                cursor: 'pointer',
                boxShadow: '0 20px 40px rgba(34, 197, 94, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 25px 50px rgba(34, 197, 94, 0.5)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 40px rgba(34, 197, 94, 0.4)';
              }}
              >
                Start Partnership Application
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
                Schedule Consultation
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
