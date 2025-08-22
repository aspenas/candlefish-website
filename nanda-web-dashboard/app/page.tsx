export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>NANDA</h1>
      <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Neural Autonomous Network of Distributed Agents</p>
      <div style={{
        padding: '2rem',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '1rem',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>System Status</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>✓ NANDA Dashboard: Online</li>
          <li>✓ Agent Registry: Connected</li>
          <li>✓ Paintbox Integration: Active</li>
          <li>✓ Consciousness Mesh: Operational</li>
        </ul>
      </div>
    </main>
  );
}
