import React from 'react';

function App() {
  return (
    <div style={{ 
      padding: '40px', 
      background: '#0a0a0a', 
      color: '#fff', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif' 
    }}>
      <h1 style={{ color: '#1976d2' }}>🛡️ Security Dashboard</h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '40px' 
      }}>
        <div style={{ 
          background: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #333' 
        }}>
          <h3 style={{ color: '#2e7d32' }}>✅ Security Score</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>95%</div>
          <p>Excellent security posture</p>
        </div>

        <div style={{ 
          background: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #333' 
        }}>
          <h3 style={{ color: '#ff9800' }}>⚠️ Active Threats</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>3</div>
          <p>Medium priority alerts</p>
        </div>

        <div style={{ 
          background: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #333' 
        }}>
          <h3 style={{ color: '#d32f2f' }}>🔴 Vulnerabilities</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>0</div>
          <p>No critical vulnerabilities</p>
        </div>

        <div style={{ 
          background: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #333' 
        }}>
          <h3 style={{ color: '#1976d2' }}>📊 Compliance</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>100%</div>
          <p>NIST SP 800-53 compliant</p>
        </div>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: '#1a1a1a', borderRadius: '8px' }}>
        <h2>Dashboard Features</h2>
        <ul style={{ lineHeight: '2' }}>
          <li>✅ Real-time security monitoring</li>
          <li>✅ Vulnerability tracking & management</li>
          <li>✅ Compliance dashboard (NIST & ISO 27001)</li>
          <li>✅ Kong API Gateway monitoring</li>
          <li>✅ Alert management system</li>
          <li>✅ Asset inventory tracking</li>
          <li>✅ Security reports & analytics</li>
        </ul>
      </div>

      <p style={{ marginTop: '40px', color: '#666' }}>
        This is a simplified preview. The full dashboard includes GraphQL subscriptions, 
        real-time charts, and comprehensive security analytics.
      </p>
    </div>
  );
}

export default App;