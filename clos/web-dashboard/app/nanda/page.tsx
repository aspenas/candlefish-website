'use client';

import { useEffect, useState } from 'react';

interface Service {
  id: string;
  name: string;
  port: number;
  status: string;
  last_health_check?: string;
}

interface Decision {
  id: string;
  type: string;
  target: string;
  action: string;
  confidence: number;
  reasoning: string;
  result?: string;
  executed: boolean;
  timestamp: string;
}

interface NANDAState {
  mode: string;
  health: string;
  metrics: {
    decisions_made: number;
    success_rate: number;
  };
  active_decisions: Decision[];
}

export default function NANDADashboard() {
  const [state, setState] = useState<NANDAState | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch NANDA state
        const stateRes = await fetch('http://localhost:5100/state');
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          setState(stateData);
        }

        // Fetch services
        const servicesRes = await fetch('http://localhost:5100/services');
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          setServices(servicesData);
        }

        // Fetch health
        const healthRes = await fetch('http://localhost:5100/health');
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setHealth(healthData);
        }

        setConnectionStatus('connected');
        setError(null);
      } catch (err) {
        console.error('Error fetching NANDA data:', err);
        setConnectionStatus('disconnected');
        setError('Failed to connect to NANDA orchestrator');
      }
    };

    // Initial fetch
    fetchData();

    // Refresh every 2 seconds
    const interval = setInterval(fetchData, 2000);

    return () => clearInterval(interval);
  }, []);

  const setMode = async (mode: string) => {
    try {
      const res = await fetch('http://localhost:5100/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && state) {
          setState({ ...state, mode });
        }
      }
    } catch (err) {
      console.error('Error setting mode:', err);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-indigo-600 to-purple-700 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-2xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            🧠 NANDA Orchestrator Dashboard
          </h1>
          
          <div className="flex flex-wrap gap-4">
            <div className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-400 to-cyan-500 text-white">
              <strong>Mode:</strong> <span className="ml-2">{state?.mode?.toUpperCase() || 'Loading...'}</span>
            </div>
            <div className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-400 to-yellow-400 text-white">
              <strong>Health:</strong> <span className="ml-2">{state?.health?.toUpperCase() || 'Loading...'}</span>
            </div>
            <div className="px-6 py-3 rounded-lg bg-white shadow-md">
              <strong>Uptime:</strong> <span className="ml-2">{health ? formatUptime(health.uptime) : 'Loading...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics and Control Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Metrics Card */}
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">📊 Metrics</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {state?.metrics?.decisions_made || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Decisions Made</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {state ? Math.round(state.metrics.success_rate * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {state?.active_decisions?.length || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Active</div>
            </div>
          </div>
        </div>

        {/* Control Card */}
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">🎮 Control</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setMode('autonomous')}
              className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              Autonomous
            </button>
            <button
              onClick={() => setMode('supervised')}
              className="flex-1 px-4 py-3 rounded-lg bg-gray-600 text-white font-medium hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              Supervised
            </button>
            <button
              onClick={() => setMode('learning')}
              className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-green-400 to-cyan-500 text-white font-medium hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              Learning
            </button>
          </div>
        </div>
      </div>

      {/* Services and Decisions Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Card */}
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            🚀 Services ({services.length})
          </h2>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {services.length > 0 ? (
              services.map((service) => (
                <div
                  key={service.id}
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-800">{service.name}</div>
                    <div className="text-sm text-gray-500">Port: {service.port}</div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      service.status === 'running'
                        ? 'bg-green-100 text-green-800'
                        : service.status === 'starting'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {service.status.toUpperCase()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No services registered</div>
            )}
          </div>
        </div>

        {/* Recent Decisions Card */}
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">🤖 Recent Decisions</h2>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {state?.active_decisions && state.active_decisions.length > 0 ? (
              state.active_decisions.slice(-10).reverse().map((decision) => (
                <div
                  key={decision.id}
                  className="p-3 border-l-4 border-indigo-500 bg-gray-50 rounded"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-800">
                      {decision.type.toUpperCase()}: {decision.action}
                    </span>
                    <span className="text-sm font-medium text-indigo-600">
                      {Math.round(decision.confidence * 100)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">{decision.reasoning}</div>
                  {decision.result && (
                    <div className="text-xs text-gray-500 mt-1">{decision.result}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500">No recent decisions</div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="fixed bottom-6 right-6">
        <div
          className={`px-4 py-2 rounded-full font-medium shadow-lg ${
            connectionStatus === 'connected'
              ? 'bg-green-500 text-white'
              : connectionStatus === 'connecting'
              ? 'bg-yellow-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {connectionStatus === 'connected' && '🟢 Connected'}
          {connectionStatus === 'connecting' && '🟡 Connecting...'}
          {connectionStatus === 'disconnected' && '🔴 Disconnected'}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed top-6 right-6 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}