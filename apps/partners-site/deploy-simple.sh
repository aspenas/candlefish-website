#!/bin/bash
set -e

# Deploy script for partners.candlefish.ai
echo "Deploying partners.candlefish.ai..."

# Create a simple deployment package
cd "$(dirname "$0")"

# Ensure dist directory exists
mkdir -p dist

# Create a comprehensive partners portal site
cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Candlefish AI - Partner Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #059669 0%, #0891b2 100%);
            color: white;
            min-height: 100vh;
        }
        .glass {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .feature-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .mobile-demo {
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            border-radius: 20px;
            padding: 20px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <nav class="p-6">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <h1 class="text-2xl font-bold">Candlefish Partners</h1>
            <div class="flex space-x-4">
                <a href="https://docs.candlefish.ai" class="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all">Documentation</a>
                <a href="https://api.candlefish.ai" class="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all">API Playground</a>
                <button onclick="showLoginModal()" class="px-6 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-all font-semibold">Partner Login</button>
            </div>
        </div>
    </nav>

    <main class="max-w-7xl mx-auto px-6 py-8">
        <div class="text-center mb-12">
            <h1 class="text-5xl font-bold mb-6">Partner with Candlefish AI</h1>
            <p class="text-xl opacity-90 max-w-3xl mx-auto mb-8">
                Join our partner network and integrate cutting-edge AI into your applications.
                Get access to exclusive APIs, mobile SDKs, and enterprise-grade support.
            </p>
            <div class="flex justify-center space-x-4">
                <button onclick="showSignupModal()" class="px-8 py-3 bg-white text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition-all">
                    Become a Partner
                </button>
                <button onclick="showDemoModal()" class="px-8 py-3 bg-white/10 border border-white/20 rounded-lg font-semibold hover:bg-white/20 transition-all">
                    Request Demo
                </button>
            </div>
        </div>

        <!-- Partner Benefits -->
        <section class="mb-16">
            <h2 class="text-3xl font-bold text-center mb-10">Why Partner with Us?</h2>
            <div class="grid md:grid-cols-3 gap-8">
                <div class="glass p-8 feature-card transition-all">
                    <div class="text-4xl mb-4">🚀</div>
                    <h3 class="text-2xl font-semibold mb-4">Advanced APIs</h3>
                    <p class="opacity-90">Access to state-of-the-art AI models with specialized endpoints for chat, embeddings, and fine-tuning.</p>
                </div>

                <div class="glass p-8 feature-card transition-all">
                    <div class="text-4xl mb-4">📱</div>
                    <h3 class="text-2xl font-semibold mb-4">Mobile-First SDKs</h3>
                    <p class="opacity-90">Native mobile SDKs for iOS and Android with offline capabilities and edge computing support.</p>
                </div>

                <div class="glass p-8 feature-card transition-all">
                    <div class="text-4xl mb-4">🔧</div>
                    <h3 class="text-2xl font-semibold mb-4">Enterprise Support</h3>
                    <p class="opacity-90">Dedicated support team, custom integrations, and white-label solutions for enterprise partners.</p>
                </div>
            </div>
        </section>

        <!-- Mobile Integration Showcase -->
        <section class="mb-16">
            <h2 class="text-3xl font-bold text-center mb-10">Mobile Integration Features</h2>
            <div class="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                    <h3 class="text-2xl font-semibold mb-6">📸 Camera & Location Services</h3>
                    <ul class="space-y-3 text-lg opacity-90">
                        <li>• Real-time image analysis and classification</li>
                        <li>• Geolocation-aware AI responses</li>
                        <li>• Offline camera processing with sync</li>
                        <li>• Privacy-first data handling</li>
                    </ul>

                    <h3 class="text-2xl font-semibold mb-6 mt-8">📡 Operator Network</h3>
                    <ul class="space-y-3 text-lg opacity-90">
                        <li>• Field operator mobile apps</li>
                        <li>• Real-time sync across devices</li>
                        <li>• Push notifications for critical updates</li>
                        <li>• Offline-first architecture</li>
                    </ul>
                </div>

                <div class="mobile-demo">
                    <h4 class="text-xl font-semibold mb-4 text-center">Mobile App Preview</h4>
                    <div class="bg-gray-900 rounded-lg p-4 space-y-3">
                        <div class="flex items-center space-x-3">
                            <div class="w-3 h-3 bg-green-400 rounded-full"></div>
                            <span class="text-green-400 text-sm">Camera Feed Active</span>
                        </div>
                        <div class="bg-gray-800 rounded p-3">
                            <div class="text-xs text-gray-400 mb-1">AI Analysis Result:</div>
                            <div class="text-green-300">Object detected: Industrial equipment (98% confidence)</div>
                        </div>
                        <div class="flex items-center space-x-3">
                            <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
                            <span class="text-blue-400 text-sm">Location: 37.7749° N, 122.4194° W</span>
                        </div>
                        <div class="bg-gray-800 rounded p-3">
                            <div class="text-xs text-gray-400 mb-1">Push Notification:</div>
                            <div class="text-blue-300">New task assigned to your location</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- API Integration Examples -->
        <section class="mb-16 glass p-8">
            <h2 class="text-3xl font-bold mb-8">Integration Examples</h2>
            <div class="grid md:grid-cols-2 gap-8">
                <div>
                    <h3 class="text-xl font-semibold mb-4">Web Integration</h3>
                    <pre class="bg-gray-900 p-4 rounded-lg text-green-400 text-sm overflow-x-auto"><code>import { CandlefishAI } from '@candlefish-ai/web';

const client = new CandlefishAI({
  apiKey: process.env.CANDLEFISH_API_KEY,
  baseURL: 'https://api.candlefish.ai'
});

const response = await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Hello!' }],
  model: 'candlefish-1'
});</code></pre>
                </div>

                <div>
                    <h3 class="text-xl font-semibold mb-4">Mobile Integration</h3>
                    <pre class="bg-gray-900 p-4 rounded-lg text-green-400 text-sm overflow-x-auto"><code>import { CandlefishMobile } from '@candlefish-ai/mobile';

const client = new CandlefishMobile({
  apiKey: 'your-api-key',
  offlineMode: true,
  cameraEnabled: true
});

await client.camera.analyzeImage({
  image: capturedImage,
  location: currentLocation
});</code></pre>
                </div>
            </div>
        </section>

        <!-- Partner Tiers -->
        <section class="mb-16">
            <h2 class="text-3xl font-bold text-center mb-10">Partnership Tiers</h2>
            <div class="grid lg:grid-cols-3 gap-8">
                <div class="glass p-8 text-center">
                    <h3 class="text-2xl font-bold mb-4">Startup</h3>
                    <div class="text-4xl font-bold mb-4">Free</div>
                    <ul class="text-left space-y-2 mb-6 opacity-90">
                        <li>• 10K API calls/month</li>
                        <li>• Basic mobile SDK</li>
                        <li>• Community support</li>
                        <li>• Standard documentation</li>
                    </ul>
                    <button onclick="showSignupModal('startup')" class="w-full bg-white text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all">
                        Get Started
                    </button>
                </div>

                <div class="glass p-8 text-center border-2 border-yellow-400">
                    <div class="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold mb-4">POPULAR</div>
                    <h3 class="text-2xl font-bold mb-4">Professional</h3>
                    <div class="text-4xl font-bold mb-4">$299/mo</div>
                    <ul class="text-left space-y-2 mb-6 opacity-90">
                        <li>• 1M API calls/month</li>
                        <li>• Advanced mobile SDK</li>
                        <li>• Priority support</li>
                        <li>• Custom integrations</li>
                        <li>• Analytics dashboard</li>
                    </ul>
                    <button onclick="showSignupModal('professional')" class="w-full bg-yellow-400 text-gray-900 py-2 rounded-lg font-semibold hover:bg-yellow-300 transition-all">
                        Start Trial
                    </button>
                </div>

                <div class="glass p-8 text-center">
                    <h3 class="text-2xl font-bold mb-4">Enterprise</h3>
                    <div class="text-4xl font-bold mb-4">Custom</div>
                    <ul class="text-left space-y-2 mb-6 opacity-90">
                        <li>• Unlimited API calls</li>
                        <li>• White-label SDKs</li>
                        <li>• Dedicated support</li>
                        <li>• Custom AI models</li>
                        <li>• On-premises deployment</li>
                    </ul>
                    <button onclick="showContactModal()" class="w-full bg-white text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all">
                        Contact Sales
                    </button>
                </div>
            </div>
        </section>
    </main>

    <footer class="text-center py-8 mt-12">
        <div class="glass inline-block p-4">
            <p>© 2025 Candlefish AI. Empowering partners worldwide.</p>
            <p class="text-sm opacity-75 mt-2">
                🚀 Deployed: ${new Date().toLocaleString()}<br>
                Environment: Production<br>
                Version: 1.0.0
            </p>
        </div>
    </footer>

    <!-- Modal Overlay -->
    <div id="modalOverlay" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden z-50" onclick="closeModal()">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="glass p-8 max-w-md w-full" onclick="event.stopPropagation()">
                <div id="modalContent"></div>
            </div>
        </div>
    </div>

    <script>
        function showModal(content) {
            document.getElementById('modalContent').innerHTML = content;
            document.getElementById('modalOverlay').classList.remove('hidden');
        }

        function closeModal() {
            document.getElementById('modalOverlay').classList.add('hidden');
        }

        function showLoginModal() {
            showModal(`
                <h2 class="text-2xl font-bold mb-6">Partner Login</h2>
                <form class="space-y-4">
                    <input type="email" placeholder="Partner email" class="w-full p-3 bg-gray-800 rounded-lg text-white" required>
                    <input type="password" placeholder="Password" class="w-full p-3 bg-gray-800 rounded-lg text-white" required>
                    <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all">
                        Sign In
                    </button>
                </form>
                <p class="text-center mt-4 text-sm opacity-75">
                    Don't have an account? <a href="#" onclick="showSignupModal()" class="text-blue-400 hover:text-blue-300">Sign up here</a>
                </p>
            `);
        }

        function showSignupModal(tier = 'startup') {
            showModal(`
                <h2 class="text-2xl font-bold mb-6">Become a Partner</h2>
                <form class="space-y-4">
                    <input type="text" placeholder="Company name" class="w-full p-3 bg-gray-800 rounded-lg text-white" required>
                    <input type="email" placeholder="Business email" class="w-full p-3 bg-gray-800 rounded-lg text-white" required>
                    <input type="text" placeholder="Your name" class="w-full p-3 bg-gray-800 rounded-lg text-white" required>
                    <select class="w-full p-3 bg-gray-800 rounded-lg text-white">
                        <option value="startup" ${tier === 'startup' ? 'selected' : ''}>Startup (Free)</option>
                        <option value="professional" ${tier === 'professional' ? 'selected' : ''}>Professional ($299/mo)</option>
                        <option value="enterprise" ${tier === 'enterprise' ? 'selected' : ''}>Enterprise (Custom)</option>
                    </select>
                    <button type="submit" class="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-all">
                        Create Partnership
                    </button>
                </form>
            `);
        }

        function showDemoModal() {
            showModal(`
                <h2 class="text-2xl font-bold mb-6">Request Demo</h2>
                <form class="space-y-4">
                    <input type="text" placeholder="Company name" class="w-full p-3 bg-gray-800 rounded-lg text-white" required>
                    <input type="email" placeholder="Contact email" class="w-full p-3 bg-gray-800 rounded-lg text-white" required>
                    <select class="w-full p-3 bg-gray-800 rounded-lg text-white">
                        <option>Web Integration</option>
                        <option>Mobile SDK</option>
                        <option>API Playground</option>
                        <option>Custom Solution</option>
                    </select>
                    <textarea placeholder="Tell us about your use case..." class="w-full p-3 bg-gray-800 rounded-lg text-white h-20" required></textarea>
                    <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all">
                        Schedule Demo
                    </button>
                </form>
            `);
        }

        function showContactModal() {
            showModal(`
                <h2 class="text-2xl font-bold mb-6">Contact Enterprise Sales</h2>
                <form class="space-y-4">
                    <input type="text" placeholder="Company name" class="w-full p-3 bg-gray-800 rounded-lg text-white" required>
                    <input type="email" placeholder="Business email" class="w-full p-3 bg-gray-800 rounded-lg text-white" required>
                    <input type="text" placeholder="Expected monthly API calls" class="w-full p-3 bg-gray-800 rounded-lg text-white">
                    <textarea placeholder="Enterprise requirements..." class="w-full p-3 bg-gray-800 rounded-lg text-white h-20" required></textarea>
                    <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all">
                        Contact Sales Team
                    </button>
                </form>
            `);
        }
    </script>
</body>
</html>
EOF

# Create API health check endpoint
mkdir -p dist/api
cat > dist/api/health.json << 'EOF'
{
  "status": "healthy",
  "service": "partners.candlefish.ai",
  "version": "1.0.0",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
}
EOF

echo "✅ Partners portal site prepared in dist/"
echo "📁 Files ready for deployment:"
ls -la dist/
EOF

chmod +x deploy-simple.sh
