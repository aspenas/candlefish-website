import React from 'react';
import ReactDOM from 'react-dom/client';

// Simple debug component to test if React is working
const DebugApp = () => {
  const [count, setCount] = React.useState(0);
  
  return (
    <div style={{ 
      padding: '20px', 
      background: '#0a0f1c', 
      color: '#fff',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ color: '#3b82f6' }}>🔧 Security Dashboard Debug Mode</h1>
      
      <div style={{ 
        background: '#1f2937', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>React Status: ✅ Working</h2>
        <p>Counter Test: {count}</p>
        <button 
          onClick={() => setCount(count + 1)}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Click Me ({count})
        </button>
      </div>
      
      <div style={{ 
        background: '#1f2937', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Environment Check:</h2>
        <ul>
          <li>Window: {typeof window !== 'undefined' ? '✅' : '❌'}</li>
          <li>Document: {typeof document !== 'undefined' ? '✅' : '❌'}</li>
          <li>React: {React ? '✅' : '❌'}</li>
          <li>ReactDOM: {ReactDOM ? '✅' : '❌'}</li>
        </ul>
      </div>
      
      <div style={{ 
        background: '#450a0a', 
        border: '2px solid #ef4444',
        padding: '20px', 
        borderRadius: '8px' 
      }}>
        <h2>⚠️ Debug Information:</h2>
        <p>If you see this page, React is working correctly.</p>
        <p>The issue is likely in the App component or its dependencies.</p>
        <p>Check the browser console for errors.</p>
      </div>
    </div>
  );
};

// Mount the debug app
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <DebugApp />
  </React.StrictMode>
);

// Remove loading screen
setTimeout(() => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
}, 100);

console.log('Debug app loaded successfully');