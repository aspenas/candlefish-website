const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');

const urls = [
  'https://inventory.highline.work/',
  'https://inventory.highline.work/inventory',
  'https://inventory.highline.work/dashboard',
  'https://inventory.highline.work/analytics',
  'https://inventory.highline.work/insights',
  'https://inventory.highline.work/photos',
  'https://inventory.highline.work/collaboration'
];

async function runLighthouse(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const { port } = new URL(browser.wsEndpoint());
  
  const options = {
    port,
    output: 'json',
    onlyCategories: ['performance'],
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    }
  };

  try {
    const runnerResult = await lighthouse(url, options);
    
    const metrics = {
      url,
      score: runnerResult.lhr.categories.performance.score * 100,
      FCP: runnerResult.lhr.audits['first-contentful-paint'].numericValue,
      LCP: runnerResult.lhr.audits['largest-contentful-paint'].numericValue,
      TTI: runnerResult.lhr.audits['interactive'].numericValue,
      TBT: runnerResult.lhr.audits['total-blocking-time'].numericValue,
      CLS: runnerResult.lhr.audits['cumulative-layout-shift'].numericValue,
      SpeedIndex: runnerResult.lhr.audits['speed-index'].numericValue,
    };

    await browser.close();
    return metrics;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function auditAllPages() {
  console.log('Starting Performance Audit of inventory.highline.work\n');
  console.log('=' .repeat(70));
  
  const results = [];
  
  for (const url of urls) {
    console.log(`\nAuditing: ${url}`);
    try {
      const metrics = await runLighthouse(url);
      results.push(metrics);
      
      console.log(`✓ Score: ${metrics.score.toFixed(1)}/100`);
      console.log(`  FCP: ${(metrics.FCP / 1000).toFixed(2)}s`);
      console.log(`  LCP: ${(metrics.LCP / 1000).toFixed(2)}s`);
      console.log(`  TTI: ${(metrics.TTI / 1000).toFixed(2)}s`);
      console.log(`  TBT: ${metrics.TBT.toFixed(0)}ms`);
      console.log(`  CLS: ${metrics.CLS.toFixed(3)}`);
      console.log(`  Speed Index: ${(metrics.SpeedIndex / 1000).toFixed(2)}s`);
    } catch (error) {
      console.error(`✗ Failed to audit ${url}:`, error.message);
      results.push({ url, error: error.message });
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('PERFORMANCE SUMMARY\n');
  
  const successfulResults = results.filter(r => !r.error);
  if (successfulResults.length > 0) {
    const avgScore = successfulResults.reduce((sum, r) => sum + r.score, 0) / successfulResults.length;
    const avgLCP = successfulResults.reduce((sum, r) => sum + r.LCP, 0) / successfulResults.length;
    const avgTTI = successfulResults.reduce((sum, r) => sum + r.TTI, 0) / successfulResults.length;
    
    console.log(`Average Performance Score: ${avgScore.toFixed(1)}/100`);
    console.log(`Average LCP: ${(avgLCP / 1000).toFixed(2)}s`);
    console.log(`Average TTI: ${(avgTTI / 1000).toFixed(2)}s`);
    
    console.log('\nPages needing attention (Score < 90):');
    successfulResults
      .filter(r => r.score < 90)
      .forEach(r => console.log(`  - ${r.url.replace('https://inventory.highline.work', '')}: ${r.score.toFixed(1)}/100`));
  }
  
  const failedResults = results.filter(r => r.error);
  if (failedResults.length > 0) {
    console.log('\nFailed audits:');
    failedResults.forEach(r => console.log(`  - ${r.url}: ${r.error}`));
  }
}

auditAllPages().catch(console.error);