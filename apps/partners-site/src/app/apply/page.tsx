'use client'

import { useState } from 'react'

export default function Apply() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    partnershipType: 'technology',
    companySize: '1-10',
    industry: '',
    description: '',
    experience: '',
    timeline: '1-3-months',
    revenue: '',
    agreeToTerms: false
  })

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target
    const { name, value, type } = target
    const checked = target instanceof HTMLInputElement ? target.checked : false
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000))
    setSubmitted(true)
    setIsSubmitting(false)
  }

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

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
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #ec4899;
          box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
        }
        .step-indicator {
          transition: all 0.3s ease;
        }
        .step-indicator.active {
          background: linear-gradient(135deg, #ec4899, #be185d);
          color: white;
        }
        .step-indicator.completed {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
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
              { name: 'Apply', href: '/apply', color: '#ec4899', active: true },
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

      {/* Application content */}
      <main style={{
        position: 'relative',
        zIndex: 10,
        padding: '4rem 2rem',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {submitted ? (
          // Success state
          <div style={{
            textAlign: 'center',
            animation: 'fadeInScale 1s ease-out'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              background: 'linear-gradient(135deg, #22c55e20 0%, #22c55e40 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              margin: '0 auto 2rem',
              border: '1px solid #22c55e30',
              animation: 'pulse 2s infinite'
            }}>✓</div>

            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#22c55e',
              marginBottom: '1rem'
            }}>Application Submitted!</h2>

            <p style={{
              color: '#a1a1aa',
              fontSize: '1.125rem',
              marginBottom: '2rem',
              maxWidth: '600px',
              margin: '0 auto 2rem'
            }}>
              Thank you for your interest in partnering with Candlefish AI. Our partnership team will review your application and get back to you within 48 hours.
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>What happens next?</h3>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                textAlign: 'left'
              }}>
                {[
                  { step: '1', text: 'Application review by our partnership team (24-48 hours)' },
                  { step: '2', text: 'Initial qualification call to discuss your needs' },
                  { step: '3', text: 'Partnership agreement and onboarding process' },
                  { step: '4', text: 'Access to partner resources and training materials' }
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      background: '#22c55e15',
                      border: '1px solid #22c55e30',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#22c55e',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>{item.step}</div>
                    <span style={{ color: '#e4e4e7', fontSize: '0.875rem' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button style={{
              padding: '1rem 2rem',
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
            onClick={() => window.location.href = '/'}
            >
              Return to Home
            </button>
          </div>
        ) : (
          // Application form
          <>
            {/* Hero section */}
            <section style={{
              textAlign: 'center',
              marginBottom: '3rem',
              animation: 'fadeInScale 1s ease-out'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(236, 72, 153, 0.1)',
                border: '1px solid rgba(236, 72, 153, 0.2)',
                borderRadius: '50px',
                marginBottom: '2rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#f472b6'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: 'linear-gradient(45deg, #ec4899, #be185d)',
                  borderRadius: '50%',
                  animation: 'glow 2s infinite'
                }} />
                Partner Application
              </div>

              <h2 style={{
                fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                fontWeight: '700',
                marginBottom: '1.5rem',
                lineHeight: '1.05',
                letterSpacing: '-0.04em',
                background: 'linear-gradient(135deg, #ffffff 0%, #d4d4d8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Join Our Partner Program
              </h2>

              <p style={{
                fontSize: 'clamp(1.125rem, 2vw, 1.25rem)',
                color: '#a1a1aa',
                maxWidth: '700px',
                margin: '0 auto',
                lineHeight: '1.6',
                fontWeight: '400'
              }}>
                Start your journey as a Candlefish AI partner and unlock new opportunities for growth
              </p>
            </section>

            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '3rem',
              gap: '1rem'
            }}>
              {[1, 2, 3].map((step) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    className={`step-indicator ${currentStep === step ? 'active' : currentStep > step ? 'completed' : ''}`}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      background: currentStep >= step ?
                        (currentStep === step ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'linear-gradient(135deg, #22c55e, #16a34a)') :
                        'rgba(255, 255, 255, 0.05)',
                      color: currentStep >= step ? 'white' : '#71717a',
                      border: currentStep >= step ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {currentStep > step ? '✓' : step}
                  </div>

                  {step < 3 && (
                    <div style={{
                      width: '60px',
                      height: '2px',
                      background: currentStep > step ?
                        'linear-gradient(90deg, #22c55e, #16a34a)' :
                        'rgba(255, 255, 255, 0.1)'
                    }} />
                  )}
                </div>
              ))}
            </div>

            {/* Step labels */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '6rem',
              marginBottom: '3rem',
              textAlign: 'center'
            }}>
              {[
                { label: 'Company Info', step: 1 },
                { label: 'Partnership Details', step: 2 },
                { label: 'Review & Submit', step: 3 }
              ].map((item) => (
                <div key={item.step} style={{
                  color: currentStep >= item.step ? '#ec4899' : '#71717a',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  {item.label}
                </div>
              ))}
            </div>

            {/* Application form */}
            <form onSubmit={handleSubmit} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '3rem',
              backdropFilter: 'blur(20px)'
            }}>
              {/* Step 1: Company Information */}
              {currentStep === 1 && (
                <div style={{ animation: 'slideInUp 0.5s ease-out' }}>
                  <h3 style={{
                    color: '#ec4899',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '2rem'
                  }}>Company Information</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        color: '#e4e4e7',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.75rem'
                      }}>
                        Company Name *
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        required
                        value={formData.companyName}
                        onChange={handleChange}
                        className="form-input"
                        style={{
                          width: '100%',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '1rem',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="Your company name"
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        color: '#e4e4e7',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.75rem'
                      }}>
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        name="contactName"
                        required
                        value={formData.contactName}
                        onChange={handleChange}
                        className="form-input"
                        style={{
                          width: '100%',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '1rem',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        color: '#e4e4e7',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.75rem'
                      }}>
                        Email Address *
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
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '1rem',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        color: '#e4e4e7',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.75rem'
                      }}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="form-input"
                        style={{
                          width: '100%',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '1rem',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        color: '#e4e4e7',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.75rem'
                      }}>
                        Company Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="form-input"
                        style={{
                          width: '100%',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '1rem',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="https://yourcompany.com"
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        color: '#e4e4e7',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.75rem'
                      }}>
                        Company Size *
                      </label>
                      <select
                        name="companySize"
                        required
                        value={formData.companySize}
                        onChange={handleChange}
                        className="form-select"
                        style={{
                          width: '100%',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '1rem',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-1000">201-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <label style={{
                      display: 'block',
                      color: '#e4e4e7',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.75rem'
                    }}>
                      Industry *
                    </label>
                    <input
                      type="text"
                      name="industry"
                      required
                      value={formData.industry}
                      onChange={handleChange}
                      className="form-input"
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease'
                      }}
                      placeholder="e.g., Technology, Healthcare, Finance, Retail"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Partnership Details */}
              {currentStep === 2 && (
                <div style={{ animation: 'slideInUp 0.5s ease-out' }}>
                  <h3 style={{
                    color: '#ec4899',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '2rem'
                  }}>Partnership Details</h3>

                  <div style={{ marginBottom: '2rem' }}>
                    <label style={{
                      display: 'block',
                      color: '#e4e4e7',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.75rem'
                    }}>
                      Partnership Type *
                    </label>
                    <select
                      name="partnershipType"
                      required
                      value={formData.partnershipType}
                      onChange={handleChange}
                      className="form-select"
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <option value="technology">Technology Partner</option>
                      <option value="solution">Solution Partner</option>
                      <option value="channel">Channel Partner</option>
                      <option value="integration">Integration Partner</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <label style={{
                      display: 'block',
                      color: '#e4e4e7',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.75rem'
                    }}>
                      Company Description *
                    </label>
                    <textarea
                      name="description"
                      required
                      rows={4}
                      value={formData.description}
                      onChange={handleChange}
                      className="form-textarea"
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease',
                        resize: 'vertical'
                      }}
                      placeholder="Describe your company, products/services, and target market..."
                    />
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <label style={{
                      display: 'block',
                      color: '#e4e4e7',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.75rem'
                    }}>
                      Relevant Experience *
                    </label>
                    <textarea
                      name="experience"
                      required
                      rows={4}
                      value={formData.experience}
                      onChange={handleChange}
                      className="form-textarea"
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        transition: 'all 0.3s ease',
                        resize: 'vertical'
                      }}
                      placeholder="Describe your experience with AI/ML, partnerships, or relevant technologies..."
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        color: '#e4e4e7',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.75rem'
                      }}>
                        Expected Timeline *
                      </label>
                      <select
                        name="timeline"
                        required
                        value={formData.timeline}
                        onChange={handleChange}
                        className="form-select"
                        style={{
                          width: '100%',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '1rem',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <option value="immediate">Immediate (within 30 days)</option>
                        <option value="1-3-months">1-3 months</option>
                        <option value="3-6-months">3-6 months</option>
                        <option value="6-12-months">6-12 months</option>
                        <option value="exploring">Just exploring</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        color: '#e4e4e7',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.75rem'
                      }}>
                        Expected Annual Revenue
                      </label>
                      <input
                        type="text"
                        name="revenue"
                        value={formData.revenue}
                        onChange={handleChange}
                        className="form-input"
                        style={{
                          width: '100%',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '1rem',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="e.g., $100K, $1M+ (optional)"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {currentStep === 3 && (
                <div style={{ animation: 'slideInUp 0.5s ease-out' }}>
                  <h3 style={{
                    color: '#ec4899',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '2rem'
                  }}>Review & Submit</h3>

                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '2rem',
                    marginBottom: '2rem'
                  }}>
                    <h4 style={{
                      color: '#ffffff',
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      marginBottom: '1.5rem'
                    }}>Application Summary</h4>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1.5rem',
                      marginBottom: '2rem'
                    }}>
                      <div>
                        <strong style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Company:</strong>
                        <div style={{ color: '#ffffff', marginTop: '0.25rem' }}>{formData.companyName || 'Not specified'}</div>
                      </div>
                      <div>
                        <strong style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Contact:</strong>
                        <div style={{ color: '#ffffff', marginTop: '0.25rem' }}>{formData.contactName || 'Not specified'}</div>
                      </div>
                      <div>
                        <strong style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Email:</strong>
                        <div style={{ color: '#ffffff', marginTop: '0.25rem' }}>{formData.email || 'Not specified'}</div>
                      </div>
                      <div>
                        <strong style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Partnership Type:</strong>
                        <div style={{ color: '#ffffff', marginTop: '0.25rem' }}>
                          {formData.partnershipType === 'technology' ? 'Technology Partner' :
                           formData.partnershipType === 'solution' ? 'Solution Partner' :
                           formData.partnershipType === 'channel' ? 'Channel Partner' :
                           'Integration Partner'}
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Company Size:</strong>
                        <div style={{ color: '#ffffff', marginTop: '0.25rem' }}>{formData.companySize} employees</div>
                      </div>
                      <div>
                        <strong style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Industry:</strong>
                        <div style={{ color: '#ffffff', marginTop: '0.25rem' }}>{formData.industry || 'Not specified'}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '2rem',
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px'
                  }}>
                    <input
                      type="checkbox"
                      id="agreeToTerms"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      required
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: '#ec4899'
                      }}
                    />
                    <label htmlFor="agreeToTerms" style={{
                      color: '#e4e4e7',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}>
                      I agree to the <span style={{ color: '#ec4899', textDecoration: 'underline' }}>Partner Terms and Conditions</span> and
                      <span style={{ color: '#ec4899', textDecoration: 'underline' }}> Privacy Policy</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '3rem',
                paddingTop: '2rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: currentStep === 1 ? 'rgba(113, 113, 122, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    color: currentStep === 1 ? '#71717a' : '#ffffff',
                    fontWeight: '500',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.875rem',
                    cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: currentStep === 1 ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (currentStep !== 1) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (currentStep !== 1) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                >
                  ← Previous
                </button>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #ec4899, #be185d)',
                      color: 'white',
                      fontWeight: '600',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.agreeToTerms}
                    style={{
                      padding: '0.75rem 2rem',
                      background: isSubmitting || !formData.agreeToTerms ?
                        'rgba(236, 72, 153, 0.5)' :
                        'linear-gradient(135deg, #ec4899, #be185d)',
                      color: 'white',
                      fontWeight: '600',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.875rem',
                      cursor: isSubmitting || !formData.agreeToTerms ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      opacity: isSubmitting || !formData.agreeToTerms ? 0.7 : 1
                    }}
                    onMouseOver={(e) => {
                      if (!isSubmitting && formData.agreeToTerms) {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.4)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSubmitting && formData.agreeToTerms) {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }
                    }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '2rem',
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
            fontSize: '0.95rem'
          }}>© 2025 Candlefish AI · Empowering partnerships that drive innovation</p>
        </div>
      </footer>
    </div>
  )
}
