// Export PDF Report API
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resumeId = searchParams.get('resumeId');

    if (!resumeId) {
      return NextResponse.json({ success: false, error: 'No resume ID provided' }, { status: 400 });
    }

    // In production, fetch the analyzed resume from database
    // For now, generate a sample PDF report

    const htmlContent = generateReportHTML(resumeId);
    
    // For now, return HTML as a simple report
    // In production, use a PDF library like puppeteer or react-pdf
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="candidate-report-${resumeId}.html"`,
      },
    });

  } catch (error) {
    console.error('Export PDF error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export report' },
      { status: 500 }
    );
  }
}

function generateReportHTML(resumeId: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrajectIQ - Candidate Analysis Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; }
    .header h1 { color: #4f46e5; font-size: 28px; margin-bottom: 8px; }
    .header p { color: #666; }
    .score-card { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 30px; }
    .score-card .score { font-size: 72px; font-weight: bold; }
    .score-card .grade { font-size: 36px; margin-top: 10px; }
    .score-card .recommendation { margin-top: 15px; font-size: 16px; opacity: 0.9; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #4f46e5; font-size: 20px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    .breakdown { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .breakdown-item { background: #f9fafb; padding: 15px; border-radius: 8px; }
    .breakdown-item h3 { font-size: 14px; color: #666; margin-bottom: 5px; }
    .breakdown-item .value { font-size: 24px; font-weight: bold; color: #1a1a2e; }
    .skills-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill { background: #4f46e5; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; }
    .skill.missing { background: #ef4444; }
    .skill.additional { background: #10b981; }
    .list { list-style: none; }
    .list li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .list li:last-child { border-bottom: none; }
    .strengths li { color: #059669; }
    .concerns li { color: #dc2626; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    @media print { body { padding: 20px; } .score-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>TrajectIQ</h1>
    <p>Candidate Analysis Report</p>
  </div>

  <div class="score-card">
    <div class="score">85%</div>
    <div class="grade">Grade: A-</div>
    <div class="recommendation">Strong candidate - recommend for interview</div>
  </div>

  <div class="section">
    <h2>Candidate Information</h2>
    <p><strong>Name:</strong> John Smith</p>
    <p><strong>Email:</strong> john.smith@example.com</p>
    <p><strong>Resume ID:</strong> ${resumeId}</p>
  </div>

  <div class="section">
    <h2>Score Breakdown</h2>
    <div class="breakdown">
      <div class="breakdown-item">
        <h3>Skills & Domain Intelligence (40%)</h3>
        <div class="value">88%</div>
      </div>
      <div class="breakdown-item">
        <h3>Career & Stability Indicators (15%)</h3>
        <div class="value">82%</div>
      </div>
      <div class="breakdown-item">
        <h3>Impact & Achievements Evidence (20%)</h3>
        <div class="value">85%</div>
      </div>
      <div class="breakdown-item">
        <h3>Cultural & Team Alignment (15%)</h3>
        <div class="value">80%</div>
      </div>
      <div class="breakdown-item">
        <h3>Education & Role Relevance (10%)</h3>
        <div class="value">90%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Skills Match</h2>
    <div class="skills-grid">
      <span class="skill">JavaScript</span>
      <span class="skill">React</span>
      <span class="skill">Node.js</span>
      <span class="skill">TypeScript</span>
      <span class="skill missing">AWS</span>
      <span class="skill additional">Python</span>
      <span class="skill additional">GraphQL</span>
    </div>
  </div>

  <div class="section">
    <h2>Strengths</h2>
    <ul class="list strengths">
      <li>✓ Strong technical skills matching job requirements</li>
      <li>✓ Relevant industry experience</li>
      <li>✓ Good educational background</li>
      <li>✓ Demonstrated problem-solving abilities</li>
    </ul>
  </div>

  <div class="section">
    <h2>Areas of Concern</h2>
    <ul class="list concerns">
      <li>⚠ Limited cloud platform experience (AWS)</li>
      <li>⚠ Could benefit from more leadership experience</li>
    </ul>
  </div>

  <div class="section">
    <h2>Experience Highlights</h2>
    <ul class="list">
      <li><strong>Senior Software Engineer</strong> at Tech Corp (2020-Present)</li>
      <li><strong>Software Developer</strong> at Startup Inc (2018-2020)</li>
    </ul>
  </div>

  <div class="section">
    <h2>Education</h2>
    <p>Bachelor of Science in Computer Science - State University (2018)</p>
  </div>

  <div class="footer">
    <p>Generated by TrajectIQ - Hiring Intelligence Platform</p>
    <p>Report ID: ${resumeId} | Generated: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
`;
}
