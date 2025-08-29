#!/bin/bash

# Fix production issues for candlefish.ai static site

set -e

echo "🚑 Emergency fix for production issues..."
echo ""

# 1. Fix maturity-map redirect
echo "📍 Creating maturity-map redirect page..."
mkdir -p app/maturity-map
cat > app/maturity-map/page.tsx << 'EOF'
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MaturityMapRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Immediate redirect to assessment
    router.replace('/assessment');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <h1 className="text-2xl text-[#3FD3C6] mb-4">Redirecting to Assessment...</h1>
        <p className="text-[#888]">
          If you are not redirected automatically, <a href="/assessment" className="text-[#3FD3C6] hover:underline">click here</a>.
        </p>
      </div>
    </div>
  );
}
EOF

# 2. Ensure all data files are present and properly exported
echo "📊 Checking data files..."

# Make sure workshop index exists
if [ ! -f "workshop/index.json" ]; then
  echo "Creating workshop index..."
  mkdir -p workshop
  cat > workshop/index.json << 'EOF'
[
  {
    "slug": "engraving-automation",
    "title": "Engraving Automation Platform",
    "status": "ACTIVE",
    "domain": ["Excel Automation", "Engraving", "Manufacturing"],
    "complexity": "H",
    "impact": "High",
    "updated_at": "2025-08-23",
    "safe_public": true
  },
  {
    "slug": "promoteros-intelligence",
    "title": "PromoterOS Concert Intelligence",
    "status": "CALIBRATING",
    "domain": ["Live Music", "Demand Prediction", "Social Analytics"],
    "complexity": "H",
    "impact": "High",
    "updated_at": "2025-08-23",
    "safe_public": true
  },
  {
    "slug": "inventory-automation",
    "title": "Highline Inventory Management System",
    "status": "OPERATIONAL",
    "domain": ["Inventory Management", "Real Estate", "Database"],
    "complexity": "M",
    "impact": "Medium",
    "updated_at": "2025-08-22",
    "safe_public": true
  },
  {
    "slug": "paintbox-estimation",
    "title": "Paintbox Excel-to-Web Platform",
    "status": "OPERATIONAL",
    "domain": ["Excel Migration", "Offline-First", "Formula Compilation"],
    "complexity": "H",
    "impact": "High",
    "updated_at": "2025-08-22",
    "safe_public": true
  }
]
EOF
fi

# 3. Create static export configuration
echo "⚙️ Updating build configuration..."
cat > scripts/static-export-enhanced.sh << 'SCRIPT'
#!/bin/bash
set -e

echo "🚀 Enhanced static export for Netlify..."

# Backup problematic directories that can't be statically exported
PROBLEM_DIRS=("api" "dashboard" "alerts" "incidents" "analytics" "settings")

echo "📁 Temporarily moving dynamic routes..."
for dir in "${PROBLEM_DIRS[@]}"; do
    if [ -d "app/$dir" ]; then
        mv "app/$dir" ".${dir}_backup"
        echo "  Moved app/$dir"
    fi
done

# Clean build cache
echo "🧹 Cleaning build cache..."
rm -rf .next out

# Build with static export
echo "🏗️ Building static site..."
NODE_ENV=production STATIC_EXPORT=true npx next build

# Restore directories
echo "🔄 Restoring dynamic routes..."
for dir in "${PROBLEM_DIRS[@]}"; do
    if [ -d ".${dir}_backup" ]; then
        mv ".${dir}_backup" "app/$dir"
        echo "  Restored app/$dir"
    fi
done

# Add Netlify redirects
if [ -d "out" ]; then
  cat > out/_redirects << 'EOF'
/maturity-map /assessment 301
/workshop-notes /workshop 301
EOF
  echo "✅ Added Netlify redirects"
fi

echo "✨ Static export complete!"
SCRIPT

chmod +x scripts/static-export-enhanced.sh

# 4. Fix components to work with static export
echo "🔧 Fixing components for static export..."

# Update HeaderText to be more resilient
cat > components/HeaderText.tsx << 'EOF'
'use client';

import React, { useEffect, useState, useRef } from 'react';

export default function HeaderText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const animationFrameRef = useRef<number>();

  // Static project data - always available
  const projects = [
    { id: 'engraving', title: 'engraving automation for a trophy franchise network' },
    { id: 'promoteros', title: 'concert intelligence platform for live music venues' },
    { id: 'inventory', title: 'inventory management system for real estate operations' },
    { id: 'paintbox', title: 'excel-to-web platform for construction estimating' }
  ];

  // Rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % projects.length);
        setTimeout(() => setIsTransitioning(false), 800);
      }, 400);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Mist particle effect
  useEffect(() => {
    if (!canvasRef.current || !isTransitioning) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update canvas size
    const updateSize = () => {
      if (!textRef.current) return;
      const rect = textRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    updateSize();

    // Particle system
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 3 + 1,
        opacity: 0
      });
    }

    const startTime = Date.now();
    const animate = () => {
      const progress = Math.min((Date.now() - startTime) / 1200, 1);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        p.opacity = progress < 0.5 
          ? progress * 2 * 0.3 
          : (1 - (progress - 0.5) * 2) * 0.3;
        
        ctx.fillStyle = `rgba(65, 90, 119, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTransitioning]);

  return (
    <h1 className="text-6xl md:text-7xl lg:text-8xl font-light text-[#F8F8F2] leading-[0.9] tracking-tight max-w-6xl">
      Currently engineering<br />
      <span className="text-[#415A77] relative inline-block">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
        <span
          ref={textRef}
          className={`relative transition-all duration-800 ${
            isTransitioning ? 'opacity-60' : 'opacity-100'
          }`}
          style={{
            filter: isTransitioning ? 'blur(1px)' : 'blur(0)',
            transform: isTransitioning ? 'scale(0.98)' : 'scale(1)',
          }}
        >
          {projects[currentIndex].title}
        </span>
      </span>
    </h1>
  );
}
EOF

# 5. Create production build script
echo "📦 Creating production build script..."
cat > scripts/build-production.sh << 'EOF'
#!/bin/bash
set -e

echo "🏭 Building for production deployment..."
echo ""

# Run fixes first
./scripts/fix-production-issues.sh

# Run enhanced static export
./scripts/static-export-enhanced.sh

echo ""
echo "✅ Production build complete!"
echo "📁 Static files are in the 'out' directory"
echo ""
echo "To deploy to Netlify:"
echo "  1. Commit these changes"
echo "  2. Push to main branch"
echo "  3. Netlify will auto-deploy from the 'out' directory"
EOF

chmod +x scripts/build-production.sh

echo ""
echo "✅ All production fixes applied!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run export"
echo "  2. Test locally: npx serve out"
echo "  3. Deploy to Netlify"
echo ""