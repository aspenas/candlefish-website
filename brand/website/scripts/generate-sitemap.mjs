#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const baseUrl = 'https://candlefish.ai';

// Routes to be included in sitemap
const staticRoutes = [];
const dynamicRoutes = [];

// Helper to format date
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Walk through app directory for Next.js app router pages
async function walkAppDir(dir, basePath = '') {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const routePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip special Next.js directories
        if (entry.name.startsWith('_') || entry.name.startsWith('.') || entry.name === 'api') {
          continue;
        }
        
        // Check for page.tsx/jsx/mdx in this directory
        const pageFiles = ['page.tsx', 'page.jsx', 'page.mdx'];
        for (const pageFile of pageFiles) {
          const pagePath = path.join(fullPath, pageFile);
          try {
            await fs.access(pagePath);
            // Found a page file, add route
            const route = basePath === '' && entry.name === 'page' ? '/' : `/${routePath.replace(/\\/g, '/')}`;
            const stats = await fs.stat(pagePath);
            staticRoutes.push({
              url: route === '/' ? baseUrl : `${baseUrl}${route}`,
              lastmod: formatDate(stats.mtime),
              changefreq: 'weekly',
              priority: route === '/' ? '1.0' : '0.5'
            });
            break;
          } catch {
            // Page file doesn't exist, continue
          }
        }
        
        // Recurse into subdirectory
        await walkAppDir(fullPath, routePath);
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dir}: ${error.message}`);
  }
}

// Generate sitemap XML
function generateSitemapXML(routes) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${route.url}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  return xml;
}

// Main function
async function generateSitemap() {
  console.log('Generating sitemap...');
  
  // Add root route
  staticRoutes.push({
    url: baseUrl,
    lastmod: formatDate(new Date()),
    changefreq: 'weekly',
    priority: '1.0'
  });
  
  // Walk app directory for pages
  const appDir = path.join(rootDir, 'app');
  await walkAppDir(appDir);
  
  // Combine all routes and remove duplicates
  const allRoutes = [...staticRoutes, ...dynamicRoutes];
  const uniqueRoutes = Array.from(
    new Map(allRoutes.map(route => [route.url, route])).values()
  );
  
  // Sort routes by priority then alphabetically
  uniqueRoutes.sort((a, b) => {
    if (a.priority !== b.priority) {
      return parseFloat(b.priority) - parseFloat(a.priority);
    }
    return a.url.localeCompare(b.url);
  });
  
  // Generate XML
  const sitemapXML = generateSitemapXML(uniqueRoutes);
  
  // Write sitemap
  const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
  await fs.writeFile(sitemapPath, sitemapXML, 'utf-8');
  
  console.log(`✓ Sitemap generated with ${uniqueRoutes.length} routes`);
  console.log(`  Written to: ${sitemapPath}`);
}

// Run
generateSitemap().catch(console.error);