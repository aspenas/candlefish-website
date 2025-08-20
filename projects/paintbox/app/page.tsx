// Server component - no 'use client'

import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f3f4f6',
      minHeight: '100vh',
      color: '#111827'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '3rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#8b5cf6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            🎨
          </div>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              margin: 0,
              color: '#111827'
            }}>
              Paintbox Application
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: '#6b7280',
              margin: '0.5rem 0 0 0'
            }}>
              Professional painting estimates — calm, precise, and fast
            </p>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '2rem',
          marginTop: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#111827'
          }}>
            Quick Actions
          </h2>
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <Link href="/estimate/new" style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}>
              ➕ Create New Estimate
            </Link>
            <Link href="/estimate/new/details" style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}>
              📝 Estimate Details
            </Link>
            <Link href="/estimate/new/exterior" style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#06b6d4',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}>
              🏠 Exterior Estimate
            </Link>
            <Link href="/estimate/new/interior" style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}>
              🏡 Interior Estimate
            </Link>
            <Link href="/api/health" style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}>
              ✅ Health Status
            </Link>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginTop: '3rem'
        }}>
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#111827'
            }}>
              📊 Features
            </h3>
            <ul style={{
              margin: 0,
              paddingLeft: '1.25rem',
              color: '#6b7280',
              lineHeight: '1.75'
            }}>
              <li>Excel formula compatibility</li>
              <li>Offline-first architecture</li>
              <li>Real-time calculations</li>
              <li>Salesforce integration</li>
              <li>Company Cam photos</li>
            </ul>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#111827'
            }}>
              🔧 System Status
            </h3>
            <div style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              lineHeight: '1.75'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Version:</span>
                <span style={{ fontWeight: '500' }}>1.0.0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Environment:</span>
                <span style={{ fontWeight: '500' }}>Production</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Status:</span>
                <span style={{ color: '#10b981', fontWeight: '500' }}>✓ Operational</span>
              </div>
            </div>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#111827'
            }}>
              📱 Deployment
            </h3>
            <div style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              lineHeight: '1.75'
            }}>
              <div style={{ marginBottom: '0.25rem' }}>
                Platform: <strong>Fly.io</strong>
              </div>
              <div style={{ marginBottom: '0.25rem' }}>
                Region: <strong>US East</strong>
              </div>
              <div>
                URL: <a href="https://paintbox.candlefish.ai" style={{ color: '#8b5cf6', textDecoration: 'none' }}>paintbox.candlefish.ai</a>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '3rem',
          padding: '1rem',
          backgroundColor: '#fef3c7',
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: '#92400e',
          border: '1px solid #fde68a'
        }}>
          <strong>Note:</strong> This is the production deployment of Paintbox. All estimate calculations are performed in real-time with Excel-level precision.
        </div>
      </div>
    </div>
  );
}
