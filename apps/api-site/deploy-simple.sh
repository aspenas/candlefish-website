#!/bin/bash
set -e

# Deploy script for api.candlefish.ai
echo "Deploying api.candlefish.ai..."

# Create a simple deployment package
cd "$(dirname "$0")"

# Ensure dist directory exists
mkdir -p dist

# Create a comprehensive API playground site
cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Candlefish AI - API Playground</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            min-height: 100vh;
        }
        .glass {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .code-editor {
            background: #1f2937;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        .response-area {
            background: #0f172a;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
    </style>
</head>
<body>
    <nav class="p-6">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <h1 class="text-2xl font-bold">Candlefish AI Playground</h1>
            <div class="flex space-x-4">
                <a href="https://docs.candlefish.ai" class="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all">Documentation</a>
                <a href="https://partners.candlefish.ai" class="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all">Partner Portal</a>
            </div>
        </div>
    </nav>

    <main class="max-w-7xl mx-auto px-6 py-8">
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold mb-4">API Playground</h1>
            <p class="text-lg opacity-90 max-w-2xl mx-auto">
                Test and explore the Candlefish AI API interactively. Try different endpoints, modify parameters, and see real responses.
            </p>
        </div>

        <div class="grid lg:grid-cols-2 gap-8">
            <!-- Request Panel -->
            <div class="glass p-6">
                <h2 class="text-2xl font-bold mb-4">🚀 API Request</h2>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Endpoint</label>
                        <select id="endpoint" class="w-full p-3 bg-gray-800 rounded-lg text-white">
                            <option value="/v1/chat/completions">POST /v1/chat/completions</option>
                            <option value="/v1/embeddings">POST /v1/embeddings</option>
                            <option value="/v1/models">GET /v1/models</option>
                            <option value="/v1/fine-tuning/jobs">POST /v1/fine-tuning/jobs</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">API Key</label>
                        <input type="password" id="apiKey" placeholder="sk-..." class="w-full p-3 bg-gray-800 rounded-lg text-white" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">Request Body</label>
                        <textarea id="requestBody" rows="12" class="w-full p-3 code-editor text-green-400 text-sm" placeholder="Enter JSON request body...">
{
  "model": "candlefish-1",
  "messages": [
    {
      "role": "user",
      "content": "Hello! Can you help me with API integration?"
    }
  ],
  "max_tokens": 150,
  "temperature": 0.7
}</textarea>
                    </div>

                    <button onclick="sendRequest()" class="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all">
                        Send Request
                    </button>
                </div>
            </div>

            <!-- Response Panel -->
            <div class="glass p-6">
                <h2 class="text-2xl font-bold mb-4">📡 API Response</h2>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Status</label>
                        <div id="status" class="p-3 bg-gray-800 rounded-lg text-gray-400">
                            Ready to send request...
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">Headers</label>
                        <pre id="responseHeaders" class="p-3 response-area text-gray-400 text-sm overflow-auto h-24">
No headers yet...
                        </pre>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-2">Response Body</label>
                        <pre id="responseBody" class="p-3 response-area text-green-400 text-sm overflow-auto h-80">
No response yet...
                        </pre>
                    </div>
                </div>
            </div>
        </div>

        <!-- API Examples -->
        <div class="mt-12 glass p-8">
            <h2 class="text-3xl font-bold mb-6">📚 Quick Examples</h2>
            <div class="grid md:grid-cols-3 gap-6">
                <div class="bg-gray-800/50 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold mb-2">Chat Completion</h3>
                    <p class="text-sm opacity-80 mb-3">Generate AI responses for conversations</p>
                    <button onclick="loadExample('chat')" class="text-blue-400 hover:text-blue-300 text-sm font-medium">Load Example →</button>
                </div>

                <div class="bg-gray-800/50 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold mb-2">Text Embeddings</h3>
                    <p class="text-sm opacity-80 mb-3">Convert text into vector embeddings</p>
                    <button onclick="loadExample('embeddings')" class="text-blue-400 hover:text-blue-300 text-sm font-medium">Load Example →</button>
                </div>

                <div class="bg-gray-800/50 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold mb-2">List Models</h3>
                    <p class="text-sm opacity-80 mb-3">Get available AI models and their info</p>
                    <button onclick="loadExample('models')" class="text-blue-400 hover:text-blue-300 text-sm font-medium">Load Example →</button>
                </div>
            </div>
        </div>
    </main>

    <footer class="text-center py-8 mt-12">
        <div class="glass inline-block p-4">
            <p>© 2025 Candlefish AI. API Playground for developers.</p>
            <p class="text-sm opacity-75 mt-2">
                🚀 Deployed: ${new Date().toLocaleString()}<br>
                Environment: Production<br>
                Version: 1.0.0
            </p>
        </div>
    </footer>

    <script>
        const examples = {
            chat: {
                endpoint: '/v1/chat/completions',
                body: `{
  "model": "candlefish-1",
  "messages": [
    {
      "role": "user",
      "content": "Hello! Can you help me with API integration?"
    }
  ],
  "max_tokens": 150,
  "temperature": 0.7
}`
            },
            embeddings: {
                endpoint: '/v1/embeddings',
                body: `{
  "model": "text-embedding-ada-002",
  "input": "The food was delicious and the waiter was very friendly."
}`
            },
            models: {
                endpoint: '/v1/models',
                body: ''
            }
        };

        function loadExample(type) {
            const example = examples[type];
            document.getElementById('endpoint').value = example.endpoint;
            document.getElementById('requestBody').value = example.body;
        }

        async function sendRequest() {
            const endpoint = document.getElementById('endpoint').value;
            const apiKey = document.getElementById('apiKey').value;
            const requestBody = document.getElementById('requestBody').value;

            const statusEl = document.getElementById('status');
            const headersEl = document.getElementById('responseHeaders');
            const bodyEl = document.getElementById('responseBody');

            // Show loading state
            statusEl.className = 'p-3 bg-yellow-900 rounded-lg text-yellow-200';
            statusEl.textContent = 'Sending request...';
            headersEl.textContent = 'Loading...';
            bodyEl.textContent = 'Loading...';

            try {
                const config = {
                    method: endpoint.includes('GET') ? 'GET' : 'POST',
                    url: 'https://api.candlefish.ai' + endpoint,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + apiKey
                    }
                };

                if (requestBody.trim() && config.method === 'POST') {
                    config.data = JSON.parse(requestBody);
                }

                const response = await axios(config);

                // Success
                statusEl.className = 'p-3 bg-green-900 rounded-lg text-green-200';
                statusEl.textContent = \`\${response.status} \${response.statusText}\`;

                headersEl.textContent = JSON.stringify({
                    'content-type': response.headers['content-type'],
                    'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'],
                    'x-ratelimit-reset': response.headers['x-ratelimit-reset']
                }, null, 2);

                bodyEl.textContent = JSON.stringify(response.data, null, 2);

            } catch (error) {
                // Error
                statusEl.className = 'p-3 bg-red-900 rounded-lg text-red-200';
                statusEl.textContent = error.response ?
                    \`\${error.response.status} \${error.response.statusText}\` :
                    'Network Error';

                headersEl.textContent = error.response ?
                    JSON.stringify(error.response.headers, null, 2) :
                    'No headers available';

                bodyEl.textContent = error.response ?
                    JSON.stringify(error.response.data, null, 2) :
                    error.message;
            }
        }

        // Load default example on page load
        window.addEventListener('load', function() {
            loadExample('chat');
        });
    </script>
</body>
</html>
EOF

# Create API health check endpoint
mkdir -p dist/api
cat > dist/api/health.json << 'EOF'
{
  "status": "healthy",
  "service": "api.candlefish.ai",
  "version": "1.0.0",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
}
EOF

echo "✅ API Playground site prepared in dist/"
echo "📁 Files ready for deployment:"
ls -la dist/
EOF

chmod +x deploy-simple.sh
