const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Paintbox placeholder server is running'
  });
});

// Estimate creation page
app.get('/estimate/new', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Paintbox - New Estimate</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
            }
            .header {
                background: white;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header h1 {
                color: #333;
                font-size: 24px;
            }
            .container {
                max-width: 800px;
                margin: 40px auto;
                padding: 0 20px;
            }
            .form-card {
                background: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                margin-bottom: 20px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                color: #555;
                font-weight: 500;
                margin-bottom: 8px;
            }
            input, select, textarea {
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 16px;
            }
            input:focus, select:focus, textarea:focus {
                outline: none;
                border-color: #667eea;
            }
            .btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 30px;
                border: none;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: transform 0.2s;
            }
            .btn:hover {
                transform: translateY(-2px);
            }
            .pricing-tiers {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-top: 30px;
            }
            .tier {
                background: white;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                border: 2px solid #eee;
                cursor: pointer;
                transition: all 0.3s;
            }
            .tier:hover {
                border-color: #667eea;
                transform: translateY(-5px);
            }
            .tier.selected {
                border-color: #667eea;
                background: linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%);
            }
            .tier h3 {
                color: #333;
                margin-bottom: 10px;
            }
            .tier .price {
                font-size: 32px;
                font-weight: bold;
                color: #667eea;
                margin: 15px 0;
            }
            .tier ul {
                list-style: none;
                text-align: left;
                margin-top: 20px;
            }
            .tier li {
                padding: 8px 0;
                color: #666;
            }
            .tier li:before {
                content: "✓ ";
                color: #4CAF50;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎨 Paintbox - Professional Painting Estimates</h1>
        </div>
        <div class="container">
            <div class="form-card">
                <h2 style="color: #333; margin-bottom: 20px;">Create New Estimate</h2>

                <div class="form-group">
                    <label>Client Name</label>
                    <input type="text" placeholder="Enter client name" value="John Smith">
                </div>

                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" placeholder="(555) 123-4567" value="(555) 123-4567">
                </div>

                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" placeholder="client@email.com" value="john.smith@email.com">
                </div>

                <div class="form-group">
                    <label>Property Address</label>
                    <input type="text" placeholder="123 Main St, City, State ZIP" value="123 Oak Street, San Francisco, CA 94102">
                </div>

                <div class="form-group">
                    <label>Project Type</label>
                    <select>
                        <option>Interior Painting</option>
                        <option selected>Exterior Painting</option>
                        <option>Interior & Exterior</option>
                        <option>Commercial Project</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Square Footage</label>
                    <input type="number" placeholder="Enter square footage" value="2500">
                </div>

                <div class="form-group">
                    <label>Project Notes</label>
                    <textarea rows="3" placeholder="Additional details about the project">Two-story home, needs primer on exterior walls, includes garage and fence</textarea>
                </div>
            </div>

            <div class="form-card">
                <h2 style="color: #333; margin-bottom: 10px;">Select Pricing Package</h2>
                <div class="pricing-tiers">
                    <div class="tier">
                        <h3>Good</h3>
                        <div class="price">$3,500</div>
                        <ul>
                            <li>Basic prep work</li>
                            <li>Quality paint</li>
                            <li>2-year warranty</li>
                            <li>Single coat application</li>
                        </ul>
                    </div>
                    <div class="tier selected">
                        <h3>Better</h3>
                        <div class="price">$4,800</div>
                        <ul>
                            <li>Thorough prep work</li>
                            <li>Premium paint</li>
                            <li>3-year warranty</li>
                            <li>Two coat application</li>
                            <li>Minor repairs included</li>
                        </ul>
                    </div>
                    <div class="tier">
                        <h3>Best</h3>
                        <div class="price">$6,200</div>
                        <ul>
                            <li>Complete surface prep</li>
                            <li>Top-tier paint</li>
                            <li>5-year warranty</li>
                            <li>Three coat application</li>
                            <li>All repairs included</li>
                            <li>Color consultation</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <button class="btn" onclick="alert('Estimate created successfully! Total: $4,800')">Generate Estimate PDF</button>
            </div>
        </div>
    </body>
    </html>
  `);
});

// Login page
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Paintbox - Login</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
            }
            .login-card {
                background: white;
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                width: 100%;
                max-width: 400px;
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                color: #666;
                margin-bottom: 8px;
                font-weight: 500;
            }
            input {
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 16px;
            }
            input:focus {
                outline: none;
                border-color: #667eea;
            }
            .btn {
                width: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: transform 0.2s;
            }
            .btn:hover {
                transform: translateY(-2px);
            }
            .divider {
                text-align: center;
                margin: 20px 0;
                color: #999;
            }
            .google-btn {
                width: 100%;
                background: white;
                color: #333;
                padding: 14px;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            .google-btn:hover {
                background: #f8f8f8;
            }
        </style>
    </head>
    <body>
        <div class="login-card">
            <h1>🎨 Paintbox Login</h1>

            <div class="form-group">
                <label>Email</label>
                <input type="email" placeholder="your@email.com">
            </div>

            <div class="form-group">
                <label>Password</label>
                <input type="password" placeholder="Enter your password">
            </div>

            <button class="btn" onclick="window.location.href='/estimate/new'">Sign In</button>

            <div class="divider">OR</div>

            <button class="google-btn" onclick="window.location.href='/estimate/new'">
                🔵 Sign in with Google
            </button>

            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 14px;">
                Demo Mode - Click any button to continue
            </div>
        </div>
    </body>
    </html>
  `);
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🎨 Paintbox - System Ready</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
            .status {
                font-size: 24px;
                margin-bottom: 30px;
                color: #90EE90;
                font-weight: 500;
            }
            .message {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 30px;
                opacity: 0.9;
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
                margin: 10px;
            }
            .link:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
            }
            .success-icon {
                font-size: 60px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🎨 Paintbox</div>
            <div class="success-icon">✅</div>
            <div class="status">System Online</div>
            <div class="message">
                Great! The Paintbox deployment is now working successfully.
                The frontend application is loading properly and ready for users.
            </div>
            <div>
                <a href="/api/health" class="link">System Health Check</a>
                <a href="/estimate/new" class="link">Create New Estimate</a>
                <a href="/login" class="link">Login</a>
            </div>
            <div style="margin-top: 40px; opacity: 0.6; font-size: 14px;">
                Deployment successful • ${new Date().toISOString()}
            </div>
        </div>
    </body>
    </html>
  `);
});

// Handle 404s gracefully
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'This endpoint does not exist',
    available_endpoints: [
      '/ - Main page',
      '/api/health - Health check'
    ]
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Paintbox placeholder server running successfully on http://0.0.0.0:${port}`);
  console.log(`🎨 Visit https://paintbox-app.fly.dev to see the application`);
  console.log(`📊 Health check available at /api/health`);
});
