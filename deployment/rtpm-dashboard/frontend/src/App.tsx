import React, { useEffect, useState } from 'react';
import './App.css';
import { api } from './services/api';
import { WebSocketService } from './services/websocket';

// Import panels
import { InfrastructureStatusPanel } from './components/panels/InfrastructureStatusPanel';
import { KubernetesPanel } from './components/panels/KubernetesPanel';
import { DNSManagementPanel } from './components/panels/DNSManagementPanel';
import { ValidationResultsPanel } from './components/panels/ValidationResultsPanel';

function App() {
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [activePanel, setActivePanel] = useState('infrastructure');

  useEffect(() => {
    // Initialize WebSocket connection
    const ws = new WebSocketService('ws://localhost:8000/ws/metrics');

    ws.onMessage((data) => {
      if (data.type === 'metric') {
        setMetrics(prev => [...prev.slice(-99), data.payload]);
      }
    });

    ws.connect();
    setConnected(true);

    return () => {
      ws.disconnect();
    };
  }, []);

  const panels = {
    infrastructure: <InfrastructureStatusPanel />,
    kubernetes: <KubernetesPanel />,
    dns: <DNSManagementPanel />,
    validation: <ValidationResultsPanel />
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Real-time Performance Monitoring Dashboard</h1>
        <div className="connection-status">
          Status: <span className={connected ? 'connected' : 'disconnected'}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </header>

      <nav className="panel-nav">
        <button
          className={activePanel === 'infrastructure' ? 'active' : ''}
          onClick={() => setActivePanel('infrastructure')}
        >
          Infrastructure
        </button>
        <button
          className={activePanel === 'kubernetes' ? 'active' : ''}
          onClick={() => setActivePanel('kubernetes')}
        >
          Kubernetes
        </button>
        <button
          className={activePanel === 'dns' ? 'active' : ''}
          onClick={() => setActivePanel('dns')}
        >
          DNS
        </button>
        <button
          className={activePanel === 'validation' ? 'active' : ''}
          onClick={() => setActivePanel('validation')}
        >
          Validation
        </button>
      </nav>

      <main className="main-content">
        <div className="metrics-summary">
          <div className="metric-card">
            <h3>Total Metrics</h3>
            <p className="metric-value">{metrics.length}</p>
          </div>
          <div className="metric-card">
            <h3>Last Update</h3>
            <p className="metric-value">
              {metrics.length > 0
                ? new Date(metrics[metrics.length - 1].timestamp).toLocaleTimeString()
                : 'No data'}
            </p>
          </div>
        </div>

        <div className="panel-container">
          {panels[activePanel as keyof typeof panels]}
        </div>

        {metrics.length > 0 && (
          <div className="recent-metrics">
            <h2>Recent Metrics</h2>
            <div className="metrics-list">
              {metrics.slice(-10).reverse().map((metric, idx) => (
                <div key={idx} className="metric-item">
                  <span className="metric-name">{metric.name}</span>
                  <span className="metric-value">{metric.value}</span>
                  <span className="metric-time">
                    {new Date(metric.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>RTPM Dashboard v1.0.0 | © 2025 Candlefish AI</p>
      </footer>
    </div>
  );
}

export default App;
