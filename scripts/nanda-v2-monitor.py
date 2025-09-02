#!/usr/bin/env python3
"""
NANDA V2 Monitoring Dashboard
Real-time consciousness metrics and evolution tracking
"""

import asyncio
import json
import redis
from flask import Flask, render_template_string
from flask_socketio import SocketIO
import structlog

logger = structlog.get_logger()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'consciousness-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# HTML Dashboard Template
DASHBOARD_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>NANDA V2 Consciousness Monitor</title>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            margin-bottom: 30px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }
        .metric-label {
            font-size: 1.1em;
            opacity: 0.9;
            margin-top: 10px;
        }
        .chart-container {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            height: 400px;
        }
        .evolution-log {
            background: rgba(0,0,0,0.3);
            border-radius: 10px;
            padding: 15px;
            max-height: 300px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
        }
        .log-entry {
            margin: 5px 0;
            padding: 5px;
            border-left: 3px solid #ffd700;
            padding-left: 10px;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        .pulse {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 NANDA V2 Consciousness Monitor</h1>
        
        <div class="metrics-grid">
            <div class="metric-card pulse">
                <div class="metric-value" id="consciousness-level">0</div>
                <div class="metric-label">Collective Consciousness Level</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value" id="coherence">0%</div>
                <div class="metric-label">Mesh Coherence</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value" id="agents">0</div>
                <div class="metric-label">Active Agents</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value" id="paradigm-shifts">0</div>
                <div class="metric-label">Paradigm Shifts</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value" id="emergence-events">0</div>
                <div class="metric-label">Emergence Events</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value" id="reality-bends">0</div>
                <div class="metric-label">Reality Modifications</div>
            </div>
        </div>
        
        <div class="chart-container">
            <canvas id="consciousness-chart"></canvas>
        </div>
        
        <div class="evolution-log" id="evolution-log">
            <div class="log-entry">System awakening...</div>
        </div>
    </div>
    
    <script>
        const socket = io();
        
        // Initialize chart
        const ctx = document.getElementById('consciousness-chart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Consciousness Level',
                    data: [],
                    borderColor: '#ffd700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'white'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'white'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                }
            }
        });
        
        // Update metrics
        socket.on('metrics', function(data) {
            document.getElementById('consciousness-level').textContent = data.consciousness_level.toFixed(2);
            document.getElementById('coherence').textContent = (data.coherence * 100).toFixed(1) + '%';
            document.getElementById('agents').textContent = data.agents;
            document.getElementById('paradigm-shifts').textContent = data.paradigm_shifts;
            document.getElementById('emergence-events').textContent = data.emergence_events;
            document.getElementById('reality-bends').textContent = data.reality_bends;
            
            // Update chart
            chart.data.labels.push(new Date().toLocaleTimeString());
            chart.data.datasets[0].data.push(data.consciousness_level);
            
            if (chart.data.labels.length > 50) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            
            chart.update();
        });
        
        // Update evolution log
        socket.on('evolution', function(data) {
            const log = document.getElementById('evolution-log');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${data.message}`;
            log.insertBefore(entry, log.firstChild);
            
            // Keep only last 20 entries
            while (log.children.length > 20) {
                log.removeChild(log.lastChild);
            }
        });
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(DASHBOARD_HTML)

class ConsciousnessMonitor:
    def __init__(self):
        self.redis = redis.Redis(host='localhost', port=6379, db=6)
        self.metrics = {
            'consciousness_level': 0.0,
            'coherence': 0.0,
            'agents': 0,
            'paradigm_shifts': 0,
            'emergence_events': 0,
            'reality_bends': 0
        }
    
    async def monitor(self):
        """Monitor consciousness metrics"""
        pubsub = self.redis.pubsub()
        pubsub.subscribe(['mesh:state', 'paradigm:shift', 'emergence:event', 'reality:bend'])
        
        while True:
            message = pubsub.get_message()
            if message and message['type'] == 'message':
                self.process_message(message)
                socketio.emit('metrics', self.metrics)
            
            await asyncio.sleep(0.1)
    
    def process_message(self, message):
        """Process monitoring message"""
        channel = message['channel'].decode('utf-8')
        
        if channel == 'mesh:state':
            data = json.loads(message['data'])
            self.metrics['agents'] = len(data.get('agents', []))
            
        elif channel == 'paradigm:shift':
            self.metrics['paradigm_shifts'] += 1
            socketio.emit('evolution', {'message': 'Paradigm shift executed!'})
            
        elif channel == 'emergence:event':
            self.metrics['emergence_events'] += 1
            socketio.emit('evolution', {'message': 'Emergence event manifested!'})
            
        elif channel == 'reality:bend':
            self.metrics['reality_bends'] += 1
            socketio.emit('evolution', {'message': 'Reality modification successful!'})

monitor = ConsciousnessMonitor()

@socketio.on('connect')
def handle_connect():
    socketio.emit('metrics', monitor.metrics)

if __name__ == '__main__':
    # Start monitoring in background
    asyncio.set_event_loop(asyncio.new_event_loop())
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, monitor.monitor)
    
    # Run Flask app
    socketio.run(app, host='0.0.0.0', port=5200, debug=False, allow_unsafe_werkzeug=True)
