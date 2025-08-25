#!/bin/bash
set -e

# Deploy script for docs.candlefish.ai
echo "Deploying docs.candlefish.ai..."

# Create a simple deployment package
cd "$(dirname "$0")"

# Ensure dist directory exists
mkdir -p dist

# Create a comprehensive docs site
cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Candlefish AI Documentation</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .glass {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .nav-link:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <nav class="p-6">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
            <h1 class="text-2xl font-bold">Candlefish AI Docs</h1>
            <div class="flex space-x-4">
                <a href="#getting-started" class="nav-link px-4 py-2 rounded-lg transition-all">Getting Started</a>
                <a href="#api-reference" class="nav-link px-4 py-2 rounded-lg transition-all">API Reference</a>
                <a href="https://api.candlefish.ai" class="nav-link px-4 py-2 rounded-lg transition-all">API Playground</a>
            </div>
        </div>
    </nav>

    <main class="max-w-6xl mx-auto px-6 py-12">
        <div class="text-center mb-12">
            <h1 class="text-5xl font-bold mb-6">Candlefish AI Documentation</h1>
            <p class="text-xl opacity-90 max-w-3xl mx-auto">
                Complete documentation for the Candlefish AI platform - APIs, SDKs, guides, and everything you need to build with our AI services.
            </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8 mb-12">
            <div class="glass p-8 text-center">
                <h3 class="text-2xl font-semibold mb-4">🚀 Quick Start</h3>
                <p class="mb-4">Get up and running with Candlefish AI in minutes</p>
                <a href="#getting-started" class="bg-white text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">Start Now</a>
            </div>

            <div class="glass p-8 text-center">
                <h3 class="text-2xl font-semibold mb-4">📚 API Reference</h3>
                <p class="mb-4">Complete API documentation with examples</p>
                <a href="#api-reference" class="bg-white text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">Browse APIs</a>
            </div>

            <div class="glass p-8 text-center">
                <h3 class="text-2xl font-semibold mb-4">🛠️ Playground</h3>
                <p class="mb-4">Test APIs and explore features interactively</p>
                <a href="https://api.candlefish.ai" class="bg-white text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">Open Playground</a>
            </div>
        </div>

        <section id="getting-started" class="glass p-8 mb-8">
            <h2 class="text-3xl font-bold mb-6">Getting Started</h2>
            <div class="prose prose-lg text-white max-w-none">
                <h3>Installation</h3>
                <pre class="bg-gray-800 p-4 rounded-lg text-green-400"><code>npm install @candlefish-ai/sdk</code></pre>

                <h3>Authentication</h3>
                <p>Get your API key from the partner dashboard and authenticate:</p>
                <pre class="bg-gray-800 p-4 rounded-lg text-green-400"><code>import { CandlefishAI } from '@candlefish-ai/sdk';

const client = new CandlefishAI({
  apiKey: 'your-api-key-here',
  baseURL: 'https://api.candlefish.ai'
});</code></pre>

                <h3>First API Call</h3>
                <p>Make your first API call to test the connection:</p>
                <pre class="bg-gray-800 p-4 rounded-lg text-green-400"><code>const response = await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Hello, Candlefish AI!' }],
  model: 'candlefish-1'
});

console.log(response.choices[0].message.content);</code></pre>
            </div>
        </section>

        <section id="api-reference" class="glass p-8">
            <h2 class="text-3xl font-bold mb-6">API Reference</h2>
            <div class="grid md:grid-cols-2 gap-6">
                <div class="border-l-4 border-white pl-4">
                    <h3 class="text-xl font-semibold mb-2">Chat Completions</h3>
                    <p class="opacity-80 mb-2">Generate AI responses for conversational interfaces</p>
                    <code class="text-sm bg-gray-800 px-2 py-1 rounded">POST /v1/chat/completions</code>
                </div>

                <div class="border-l-4 border-white pl-4">
                    <h3 class="text-xl font-semibold mb-2">Embeddings</h3>
                    <p class="opacity-80 mb-2">Create vector embeddings from text</p>
                    <code class="text-sm bg-gray-800 px-2 py-1 rounded">POST /v1/embeddings</code>
                </div>

                <div class="border-l-4 border-white pl-4">
                    <h3 class="text-xl font-semibold mb-2">Fine-tuning</h3>
                    <p class="opacity-80 mb-2">Customize models for your specific use case</p>
                    <code class="text-sm bg-gray-800 px-2 py-1 rounded">POST /v1/fine-tuning/jobs</code>
                </div>

                <div class="border-l-4 border-white pl-4">
                    <h3 class="text-xl font-semibold mb-2">Models</h3>
                    <p class="opacity-80 mb-2">List available models and their capabilities</p>
                    <code class="text-sm bg-gray-800 px-2 py-1 rounded">GET /v1/models</code>
                </div>
            </div>
        </section>
    </main>

    <footer class="text-center py-8 mt-12">
        <div class="glass inline-block p-4">
            <p>© 2025 Candlefish AI. Built for developers, by developers.</p>
            <p class="text-sm opacity-75 mt-2">
                🚀 Deployed: ${new Date().toLocaleString()}<br>
                Environment: Production<br>
                Version: 1.0.0
            </p>
        </div>
    </footer>
</body>
</html>
EOF

# Create API health check endpoint
mkdir -p dist/api
cat > dist/api/health.json << 'EOF'
{
  "status": "healthy",
  "service": "docs.candlefish.ai",
  "version": "1.0.0",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
}
EOF

echo "✅ Documentation site prepared in dist/"
echo "📁 Files ready for deployment:"
ls -la dist/
EOF

chmod +x deploy-simple.sh
