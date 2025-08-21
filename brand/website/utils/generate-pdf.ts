export function generateAssessmentPDF(score: any, portrait: any, sessionId: string) {
  // Create HTML content
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Operational Maturity Assessment - ${sessionId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .header {
      border-bottom: 3px solid #3FD3C6;
      padding-bottom: 20px;
      margin-bottom: 40px;
    }

    h1 {
      font-size: 2.5em;
      font-weight: 300;
      color: #0D1B2A;
      margin-bottom: 10px;
    }

    .subtitle {
      color: #415A77;
      font-size: 1.2em;
    }

    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }

    h2 {
      font-size: 1.8em;
      font-weight: 400;
      color: #1B263B;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #E0E1DD;
    }

    .score-box {
      background: linear-gradient(135deg, #3FD3C6 0%, #4FE3D6 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      margin: 30px 0;
    }

    .score-value {
      font-size: 3em;
      font-weight: 300;
    }

    .score-label {
      font-size: 1.2em;
      opacity: 0.9;
      margin-top: 10px;
    }

    .metrics {
      display: flex;
      justify-content: space-around;
      margin: 30px 0;
    }

    .metric {
      text-align: center;
      padding: 20px;
      background: #F8F8F2;
      border-radius: 8px;
      flex: 1;
      margin: 0 10px;
    }

    .metric-value {
      font-size: 2em;
      font-weight: 300;
      color: #3FD3C6;
    }

    .metric-label {
      color: #415A77;
      margin-top: 5px;
      font-size: 0.9em;
    }

    .dimensions {
      margin: 30px 0;
    }

    .dimension {
      padding: 15px;
      margin-bottom: 10px;
      background: #F8F8F2;
      border-left: 4px solid #3FD3C6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dimension-name {
      font-weight: 500;
      color: #1B263B;
    }

    .dimension-score {
      background: #3FD3C6;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
    }

    .recommendations {
      background: #F8F8F2;
      padding: 30px;
      border-radius: 8px;
      margin: 30px 0;
    }

    .recommendation {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #E0E1DD;
    }

    .recommendation:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .recommendation h3 {
      color: #1B263B;
      margin-bottom: 10px;
    }

    .recommendation p {
      color: #415A77;
      line-height: 1.6;
    }

    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid #E0E1DD;
      text-align: center;
      color: #415A77;
      font-size: 0.9em;
    }

    @media print {
      body {
        padding: 20px;
      }

      .score-box {
        background: #3FD3C6 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Operational Maturity Assessment</h1>
    <div class="subtitle">Assessment ID: ${sessionId}</div>
    <div class="subtitle">Generated: ${new Date().toLocaleDateString()}</div>
  </div>

  <div class="section">
    <div class="score-box">
      <div class="score-value">${score.percentage}%</div>
      <div class="score-label">${score.level}</div>
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${score.percentile}th</div>
        <div class="metric-label">Industry Percentile</div>
      </div>
      <div class="metric">
        <div class="metric-value">${score.readiness}%</div>
        <div class="metric-label">Transformation Ready</div>
      </div>
      <div class="metric">
        <div class="metric-value">${score.candlefishFit?.qualified ? 'Yes' : 'No'}</div>
        <div class="metric-label">Candlefish Fit</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Dimensional Breakdown</h2>
    <div class="dimensions">
      ${score.dimensions?.map((d: any) => `
        <div class="dimension">
          <span class="dimension-name">${d.name}</span>
          <span class="dimension-score">${d.rawScore}/4</span>
        </div>
      `).join('') || ''}
    </div>
  </div>

  <div class="section">
    <h2>Key Strengths</h2>
    <div class="recommendations">
      ${score.strengths?.map((s: any) => `
        <div class="recommendation">
          <h3>${s.dimension}</h3>
          <p>${s.insight}</p>
        </div>
      `).join('') || '<p>No strengths data available</p>'}
    </div>
  </div>

  <div class="section">
    <h2>Priority Interventions</h2>
    <div class="recommendations">
      ${score.interventions?.map((i: any) => `
        <div class="recommendation">
          <h3>${i.dimension}</h3>
          <p>${i.action}</p>
          <p><strong>Impact:</strong> ${i.impact}</p>
        </div>
      `).join('') || '<p>No interventions data available</p>'}
    </div>
  </div>

  <div class="section">
    <h2>Candlefish Fit Assessment</h2>
    <div class="recommendations">
      <p>${score.candlefishFit?.reason || 'Assessment pending'}</p>
      ${score.candlefishFit?.prerequisites?.length > 0 ? `
        <p style="margin-top: 15px;"><strong>Prerequisites:</strong></p>
        <ul style="margin-left: 20px; margin-top: 10px;">
          ${score.candlefishFit.prerequisites.map((p: string) => `<li>${p}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Candlefish. This assessment provides operational insights based on your responses.</p>
    <p style="margin-top: 10px;">For consultation: hello@candlefish.ai</p>
  </div>
</body>
</html>
  `

  // Create a blob and download
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `candlefish-assessment-${sessionId}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Alternative: Open in new window for printing
export function openAssessmentPDF(score: any, portrait: any, sessionId: string) {
  const html = generateHTMLReport(score, portrait, sessionId)
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(html)
    newWindow.document.close()
    // Auto-trigger print dialog
    setTimeout(() => {
      newWindow.print()
    }, 500)
  }
}

function generateHTMLReport(score: any, portrait: any, sessionId: string): string {
  // Same HTML as above but optimized for printing
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Operational Maturity Assessment - ${sessionId}</title>
  <style>
    @page {
      margin: 1in;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .page-break {
      page-break-after: always;
    }

    /* Rest of styles from above */
  </style>
</head>
<body>
  <!-- Same content as above -->
</body>
</html>`
}