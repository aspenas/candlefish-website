import React from 'react';
import './styles/globals.css';

const AppMinimal: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      // Remove the HTML loading screen
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
      }
    }, 500);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-soc-background flex items-center justify-center">
        <div className="text-white text-xl">Loading Security Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-soc-background text-white">
      {/* Header */}
      <header className="bg-soc-surface border-b border-soc-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-security-400">
              🛡️ Security Dashboard
            </h1>
            <span className="px-3 py-1 bg-success-950/50 border border-success-500 rounded-full text-success-400 text-sm">
              System Operational
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Critical Alerts */}
          <div className="soc-card p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-muted">Critical Alerts</h3>
              <span className="text-2xl">🚨</span>
            </div>
            <div className="text-3xl font-bold text-critical-400">0</div>
            <p className="text-sm text-muted mt-2">No active critical alerts</p>
          </div>

          {/* Active Threats */}
          <div className="soc-card p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-muted">Active Threats</h3>
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="text-3xl font-bold text-warning-400">3</div>
            <p className="text-sm text-muted mt-2">↑ 2 from last hour</p>
          </div>

          {/* Security Score */}
          <div className="soc-card p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-muted">Security Score</h3>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-3xl font-bold text-success-400">98%</div>
            <p className="text-sm text-muted mt-2">Excellent protection</p>
          </div>

          {/* Systems Monitored */}
          <div className="soc-card p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-muted">Systems Monitored</h3>
              <span className="text-2xl">🖥️</span>
            </div>
            <div className="text-3xl font-bold text-info-400">247</div>
            <p className="text-sm text-muted mt-2">All systems online</p>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="soc-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Recent Security Events</h2>
          <div className="space-y-3">
            {[
              { time: '2 min ago', event: 'Successful login from trusted IP', type: 'info' },
              { time: '15 min ago', event: 'Firewall rule updated', type: 'warning' },
              { time: '1 hour ago', event: 'Security patch applied to server cluster', type: 'success' },
              { time: '2 hours ago', event: 'Suspicious activity blocked', type: 'critical' },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-4 p-3 rounded-lg bg-soc-elevated">
                <div className="mt-1">
                  {item.type === 'critical' && <span className="text-critical-400">⛔</span>}
                  {item.type === 'warning' && <span className="text-warning-400">⚠️</span>}
                  {item.type === 'success' && <span className="text-success-400">✅</span>}
                  {item.type === 'info' && <span className="text-info-400">ℹ️</span>}
                </div>
                <div className="flex-1">
                  <p className="text-white">{item.event}</p>
                  <p className="text-xs text-muted mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="soc-card p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Infrastructure Health</h2>
            <div className="space-y-3">
              {[
                { name: 'Web Servers', status: 'operational', load: 45 },
                { name: 'Database Cluster', status: 'operational', load: 62 },
                { name: 'API Gateway', status: 'operational', load: 38 },
                { name: 'CDN', status: 'operational', load: 71 },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-success-400 rounded-full animate-pulse"></span>
                    <span className="text-white">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-soc-elevated rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-security-500 rounded-full transition-all"
                        style={{ width: `${item.load}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-muted">{item.load}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="soc-card p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Compliance Status</h2>
            <div className="space-y-3">
              {[
                { name: 'SOC 2 Type II', status: 'Compliant', date: 'Certified Jan 2025' },
                { name: 'ISO 27001', status: 'Compliant', date: 'Renewed Dec 2024' },
                { name: 'GDPR', status: 'Compliant', date: 'Audit passed' },
                { name: 'HIPAA', status: 'Compliant', date: 'Review pending' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-soc-elevated">
                  <div>
                    <p className="text-white font-medium">{item.name}</p>
                    <p className="text-xs text-muted">{item.date}</p>
                  </div>
                  <span className="px-3 py-1 bg-success-950/50 border border-success-500 rounded-full text-success-400 text-xs">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 p-6 bg-soc-surface border-t border-soc-border">
        <div className="container mx-auto text-center text-sm text-muted">
          <p>© 2025 Candlefish Security Dashboard • Enterprise Security Monitoring</p>
          <p className="mt-2">🟢 All Systems Operational • Last Security Scan: {new Date().toLocaleString()}</p>
        </div>
      </footer>
    </div>
  );
};

export default AppMinimal;