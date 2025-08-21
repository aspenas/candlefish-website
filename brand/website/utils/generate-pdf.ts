export async function generateAssessmentPDF(score: any, portrait: any, sessionId: string): Promise<void> {
  try {
    // Check browser support
    if (!window.Blob || !window.URL || !window.URL.createObjectURL) {
      throw new Error('Your browser does not support file downloads. Please try a different browser.');
    }

    // Create HTML content with complete styling
    const html = generateCompleteHTMLReport(score, portrait, sessionId);

    // Create blob and download
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candlefish-assessment-${sessionId}-${new Date().toISOString().split('T')[0]}.html`;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    // Show success message with instructions
    alert('Report downloaded successfully!\n\nTo save as PDF:\n1. Open the downloaded HTML file\n2. Press Ctrl+P (or Cmd+P on Mac)\n3. Select "Save as PDF"\n4. Click Save');

  } catch (error) {
    console.error('PDF generation error:', error);

    // Try fallback: open in new window for printing
    const success = await openAssessmentForPrint(score, portrait, sessionId);

    if (!success) {
      alert('Unable to download the report. Please try:\n1. Enabling pop-ups for this site\n2. Using a different browser\n3. Taking a screenshot of your results');
    }
  }
}

export async function openAssessmentForPrint(score: any, portrait: any, sessionId: string): Promise<boolean> {
  try {
    const html = generateCompleteHTMLReport(score, portrait, sessionId);
    const newWindow = window.open('', '_blank');

    if (!newWindow) {
      return false;
    }

    newWindow.document.write(html);
    newWindow.document.close();

    // Auto-trigger print dialog after content loads
    newWindow.onload = () => {
      setTimeout(() => {
        newWindow.print();
      }, 500);
    };

    return true;
  } catch (error) {
    console.error('Failed to open print window:', error);
    return false;
  }
}

function generateCompleteHTMLReport(score: any, portrait: any, sessionId: string): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Candlefish Operational Maturity Assessment - ${sessionId}</title>
  <style>
    @page {
      margin: 0.75in;
      size: letter;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: white;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }

    @media print {
      body {
        padding: 0;
        max-width: 100%;
      }
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

    h2 {
      font-size: 1.8em;
      font-weight: 400;
      color: #1B263B;
      margin: 30px 0 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #E0E1DD;
    }

    h3 {
      font-size: 1.3em;
      font-weight: 500;
      color: #1B263B;
      margin: 20px 0 10px;
    }

    .subtitle {
      color: #415A77;
      font-size: 1.1em;
      margin-bottom: 5px;
    }

    .score-box {
      background: linear-gradient(135deg, #3FD3C6 0%, #4FE3D6 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      margin: 30px 0;
      page-break-inside: avoid;
    }

    @media print {
      .score-box {
        background: #3FD3C6 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }
    }

    .score-value {
      font-size: 4em;
      font-weight: 300;
      margin-bottom: 10px;
    }

    .score-label {
      font-size: 1.5em;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.95;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 30px 0;
    }

    @media (max-width: 600px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }
    }

    .metric-card {
      text-align: center;
      padding: 20px;
      background: #F8F9FA;
      border-radius: 8px;
      border: 1px solid #E0E1DD;
      page-break-inside: avoid;
    }

    .metric-value {
      font-size: 2.5em;
      font-weight: 300;
      color: #3FD3C6;
      margin-bottom: 5px;
    }

    .metric-label {
      color: #415A77;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .dimension-item {
      padding: 15px;
      margin: 10px 0;
      background: #F8F9FA;
      border-left: 4px solid #3FD3C6;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-inside: avoid;
    }

    .dimension-name {
      font-weight: 500;
      color: #1B263B;
      font-size: 1.1em;
    }

    .dimension-score {
      background: #3FD3C6;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: 500;
    }

    .recommendation-box {
      background: #F8F9FA;
      padding: 25px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #E0E1DD;
      page-break-inside: avoid;
    }

    .recommendation-item {
      margin: 15px 0;
      padding-left: 25px;
      position: relative;
    }

    .recommendation-item::before {
      content: '▸';
      position: absolute;
      left: 0;
      color: #3FD3C6;
      font-size: 1.2em;
    }

    .highlight-box {
      background: #E8FAF8;
      border: 1px solid #3FD3C6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      page-break-inside: avoid;
    }

    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #E0E1DD;
      text-align: center;
      color: #415A77;
      page-break-inside: avoid;
    }

    .footer-logo {
      font-size: 1.5em;
      font-weight: 300;
      color: #0D1B2A;
      margin-bottom: 10px;
    }

    .contact-info {
      margin: 10px 0;
      font-size: 1.1em;
    }

    .print-instructions {
      background: #FFF9E6;
      border: 1px solid #FFD700;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }

    @media print {
      .print-instructions {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="print-instructions">
    <strong>📄 To save this as a PDF:</strong> Press <kbd>Ctrl+P</kbd> (or <kbd>Cmd+P</kbd> on Mac), then select "Save as PDF" as your printer.
  </div>

  <div class="header">
    <h1>Operational Maturity Assessment Report</h1>
    <div class="subtitle">Assessment ID: ${sessionId}</div>
    <div class="subtitle">Generated: ${currentDate}</div>
  </div>

  <div class="section">
    <div class="score-box">
      <div class="score-value">${score?.percentage || 0}%</div>
      <div class="score-label">${score?.level || 'Assessment Complete'}</div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${score?.percentile || 'N/A'}</div>
        <div class="metric-label">Industry Percentile</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${score?.readiness || 0}%</div>
        <div class="metric-label">Transformation Ready</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${score?.candlefishFit?.qualified ? '✓' : '○'}</div>
        <div class="metric-label">Candlefish Fit</div>
      </div>
    </div>
  </div>

  ${score?.dimensions && score.dimensions.length > 0 ? `
  <section>
    <h2>Dimensional Analysis</h2>
    ${score.dimensions.map((d: any) => `
      <div class="dimension-item">
        <span class="dimension-name">${d.name || 'Dimension'}</span>
        <span class="dimension-score">${d.rawScore || 0}/4</span>
      </div>
    `).join('')}
  </section>
  ` : ''}

  ${score?.strengths && score.strengths.length > 0 ? `
  <section>
    <h2>Key Strengths</h2>
    <div class="recommendation-box">
      ${score.strengths.map((s: any) => `
        <div class="recommendation-item">
          <strong>${s.dimension || 'Area'}:</strong> ${s.insight || 'Strength identified'}
        </div>
      `).join('')}
    </div>
  </section>
  ` : ''}

  ${score?.interventions && score.interventions.length > 0 ? `
  <section>
    <h2>Priority Interventions</h2>
    <div class="recommendation-box">
      ${score.interventions.map((i: any) => `
        <div class="recommendation-item">
          <strong>${i.dimension || 'Area'}:</strong> ${i.action || 'Action recommended'}
          ${i.impact ? `<br><em>Expected Impact: ${i.impact}</em>` : ''}
        </div>
      `).join('')}
    </div>
  </section>
  ` : ''}

  <section>
    <h2>Candlefish Fit Assessment</h2>
    <div class="highlight-box">
      <p><strong>Qualification Status:</strong> ${score?.candlefishFit?.qualified ? 'Qualified for Candlefish engagement' : 'Further preparation recommended'}</p>
      <p style="margin-top: 10px;">${score?.candlefishFit?.reason || 'Your organization shows potential for operational transformation.'}</p>

      ${score?.candlefishFit?.prerequisites && score.candlefishFit.prerequisites.length > 0 ? `
        <h3 style="margin-top: 20px;">Prerequisites for Engagement:</h3>
        <ul style="margin-left: 20px; margin-top: 10px;">
          ${score.candlefishFit.prerequisites.map((p: string) => `<li>${p}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  </section>

  <section>
    <h2>Next Steps</h2>
    <div class="recommendation-box">
      <div class="recommendation-item">Schedule a consultation to discuss your specific operational challenges</div>
      <div class="recommendation-item">Review the priority interventions with your leadership team</div>
      <div class="recommendation-item">Identify quick wins that can be implemented within 30 days</div>
      <div class="recommendation-item">Consider a pilot project to demonstrate ROI</div>
    </div>
  </section>

  <div class="footer">
    <div class="footer-logo">Candlefish</div>
    <p>Operational Design Atelier</p>
    <div class="contact-info">
      <p><strong>Email:</strong> hello@candlefish.ai</p>
      <p><strong>Web:</strong> candlefish.ai</p>
    </div>
    <p style="margin-top: 20px; font-size: 0.9em;">
      © ${new Date().getFullYear()} Candlefish. This assessment provides operational insights based on your responses.
    </p>
  </div>
</body>
</html>`;
}
