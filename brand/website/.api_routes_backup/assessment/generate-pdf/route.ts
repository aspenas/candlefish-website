import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { score, portrait, responses, sessionId } = await request.json()

    // In production, this would use a PDF generation library like:
    // - puppeteer for server-side rendering
    // - pdfkit for programmatic generation
    // - react-pdf for React-based PDFs

    // For now, we'll create a simple HTML-based report that can be printed to PDF
    const html = generateReportHTML(score, portrait, sessionId)

    // Return as HTML with PDF content type headers
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="assessment-${sessionId}.html"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

function generateReportHTML(score: any, portrait: any, sessionId: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 30px 0;
    }

    .metric {
      text-align: center;
      padding: 20px;
      background: #F8F8F2;
      border-radius: 8px;
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
        <div class="metric-value">${score.candlefishFit.qualified ? 'Yes' : 'No'}</div>
        <div class="metric-label">Candlefish Fit</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Dimensional Breakdown</h2>
    <div class="dimensions">
      ${score.dimensions.map((d: any) => `
        <div class="dimension">
          <span class="dimension-name">${d.name}</span>
          <span class="dimension-score">${d.rawScore}/4</span>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="section">
    <h2>Key Strengths</h2>
    <div class="recommendations">
      ${score.strengths.map((s: any) => `
        <div class="recommendation">
          <h3>${s.dimension}</h3>
          <p>${s.insight}</p>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="section">
    <h2>Priority Interventions</h2>
    <div class="recommendations">
      ${score.interventions.map((i: any) => `
        <div class="recommendation">
          <h3>${i.dimension}</h3>
          <p>${i.action}</p>
          <p><strong>Impact:</strong> ${i.impact}</p>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="section">
    <h2>Candlefish Fit Assessment</h2>
    <div class="recommendations">
      <p>${score.candlefishFit.reason}</p>
      ${score.candlefishFit.prerequisites.length > 0 ? `
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
}
