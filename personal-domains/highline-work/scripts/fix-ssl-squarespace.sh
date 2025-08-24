#!/bin/bash
# Fix SSL issues between Squarespace and Netlify for highline.work

echo "🔐 Fixing SSL Configuration for highline.work"
echo "============================================="
echo ""
echo "Current DNS Configuration:"
echo "--------------------------"
echo "highline.work A record: $(dig highline.work A +short)"
echo "www.highline.work: $(dig www.highline.work A +short | head -1)"
echo "inventory.highline.work: $(dig inventory.highline.work CNAME +short)"
echo ""

echo "📋 ISSUE IDENTIFIED:"
echo "-------------------"
echo "Squarespace is trying to provision SSL for highline.work and www.highline.work,"
echo "but these domains are pointing to different services:"
echo "- highline.work → Netlify (75.2.60.5)"
echo "- www.highline.work → Squarespace IPs"
echo "- inventory.highline.work → Netlify (correct)"
echo ""

echo "🛠️  SOLUTION OPTIONS:"
echo "--------------------"
echo ""
echo "Option 1: Use Netlify for everything (RECOMMENDED)"
echo "=================================================="
echo "1. In Squarespace DNS settings, change:"
echo "   - Remove the www.highline.work A records pointing to Squarespace"
echo "   - Add: www CNAME highline-work.netlify.app"
echo "   - Keep: inventory CNAME highline-inventory.netlify.app"
echo ""
echo "2. Then in Netlify:"
echo "   - Add highline.work as a custom domain to a Netlify site"
echo "   - SSL will auto-provision via Netlify"
echo ""

echo "Option 2: Use Squarespace for main domain"
echo "=========================================="
echo "1. In Squarespace DNS settings:"
echo "   - Change highline.work A record to Squarespace IPs:"
echo "     198.185.159.144, 198.185.159.145, 198.49.23.144, 198.49.23.145"
echo "   - Keep inventory as CNAME to highline-inventory.netlify.app"
echo ""
echo "2. Squarespace will then provision SSL for main domain"
echo "3. Netlify will handle SSL for inventory subdomain"
echo ""

echo "Option 3: Disable SSL in Squarespace (NOT recommended)"
echo "======================================================"
echo "1. In Squarespace Settings > Advanced > SSL"
echo "2. Set to 'Insecure' (this disables HSTS)"
echo "3. Use external SSL management"
echo ""

echo "📌 CURRENT NETLIFY SITES:"
echo "-------------------------"
netlify sites:list | grep highline || echo "No highline sites found"
echo ""

echo "🔧 QUICK FIX COMMANDS:"
echo "----------------------"
echo ""
echo "To add highline.work to Netlify (if choosing Option 1):"
echo "  netlify sites:create --name highline-work-main"
echo "  netlify domains:add highline.work --site highline-work-main"
echo ""
echo "To check SSL status on Netlify:"
echo "  curl -I https://inventory.highline.work"
echo "  curl -I https://highline.work"
echo ""
echo "To force SSL renewal on Netlify site:"
echo "  netlify api provisionSiteTLSCertificate --data '{\"site_id\": \"9ebc8d1d-e31b-4c29-afe4-1905a7503d4a\"}'"
echo ""

# Check if we should create a main highline.work site
read -p "Would you like to create a Netlify site for highline.work main domain? (y/n): " create_main
if [ "$create_main" = "y" ]; then
    echo "Creating Netlify site for highline.work..."
    netlify sites:create --name highline-work-main

    # Create a simple index page
    mkdir -p /tmp/highline-main
    cat > /tmp/highline-main/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Highline Work - Family Projects</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
        }
        .container {
            text-align: center;
            background: white;
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
        }
        h1 { color: #2d3436; margin-bottom: 1rem; }
        p { color: #636e72; line-height: 1.6; margin-bottom: 2rem; }
        .links {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        a {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: #6c5ce7;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        a:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(108, 92, 231, 0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏠 Highline Work</h1>
        <p>Family Projects Portal</p>
        <div class="links">
            <a href="https://inventory.highline.work">📦 Inventory Management</a>
        </div>
    </div>
</body>
</html>
EOF

    echo "Deploying main site..."
    netlify deploy --prod --dir=/tmp/highline-main --site=highline-work-main

    echo "✅ Main site created and deployed"
    echo "Now update DNS to point highline.work to this Netlify site"
fi

echo ""
echo "📚 HELPFUL RESOURCES:"
echo "---------------------"
echo "- Squarespace SSL Troubleshooting: https://support.squarespace.com/hc/en-us/articles/360028492471"
echo "- Netlify Custom Domains: https://docs.netlify.com/domains-https/custom-domains/"
echo "- DNS Propagation Checker: https://www.whatsmydns.net/"
