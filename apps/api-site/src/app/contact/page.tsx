'use client'

import { useState } from 'react'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: 'general',
    message: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSubmitted(true)
    setIsSubmitting(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

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
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .form-input:focus {
          outline: none;
          border-color: #ec4899;
          box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
        }
        .form-textarea:focus {
          outline: none;
          border-color: #ec4899;
          box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
        }
        .form-select:focus {
          outline: none;
          border-color: #ec4899;
          box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
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
              { name: 'Partners', href: '/partners', color: '#a855f7' },
              { name: 'Contact', href: '/contact', color: '#ec4899', active: true }
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

      {/* Contact content */}
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
            Get in Touch
          </h2>

          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
            color: '#94a3b8',
            maxWidth: '700px',
            margin: '0 auto 3rem',
            lineHeight: '1.6',
            fontWeight: '400'
          }}>
            Have questions about our API? Need technical support? We're here to help you succeed.
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
            color: '#22c55e'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              background: '#22c55e',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
            Average response time: 2 hours
          </div>
        </section>

        {/* Contact form and info */}
        <section style={{
          padding: '2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '4rem'
          }}>
            {/* Contact form */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid rgba(30, 41, 59, 0.5)',
              borderRadius: '20px',
              padding: '3rem',
              backdropFilter: 'blur(20px) saturate(180%)'
            }}>
              {submitted ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, #22c55e20 0%, #22c55e40 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    margin: '0 auto 2rem',
                    border: '1px solid #22c55e30'
                  }}>✓</div>

                  <h3 style={{
                    color: '#22c55e',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '1rem'
                  }}>Message Sent!</h3>

                  <p style={{
                    color: '#94a3b8',
                    fontSize: '1rem'
                  }}>Thank you for reaching out. We'll get back to you within 2 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <h3 style={{
                    color: '#ec4899',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '2rem'
                  }}>Send us a message</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        color: '#cbd5e1',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem'
                      }}>
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="form-input"
                        style={{
                          width: '100%',
                          padding: '0.875rem',
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(51, 65, 85, 0.4)',
                          borderRadius: '8px',
                          color: '#f1f5f9',
                          fontSize: '1rem',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        color: '#cbd5e1',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem'
                      }}>
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="form-input"
                        style={{
                          width: '100%',
                          padding: '0.875rem',
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(51, 65, 85, 0.4)',
                          borderRadius: '8px',
                          color: '#f1f5f9',
                          fontSize: '1rem',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      color: '#cbd5e1',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem'
                    }}>
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="form-input"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid rgba(51, 65, 85, 0.4)',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease'
                      }}
                      placeholder="Your company (optional)"
                    />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      color: '#cbd5e1',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem'
                    }}>
                      Subject *
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="form-select"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid rgba(51, 65, 85, 0.4)',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="partnership">Partnership</option>
                      <option value="billing">Billing & Pricing</option>
                      <option value="feedback">Feedback</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <label style={{
                      display: 'block',
                      color: '#cbd5e1',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem'
                    }}>
                      Message *
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className="form-textarea"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid rgba(51, 65, 85, 0.4)',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease',
                        resize: 'vertical'
                      }}
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '1rem 2rem',
                      background: isSubmitting
                        ? 'rgba(236, 72, 153, 0.5)'
                        : 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
                      color: 'white',
                      fontWeight: '600',
                      borderRadius: '12px',
                      border: 'none',
                      fontSize: '1.1rem',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      boxShadow: isSubmitting
                        ? 'none'
                        : '0 20px 40px rgba(236, 72, 153, 0.4)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!isSubmitting) {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 25px 50px rgba(236, 72, 153, 0.5)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSubmitting) {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 40px rgba(236, 72, 153, 0.4)';
                      }
                    }}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>

            {/* Contact information */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem'
            }}>
              {/* Contact cards */}
              {[
                {
                  title: 'Sales & Partnerships',
                  icon: '💼',
                  email: 'sales@candlefish.ai',
                  description: 'Discuss enterprise solutions and partnership opportunities',
                  color: '#6366f1'
                },
                {
                  title: 'Technical Support',
                  icon: '🛠️',
                  email: 'support@candlefish.ai',
                  description: 'Get help with API integration and technical issues',
                  color: '#14b8a6'
                },
                {
                  title: 'General Inquiries',
                  icon: '💬',
                  email: 'hello@candlefish.ai',
                  description: 'Questions about our platform and services',
                  color: '#a855f7'
                }
              ].map((contact, i) => (
                <div key={i} style={{
                  padding: '2rem',
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(30, 41, 59, 0.5)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(20px)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = contact.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(30, 41, 59, 0.5)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: `linear-gradient(135deg, ${contact.color}20 0%, ${contact.color}40 100%)`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    marginBottom: '1rem',
                    border: `1px solid ${contact.color}30`
                  }}>{contact.icon}</div>

                  <h4 style={{
                    color: contact.color,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem'
                  }}>{contact.title}</h4>

                  <a href={`mailto:${contact.email}`} style={{
                    color: '#cbd5e1',
                    fontSize: '1rem',
                    fontWeight: '500',
                    textDecoration: 'none',
                    display: 'block',
                    marginBottom: '0.5rem'
                  }}
                  onMouseOver={(e) => (e.currentTarget as HTMLElement).style.color = contact.color}
                  onMouseOut={(e) => (e.currentTarget as HTMLElement).style.color = '#cbd5e1'}
                  >{contact.email}</a>

                  <p style={{
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>{contact.description}</p>
                </div>
              ))}

              {/* Status and hours */}
              <div style={{
                padding: '2rem',
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(30, 41, 59, 0.5)',
                borderRadius: '16px',
                backdropFilter: 'blur(20px)',
                textAlign: 'center'
              }}>
                <h4 style={{
                  color: '#f1f5f9',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  marginBottom: '1rem'
                }}>Support Hours</h4>

                <p style={{
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem'
                }}>Monday - Friday: 9:00 AM - 6:00 PM PST</p>

                <p style={{
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  marginBottom: '1rem'
                }}>Weekend: Emergency support only</p>

                <div style={{
                  display: 'inline-flex',
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
                  Currently online
                </div>
              </div>
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
        backdropFilter: 'blur(20px)',
        marginTop: '4rem'
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
