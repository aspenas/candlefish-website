const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// Serve static files
app.use('/_next/static', express.static(path.join(__dirname, '.next/static')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the main page
app.get('*', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Paintbox - Loading</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                text-align: center;
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                margin: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 40px 20px;
            }
            .logo {
                font-size: 48px;
                font-weight: bold;
                margin-bottom: 20px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .loading {
                font-size: 24px;
                margin-bottom: 30px;
                opacity: 0.9;
            }
            .message {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 30px;
                opacity: 0.8;
            }
            .link {
                display: inline-block;
                background: rgba(255,255,255,0.2);
                padding: 12px 24px;
                border-radius: 25px;
                text-decoration: none;
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                transition: all 0.3s ease;
            }
            .link:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
            }
            .spinner {
                border: 3px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top: 3px solid white;
                width: 30px;
                height: 30px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🎨 Paintbox</div>
            <div class="spinner"></div>
            <div class="loading">System Starting Up</div>
            <div class="message">
                We're getting your paint estimation system ready! This is a temporary placeholder
                while we complete the deployment process.
            </div>
            <a href="/api/health" class="link">System Health Check</a>
        </div>
    </body>
    </html>
  `);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Paintbox placeholder server running on http://0.0.0.0:${port}`);
  console.log(`🎨 Visit https://paintbox-app.fly.dev to see the loading screen`);
});
