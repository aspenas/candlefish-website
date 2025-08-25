'use client'

export default function API() {
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
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .api-card {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .api-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
          transition: left 0.6s ease;
        }
        .api-card:hover::after {
          left: 100%;
        }
        .api-card:hover {
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
              { name: 'Documentation', href: '/documentation', color: '#f59e0b' },
              { name: 'API', href: '/api', color: '#8b5cf6', active: true }
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

      {/* API content */}
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
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '50px',
            marginBottom: '2rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#a78bfa'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
              borderRadius: '50%',
              animation: 'glow 2s infinite'
            }} />
            Partner API Access
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
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 25%, #6d28d9 50%, #5b21b6 100%)',
              backgroundSize: '400% 400%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradientFlow 8s ease-in-out infinite'
            }}>
              API Access
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
            Access our powerful Partner API to integrate Candlefish AI capabilities into your applications and workflows
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '50px',
            marginBottom: '2rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#4ade80'
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
        </section>

        {/* API sections */}
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
                title: 'Authentication',
                subtitle: 'Secure API Access',
                description: 'Get secure access to our API using OAuth 2.0 and JWT tokens with role-based permissions.',
                icon: '🔐',
                color: '#8b5cf6',
                features: ['OAuth 2.0 flow', 'JWT tokens', 'Role-based access', 'API key management'],
                endpoint: '/auth/token',
                badge: 'Essential'
              },
              {
                title: 'Partner Management',
                subtitle: 'Account Operations',
                description: 'Manage partner accounts, track usage, and access billing information through our Partner API.',
                icon: '👥',
                color: '#4f46e5',
                features: ['Account management', 'Usage tracking', 'Billing API', 'Performance metrics'],
                endpoint: '/partner/account',
                badge: 'Core'
              },
              {
                title: 'Integration APIs',
                subtitle: 'Technical Integration',
                description: 'Seamlessly integrate our AI capabilities into your applications with our comprehensive APIs.',
                icon: '⚡',
                color: '#22c55e',
                features: ['AI processing', 'Batch operations', 'Real-time API', 'Webhook support'],
                endpoint: '/integration/process',
                badge: 'Popular'
              },
              {
                title: 'Analytics & Reporting',
                subtitle: 'Business Intelligence',
                description: 'Access detailed analytics and reporting data to track your partnership performance.',
                icon: '📊',
                color: '#f59e0b',
                features: ['Usage analytics', 'Revenue reports', 'Performance metrics', 'Custom dashboards'],
                endpoint: '/analytics/reports',
                badge: 'Business'
              }
            ].map((api, i) => (
              <div key={i}
                className="api-card"
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
                  e.currentTarget.style.borderColor = api.color;
                  e.currentTarget.style.boxShadow = `0 32px 64px rgba(0, 0, 0, 0.3), 0 0 0 1px ${api.color}33`;
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
                    background: `linear-gradient(135deg, ${api.color}20 0%, ${api.color}40 100%)`,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    border: `1px solid ${api.color}30`,
                    boxShadow: `0 8px 24px ${api.color}15`
                  }}>{api.icon}</div>

                  <span style={{
                    color: api.color,
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: `${api.color}15`,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    border: `1px solid ${api.color}30`
                  }}>{api.badge}</span>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    color: api.color,
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>{api.subtitle}</div>

                  <h3 style={{
                    color: '#ffffff',
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    marginBottom: '1rem',
                    letterSpacing: '-0.02em'
                  }}>{api.title}</h3>
                </div>

                <p style={{
                  color: '#a1a1aa',
                  lineHeight: '1.6',
                  marginBottom: '2rem',
                  fontSize: '1rem'
                }}>{api.description}</p>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${api.color}20`,
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    color: '#71717a',
                    fontSize: '0.75rem',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Endpoint</div>

                  <div style={{
                    fontFamily: '"SF Mono", "Monaco", Consolas, monospace',
                    fontSize: '0.875rem',
                    color: api.color,
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: `1px solid ${api.color}20`
                  }}>
                    GET /api/v1{api.endpoint}
                  </div>
                </div>

                <div style={{
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>Key Features</h4>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem'
                  }}>
                    {api.features.map((feature, idx) => (
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
                          background: api.color,
                          flexShrink: 0
                        }} />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <button style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: `linear-gradient(135deg, ${api.color}15, ${api.color}25)`,
                  color: api.color,
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: `1px solid ${api.color}30`,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease'
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${api.color}25, ${api.color}35)`;
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${api.color}15, ${api.color}25)`;
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
                >
                  View API Documentation →
                </button>
              </div>
            ))}
          </div>

          {/* Interactive API explorer */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '20px',
            overflow: 'hidden',
            marginBottom: '4rem'
          }}>
            <div style={{
              padding: '2rem',
              borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{
                  color: '#8b5cf6',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem'
                }}>Interactive API Explorer</h3>
                <p style={{
                  color: '#a1a1aa',
                  fontSize: '1rem'
                }}>Test API endpoints with real-time examples and responses</p>
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
                Live Environment
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              minHeight: '400px'
            }}>
              {/* Request panel */}
              <div style={{
                padding: '2rem',
                borderRight: '1px solid rgba(139, 92, 246, 0.2)'
              }}>
                <div style={{
                  color: '#8b5cf6',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>API Request</div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      color: '#22c55e',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      background: 'rgba(34, 197, 94, 0.1)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px'
                    }}>GET</span>
                    <span style={{
                      fontFamily: '"SF Mono", "Monaco", Consolas, monospace',
                      fontSize: '0.875rem',
                      color: '#e2e8f0'
                    }}>/api/v1/partner/account</span>
                  </div>

                  <div style={{
                    color: '#71717a',
                    fontSize: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>Headers:</div>

                  <div style={{
                    fontFamily: '"SF Mono", "Monaco", Consolas, monospace',
                    fontSize: '0.75rem',
                    color: '#a1a1aa',
                    lineHeight: '1.4'
                  }}>
                    Authorization: Bearer eyJhbGciOiJSUzI1NiIs...<br/>
                    Content-Type: application/json<br/>
                    X-Partner-ID: your-partner-id
                  </div>
                </div>

                <button style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: 'white',
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  width: '100%'
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
                >
                  Send Request
                </button>
              </div>

              {/* Response panel */}
              <div style={{
                padding: '2rem'
              }}>
                <div style={{
                  color: '#22c55e',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>API Response</div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '8px',
                  padding: '1rem',
                  height: '300px',
                  overflow: 'auto'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      color: '#22c55e',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>200 OK</span>
                    <span style={{
                      color: '#71717a',
                      fontSize: '0.75rem'
                    }}>• 145ms</span>
                  </div>

                  <div style={{
                    fontFamily: '"SF Mono", "Monaco", Consolas, monospace',
                    fontSize: '0.75rem',
                    lineHeight: '1.6',
                    color: '#e2e8f0'
                  }}>
                    <div style={{ color: '#64748b' }}>{`{`}</div>
                    <div style={{ color: '#8b5cf6', marginLeft: '1rem' }}>"status": "success",</div>
                    <div style={{ color: '#8b5cf6', marginLeft: '1rem' }}>"data": {`{`}</div>
                    <div style={{ color: '#22c55e', marginLeft: '2rem' }}>"partnerId": "partner_123",</div>
                    <div style={{ color: '#22c55e', marginLeft: '2rem' }}>"companyName": "Acme Corp",</div>
                    <div style={{ color: '#22c55e', marginLeft: '2rem' }}>"tier": "Gold",</div>
                    <div style={{ color: '#22c55e', marginLeft: '2rem' }}>"status": "active",</div>
                    <div style={{ color: '#f59e0b', marginLeft: '2rem' }}>"usage": {`{`}</div>
                    <div style={{ color: '#ec4899', marginLeft: '3rem' }}>"apiCalls": 15847,</div>
                    <div style={{ color: '#ec4899', marginLeft: '3rem' }}>"dataProcessed": "2.4GB",</div>
                    <div style={{ color: '#ec4899', marginLeft: '3rem' }}>"billingCycle": "monthly"</div>
                    <div style={{ color: '#f59e0b', marginLeft: '2rem' }}>{`},`}</div>
                    <div style={{ color: '#22c55e', marginLeft: '2rem' }}>"lastActive": "2025-01-15T10:30:00Z"</div>
                    <div style={{ color: '#8b5cf6', marginLeft: '1rem' }}>{`},`}</div>
                    <div style={{ color: '#8b5cf6', marginLeft: '1rem' }}>"timestamp": "2025-01-15T14:22:30Z"</div>
                    <div style={{ color: '#64748b' }}>{`}`}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API resources */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minMax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '4rem'
          }}>
            {[
              {
                title: 'API Documentation',
                description: 'Complete API reference with examples',
                icon: '📚',
                color: '#8b5cf6',
                action: 'View Docs'
              },
              {
                title: 'SDKs & Libraries',
                description: 'Official SDKs for popular languages',
                icon: '🛠️',
                color: '#4f46e5',
                action: 'Download SDKs'
              },
              {
                title: 'Postman Collection',
                description: 'Ready-to-use Postman collection',
                icon: '📮',
                color: '#f59e0b',
                action: 'Import Collection'
              },
              {
                title: 'Code Examples',
                description: 'Sample code and tutorials',
                icon: '💻',
                color: '#22c55e',
                action: 'Browse Examples'
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

          {/* Getting started */}
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '20px'
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '1rem'
            }}>Ready to Get Started?</h3>

            <p style={{
              color: '#a1a1aa',
              marginBottom: '2rem',
              maxWidth: '600px',
              margin: '0 auto 2rem'
            }}>Get API access and start integrating our powerful AI capabilities into your applications</p>

            <div style={{
              display: 'flex',
              gap: '1.5rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button style={{
                padding: '1rem 2.5rem',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: 'white',
                fontWeight: '600',
                borderRadius: '12px',
                border: 'none',
                fontSize: '1.1rem',
                cursor: 'pointer',
                boxShadow: '0 20px 40px rgba(139, 92, 246, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 25px 50px rgba(139, 92, 246, 0.5)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 40px rgba(139, 92, 246, 0.4)';
              }}
              >
                Get API Access
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
                Contact Support
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
