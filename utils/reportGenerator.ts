import * as fs from 'fs';
import * as path from 'path';
import { 
  TestResult, 
  DatasetSummary, 
  MasterSummary, 
  COLORS 
} from '../config/config';
import { ensureDir, getRelativePath } from './screenshotHelper';

// Global variable to store the current test run timestamp
let currentRunTimestamp: string | null = null;

/**
 * Initialize a new test run with a timestamp
 */
export function initializeTestRun(): string {
  const now = new Date();
  currentRunTimestamp = formatTimestamp(now);
  console.log(`\n📅 Test Run Initialized: ${currentRunTimestamp}\n`);
  return currentRunTimestamp;
}

/**
 * Get the current test run timestamp
 */
export function getCurrentRunTimestamp(): string {
  if (!currentRunTimestamp) {
    return initializeTestRun();
  }
  return currentRunTimestamp;
}

/**
 * Format timestamp for folder names and display
 */
function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Archive current reports to timestamped folder
 */
export function archiveReports(): void {
  const timestamp = getCurrentRunTimestamp();
  const archiveDir = path.join('reports', 'archive', timestamp);
  const reportsDir = 'reports';
  
  console.log(`\n📦 Archiving reports to: ${archiveDir}`);
  
  ensureDir(archiveDir);
  
  // Copy master report and summary
  const masterReportSrc = path.join(reportsDir, 'master-report.html');
  const masterSummarySrc = path.join(reportsDir, 'master-summary.json');
  
  if (fs.existsSync(masterReportSrc)) {
    fs.copyFileSync(masterReportSrc, path.join(archiveDir, 'master-report.html'));
  }
  if (fs.existsSync(masterSummarySrc)) {
    fs.copyFileSync(masterSummarySrc, path.join(archiveDir, 'master-summary.json'));
  }
  
  // Copy dataset folders
  const datasets = fs.readdirSync(reportsDir).filter(item => {
    const itemPath = path.join(reportsDir, item);
    return fs.statSync(itemPath).isDirectory() && item !== 'archive';
  });
  
  for (const dataset of datasets) {
    const srcDir = path.join(reportsDir, dataset);
    const destDir = path.join(archiveDir, dataset);
    
    // Copy dataset-summary.json and report.html
    ensureDir(destDir);
    
    const datasetSummary = path.join(srcDir, 'dataset-summary.json');
    const datasetReport = path.join(srcDir, 'report.html');
    
    if (fs.existsSync(datasetSummary)) {
      fs.copyFileSync(datasetSummary, path.join(destDir, 'dataset-summary.json'));
    }
    if (fs.existsSync(datasetReport)) {
      fs.copyFileSync(datasetReport, path.join(destDir, 'report.html'));
    }
  }
  
  console.log(`✅ Reports archived successfully`);
  
  // Generate archive index
  generateArchiveIndex();
}

/**
 * Generate JSON report for a test result
 */
export function saveTestResultJson(result: TestResult): void {
  const reportDir = path.join('reports', result.datasetName);
  ensureDir(reportDir);

  const jsonPath = path.join(reportDir, `${result.imageName.replace(/\.[^/.]+$/, '')}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
}

/**
 * Generate individual HTML report for a single test/image
 */
export function generateIndividualTestReport(result: TestResult): void {
  const reportDir = path.join('reports', result.datasetName, 'individual');
  ensureDir(reportDir);

  const imageName = result.imageName.replace(/\.[^/.]+$/, '');
  const statusClass = result.passed ? 'success' : 'failure';
  const statusIcon = result.passed ? '✅' : '❌';
  const statusText = result.passed ? 'PASS' : 'FAIL';

  // Get screenshot paths (relative to HTML file in individual/ folder)
  // Path structure: individual/Image1.html -> ../Image 1/response.png
  const responseScreenshot = result.screenshots?.response 
    ? result.screenshots.response.replace('reports/' + result.datasetName + '/', '../')
    : null;
  const failureScreenshot = result.screenshots?.failure 
    ? result.screenshots.failure.replace('reports/' + result.datasetName + '/', '../')
    : null;

  // Get source URL
  const sourceUrl = result.metadata?.searchTextRAG?.metadata?.source_url 
    || result.metadata?.generateFinalAnswer?.metadata?.source_url 
    || 'N/A';

  // Get actual chatbot response (prioritize generateFinalAnswer as it's the chatbot's final response to user)
  const actualResponse = result.metadata?.generateFinalAnswer?.finalAnswer 
    || result.metadata?.searchTextRAG?.metadata?.fact_check_result 
    || 'No response captured';
  
  // Get the detailed fact check result (from PIB database)
  const factCheckResult = result.metadata?.searchTextRAG?.metadata?.fact_check_result 
    || 'Not available';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - ${imageName}</title>
  <style>
    ${getReportStyles()}
    .test-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .test-status {
      font-size: 3rem;
      margin: 1rem 0;
    }
    .section {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h3 {
      margin-top: 0;
      color: #667eea;
      border-bottom: 2px solid #667eea;
      padding-bottom: 0.5rem;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 1rem;
      margin: 1rem 0;
    }
    .info-label {
      font-weight: 600;
      color: #666;
    }
    .info-value {
      color: #333;
    }
    .response-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 1.5rem;
      margin: 1rem 0;
      border-radius: 4px;
      font-size: 1rem;
      line-height: 1.8;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .screenshot-container {
      margin: 1rem 0;
      text-align: center;
    }
    .screenshot-container img {
      max-width: 100%;
      border: 2px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .screenshot-note {
      font-size: 0.9rem;
      color: #666;
      font-style: italic;
      margin-top: 0.5rem;
    }
    .error-list {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 1rem;
      margin: 1rem 0;
    }
    .warning-list {
      background: #d1ecf1;
      border-left: 4px solid #0dcaf0;
      padding: 1rem;
      margin: 1rem 0;
    }
    .metadata-json {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }
    .validation-steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    .validation-step {
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
    }
    .validation-step.pass {
      background: #d4edda;
      border: 2px solid #28a745;
    }
    .validation-step.fail {
      background: #f8d7da;
      border: 2px solid #dc3545;
    }
    .validation-step.na {
      background: #e2e3e5;
      border: 2px solid #6c757d;
    }
    .step-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .step-value {
      font-size: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="test-header">
      <h1>🖼️ Test Report: ${imageName}</h1>
      <div class="test-status">${statusIcon} ${statusText}</div>
      <p><strong>Dataset:</strong> ${result.datasetName}</p>
      <p><strong>Response Time:</strong> ${result.responseTime}ms</p>
    </div>

    <!-- Test Information -->
    <div class="section">
      <h3>📋 Test Information</h3>
      <div class="info-grid">
        <div class="info-label">Image Name:</div>
        <div class="info-value">${result.imageName}</div>
        
        <div class="info-label">Expected Query:</div>
        <div class="info-value">${result.query}</div>
        
        <div class="info-label">Expected Response:</div>
        <div class="info-value">${result.expectedResponse || 'N/A'}</div>
        
        <div class="info-label">Fact Check Link:</div>
        <div class="info-value">
          ${result.factCheckLink ? `<a href="${result.factCheckLink}" target="_blank">${result.factCheckLink}</a>` : 'N/A'}
        </div>
        
        <div class="info-label">Source URL (from API):</div>
        <div class="info-value">
          ${sourceUrl !== 'N/A' ? `<a href="${sourceUrl}" target="_blank">${sourceUrl}</a>` : 'N/A'}
        </div>
      </div>
    </div>

    <!-- Actual Chatbot Response -->
    <div class="section">
      <h3>💬 Chatbot Response (Final Answer to User)</h3>
      <div class="response-box">${actualResponse.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
    </div>

    ${factCheckResult !== 'Not available' ? `
    <!-- Detailed PIB Fact Check -->
    <div class="section">
      <h3>📰 PIB Fact Check Details (from Database)</h3>
      <div class="response-box" style="background: #fff8e1; border-left-color: #ffc107;">${factCheckResult.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}

    <!-- Validation Steps -->
    <div class="section">
      <h3>✓ Validation Steps (FCU 4-Step Flow)</h3>
      <div class="validation-steps">
        <div class="validation-step ${result.verdictDetected ? 'pass' : 'fail'}">
          <div class="step-title">Step 1: Tool Call</div>
          <div class="step-value">${result.errors.some(e => e.includes('searchTextRAG')) ? '❌' : '✅'}</div>
          <div>searchTextRAG exists & relevant</div>
        </div>
        
        <div class="validation-step ${result.verdictDetected && result.verdictDetected !== 'N/A' ? 'pass' : result.verdictDetected === 'N/A' ? 'na' : 'fail'}">
          <div class="step-title">Step 2: Verdict</div>
          <div class="step-value">${result.verdictDetected && result.verdictDetected !== 'N/A' ? '✅' : result.verdictDetected === 'N/A' ? '-' : '❌'}</div>
          <div>${result.verdictDetected || 'Not detected'}</div>
        </div>
        
        <div class="validation-step ${result.keywordMatched ? 'pass' : result.keywordMatched === undefined ? 'na' : 'fail'}">
          <div class="step-title">Step 3: Keyword</div>
          <div class="step-value">${result.keywordMatched ? '✅' : result.keywordMatched === undefined ? '-' : '❌'}</div>
          <div>${result.keywordMatched ? result.keywordMatched : result.keywordMatched === undefined ? 'N/A' : 'Not found'}</div>
        </div>
        
        <div class="validation-step ${result.statusIdMatched === true ? 'pass' : result.statusIdMatched === false ? 'fail' : 'na'}">
          <div class="step-title">Step 4: Status ID</div>
          <div class="step-value">${result.statusIdMatched === true ? '✅' : result.statusIdMatched === false ? '❌' : '-'}</div>
          <div>${result.statusIdMatched === true ? 'Matched' : result.statusIdMatched === false ? 'Not matched' : 'N/A'}</div>
        </div>
      </div>
    </div>

    ${result.errors.length > 0 ? `
    <div class="section">
      <h3>⚠️ Errors</h3>
      <div class="error-list">
        <ul>
          ${result.errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      </div>
    </div>
    ` : ''}

    ${result.warnings.length > 0 ? `
    <div class="section">
      <h3>ℹ️ Warnings</h3>
      <div class="warning-list">
        <ul>
          ${result.warnings.map(warning => `<li>${warning}</li>`).join('')}
        </ul>
      </div>
    </div>
    ` : ''}

    <!-- Screenshots -->
    <div class="section">
      <h3>📸 Uploaded Image</h3>
      <div class="screenshot-container">
        ${responseScreenshot ? `
          <img src="${responseScreenshot}" alt="Uploaded Image and Response">
          <p class="screenshot-note">Screenshot showing the uploaded image and chatbot response</p>
        ` : `
          <p style="color: #999;">No screenshot available</p>
        `}
      </div>
    </div>

    ${failureScreenshot ? `
    <div class="section">
      <h3>⚠️ Failure Screenshot</h3>
      <div class="screenshot-container">
        <img src="${failureScreenshot}" alt="Failure Screenshot">
        <p class="screenshot-note">Screenshot captured at the point of failure</p>
      </div>
    </div>
    ` : ''}

    <!-- Metadata -->
    <div class="section">
      <h3>🔍 API Response Metadata</h3>
      <div class="metadata-json">
        <pre>${JSON.stringify(result.metadata, null, 2)}</pre>
      </div>
    </div>

    <!-- Navigation -->
    <div class="section" style="text-align: center;">
      <a href="../report.html" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin: 0 10px;">
        ← Back to Dataset Report
      </a>
      <a href="../../master-report.html" style="display: inline-block; padding: 10px 20px; background: #764ba2; color: white; text-decoration: none; border-radius: 4px; margin: 0 10px;">
        📊 Master Report
      </a>
    </div>
  </div>
</body>
</html>`;

  const htmlPath = path.join(reportDir, `${imageName}.html`);
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`   📄 Individual report: reports/${result.datasetName}/individual/${imageName}.html`);
}

/**
 * Generate dataset summary report
 */
export function generateDatasetSummary(
  datasetName: string,
  results: TestResult[]
): DatasetSummary {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

  return {
    datasetName,
    totalTests: results.length,
    passed,
    failed,
    averageResponseTime,
    results,
  };
}

/**
 * Save dataset summary as JSON
 */
export function saveDatasetSummaryJson(summary: DatasetSummary): void {
  const reportDir = path.join('reports', summary.datasetName);
  ensureDir(reportDir);

  const jsonPath = path.join(reportDir, 'dataset-summary.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');
}

/**
 * Generate master summary across all datasets
 */
export function generateMasterSummary(datasetSummaries: DatasetSummary[]): MasterSummary {
  const totalTests = datasetSummaries.reduce((sum, ds) => sum + ds.totalTests, 0);
  const totalPassed = datasetSummaries.reduce((sum, ds) => sum + ds.passed, 0);
  const totalFailed = datasetSummaries.reduce((sum, ds) => sum + ds.failed, 0);

  const allResponseTimes = datasetSummaries.flatMap(ds => ds.results).map(r => r.responseTime);
  const overallAverageResponseTime = allResponseTimes.reduce((sum, rt) => sum + rt, 0) / allResponseTimes.length;

  return {
    totalDatasets: datasetSummaries.length,
    totalTests,
    totalPassed,
    totalFailed,
    overallAverageResponseTime,
    datasetSummaries,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Save master summary as JSON
 */
export function saveMasterSummaryJson(summary: MasterSummary): void {
  const reportDir = 'reports';
  ensureDir(reportDir);

  const jsonPath = path.join(reportDir, 'master-summary.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');
}

/**
 * Generate HTML report for dataset
 */
export function generateDatasetHtmlReport(summary: DatasetSummary): void {
  const reportDir = path.join('reports', summary.datasetName);
  ensureDir(reportDir);
  
  const timestamp = getCurrentRunTimestamp();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dataset Report - ${summary.datasetName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    ${getReportStyles()}
    .timestamp-badge {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Page Header -->
    <div class="page-header">
      <h1>📊 PIB FCU Automation Report</h1>
      <p class="subtitle">Dataset: ${summary.datasetName} | Generated: ${new Date().toLocaleString()}</p>
      <div class="timestamp-badge">🕒 Run ID: ${timestamp}</div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <input type="text" id="searchInput" onkeyup="searchTable()" placeholder="Search test cases...">
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-secondary" onclick="filterByStatus('all')">📋 All</button>
        <button class="btn btn-secondary" onclick="filterByStatus('pass')">✅ Passed</button>
        <button class="btn btn-secondary" onclick="filterByStatus('fail')">❌ Failed</button>
        <button class="btn btn-secondary" onclick="copySummary()">📋 Copy Summary</button>
        <button class="btn btn-secondary" onclick="exportToPDF()">📄 Export PDF</button>
        <button class="btn btn-secondary" id="darkModeBtn" onclick="toggleDarkMode()">🌙 Dark Mode</button>
      </div>
    </div>
    
    ${generateSummarySection(summary)}
    ${generateChartSection(summary)}
    ${generateResultsTable(summary)}
  </div>

  <script>
    ${getReportScripts()}
  </script>
</body>
</html>`;

  const htmlPath = path.join(reportDir, 'report.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
}

/**
 * Generate master HTML report
 */
export function generateMasterHtmlReport(summary: MasterSummary): void {
  const reportDir = 'reports';
  ensureDir(reportDir);
  
  const timestamp = getCurrentRunTimestamp();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PIB FCU Master Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    ${getReportStyles()}
    .timestamp-badge {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.9rem;
    }
    .archive-link {
      background: var(--warning-color);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      display: inline-block;
      margin-left: 10px;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }
    .archive-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Page Header -->
    <div class="page-header">
      <h1>📊 PIB FCU Automation - Master Report</h1>
      <p class="subtitle">Generated: ${new Date(summary.timestamp).toLocaleString()}</p>
      <div class="timestamp-badge">🕒 Run ID: ${timestamp}</div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <input type="text" id="searchInput" onkeyup="searchTable()" placeholder="Search datasets...">
      </div>
      <div class="toolbar-actions">
        <a href="archive/index.html" class="archive-link">📁 View Report History</a>
        <button class="btn btn-secondary" onclick="copySummary()">📋 Copy Summary</button>
        <button class="btn btn-secondary" onclick="exportToPDF()">📄 Export PDF</button>
        <button class="btn btn-secondary" id="darkModeBtn" onclick="toggleDarkMode()">🌙 Dark Mode</button>
      </div>
    </div>
    
    ${generateMasterSummarySection(summary)}
    ${generateDatasetsList(summary)}
  </div>

  <script>
    ${getReportScripts()}
  </script>
</body>
</html>`;

  const htmlPath = path.join(reportDir, 'master-report.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
}

/**
 * Generate summary section HTML
 */
function generateSummarySection(summary: DatasetSummary): string {
  const passRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);

  return `
    <div class="summary">
      <div class="summary-card">
        <div class="summary-label">Total Tests</div>
        <div class="summary-value">${summary.totalTests}</div>
      </div>
      <div class="summary-card success">
        <div class="summary-label">Passed</div>
        <div class="summary-value">${summary.passed}</div>
      </div>
      <div class="summary-card failure">
        <div class="summary-label">Failed</div>
        <div class="summary-value">${summary.failed}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Pass Rate</div>
        <div class="summary-value">${passRate}%</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Avg Response Time</div>
        <div class="summary-value">${summary.averageResponseTime.toFixed(0)}ms</div>
      </div>
    </div>
  `;
}

/**
 * Generate charts section HTML
 */
function generateChartSection(summary: DatasetSummary): string {
  return `
    <div class="charts-container">
      <div class="chart-card">
        <h3>📊 Test Results Distribution</h3>
        <div class="chart-wrapper">
          <canvas id="passFailChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>📈 Pass Rate</h3>
        <div class="chart-wrapper">
          <canvas id="passRateChart"></canvas>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate results table HTML
 */
function generateResultsTable(summary: DatasetSummary): string {
  const rows = summary.results.map((result, index) => {
    const statusClass = result.passed ? 'status-pass' : 'status-fail';
    const statusIcon = result.passed ? '✅' : '❌';
    
    // Link to individual report
    const imageName = result.imageName.replace(/\.[^/.]+$/, '');
    const individualReportLink = `individual/${imageName}.html`;

    // Extract query and response
    const queryAsked = result.queryDetected || 'N/A';
    
    // Extract actual response (chatbot's final answer)
    let actualResponse = 'N/A';
    if (result.metadata?.generateFinalAnswer?.finalAnswer) {
      actualResponse = result.metadata.generateFinalAnswer.finalAnswer;
    } else if (result.metadata?.searchTextRAG?.metadata?.fact_check_result) {
      actualResponse = result.metadata.searchTextRAG.metadata.fact_check_result;
    }
    
    // Truncate response for table display
    const truncatedResponse = actualResponse.length > 100 
      ? actualResponse.substring(0, 100) + '...' 
      : actualResponse;

    // Expected values
    const expectedResponse = result.expectedResponse || 'N/A';
    const truncatedExpectedResponse = expectedResponse.length > 100 
      ? expectedResponse.substring(0, 100) + '...' 
      : expectedResponse;

    // Keywords from result
    const keywords = result.keywords && result.keywords.length > 0 
      ? result.keywords.join(', ') 
      : 'None';
    
    // Use the original uploaded image from datasets folder
    const imagePathFromDatasets = `../../datasets/${summary.datasetName}/images/${result.imageName}`;

    // Links relevance (fact check link)
    const factCheckLink = result.factCheckLink || 'N/A';
    const linksRelevance = factCheckLink !== 'N/A' 
      ? `<a href="${factCheckLink}" target="_blank">Fact Check Link 🔗</a>` 
      : 'N/A';

    // Response relevance check
    const responseRelevanceIcon = result.passed ? '✅ Yes' : '❌ No';

    return `
      <tr class="${statusClass}">
        <td style="text-align: center;">${index + 1}</td>
        <td>${keywords}</td>
        <td style="text-align: center;">
          <a href="${individualReportLink}" target="_blank" style="text-decoration: none;">
            <img src="${imagePathFromDatasets}" alt="${result.imageName}" style="max-width: 150px; max-height: 150px; border: 2px solid #ddd; border-radius: 4px; cursor: pointer; display: block; margin: 0 auto;" title="Click to view detailed report" onerror="this.outerHTML='${result.imageName}'"/>
          </a>
        </td>
        <td title="${expectedResponse}">${truncatedExpectedResponse}</td>
        <td>${result.query}</td>
        <td title="${actualResponse}">${truncatedResponse}</td>
        <td style="text-align: center;">${responseRelevanceIcon}</td>
        <td style="text-align: center;">${linksRelevance}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-container">
      <h3 style="padding: 1.5rem; margin: 0; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); color: white; border-radius: 12px 12px 0 0;">📋 Test Results</h3>
      <div style="overflow-x: auto;">
        <table class="results-table">
          <thead>
            <tr>
              <th style="min-width: 60px;">TC No.</th>
              <th style="min-width: 150px;">Keywords/<br/>Image Description</th>
              <th style="min-width: 180px;">Image of the Query</th>
              <th style="min-width: 200px;">Expected Response</th>
              <th style="min-width: 180px;">Query Asked</th>
              <th style="min-width: 200px;">Actual Response</th>
              <th style="min-width: 150px;">Chatbot Response<br/>Relevant to Query?<br/>(Assessed against<br/>Expected Response)</th>
              <th style="min-width: 120px;">Links Relevance</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Generate details section for each test result
 */
function generateDetailsSection(result: TestResult): string {
  const errors = result.errors.length > 0 
    ? `<div class="error-box"><strong>Errors:</strong><ul>${result.errors.map(e => `<li>${e}</li>`).join('')}</ul></div>`
    : '';

  const warnings = result.warnings.length > 0
    ? `<div class="warning-box"><strong>Warnings:</strong><ul>${result.warnings.map(w => `<li>${w}</li>`).join('')}</ul></div>`
    : '';

  const screenshots = `
    <div class="screenshots">
      ${result.screenshots.response ? `<div><strong>Response:</strong><br><img src="${getRelativePath(result.screenshots.response)}" alt="Response"/></div>` : ''}
      ${result.screenshots.twitter ? `<div><strong>Twitter:</strong><br><img src="${getRelativePath(result.screenshots.twitter)}" alt="Twitter"/></div>` : ''}
      ${result.screenshots.failure ? `<div><strong>Failure:</strong><br><img src="${getRelativePath(result.screenshots.failure)}" alt="Failure"/></div>` : ''}
    </div>
  `;

  const metadata = `
    <div class="metadata">
      <strong>Metadata:</strong>
      <pre>${JSON.stringify(result.metadata, null, 2)}</pre>
    </div>
  `;

  return `
    <div class="details-content">
      ${errors}
      ${warnings}
      ${screenshots}
      ${metadata}
    </div>
  `;
}

/**
 * Generate master summary section
 */
function generateMasterSummarySection(summary: MasterSummary): string {
  const passRate = ((summary.totalPassed / summary.totalTests) * 100).toFixed(1);

  return `
    <div class="summary">
      <div class="summary-card">
        <div class="summary-label">Total Datasets</div>
        <div class="summary-value">${summary.totalDatasets}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Tests</div>
        <div class="summary-value">${summary.totalTests}</div>
      </div>
      <div class="summary-card success">
        <div class="summary-label">Total Passed</div>
        <div class="summary-value">${summary.totalPassed}</div>
      </div>
      <div class="summary-card failure">
        <div class="summary-label">Total Failed</div>
        <div class="summary-value">${summary.totalFailed}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Overall Pass Rate</div>
        <div class="summary-value">${passRate}%</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Avg Response Time</div>
        <div class="summary-value">${summary.overallAverageResponseTime.toFixed(0)}ms</div>
      </div>
    </div>
  `;
}

/**
 * Generate datasets list
 */
function generateDatasetsList(summary: MasterSummary): string {
  const rows = summary.datasetSummaries.map(ds => {
    const passRate = ((ds.passed / ds.totalTests) * 100).toFixed(1);
    const reportLink = `${ds.datasetName}/report.html`;

    return `
      <tr>
        <td><a href="${reportLink}">${ds.datasetName}</a></td>
        <td>${ds.totalTests}</td>
        <td class="success">${ds.passed}</td>
        <td class="failure">${ds.failed}</td>
        <td>${passRate}%</td>
        <td>${ds.averageResponseTime.toFixed(0)}ms</td>
      </tr>
    `;
  }).join('');

  return `
    <h3>Datasets</h3>
    <table class="results-table">
      <thead>
        <tr>
          <th>Dataset Name</th>
          <th>Total Tests</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Pass Rate</th>
          <th>Avg Response Time</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Get CSS styles for reports
 */
function getReportStyles(): string {
  return `
    :root {
      --primary-color: #667eea;
      --secondary-color: #764ba2;
      --success-color: #10b981;
      --failure-color: #ef4444;
      --warning-color: #f59e0b;
      --bg-color: #f8fafc;
      --card-bg: #ffffff;
      --text-color: #1e293b;
      --text-muted: #64748b;
      --border-color: #e2e8f0;
      --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }

    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-color);
      padding: 20px;
      line-height: 1.6;
      color: var(--text-color);
      transition: background 0.3s ease;
    }
    
    body.dark-mode {
      --bg-color: #0f172a;
      --card-bg: #1e293b;
      --text-color: #f1f5f9;
      --text-muted: #94a3b8;
      --border-color: #334155;
    }

    /* Page Header */
    .page-header {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      padding: 3rem 2rem;
      border-radius: 16px;
      margin-bottom: 2rem;
      box-shadow: var(--shadow-xl);
      position: relative;
      overflow: hidden;
    }

    .page-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120"><path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="rgba(255,255,255,0.1)"/></svg>') no-repeat;
      background-size: cover;
      opacity: 0.1;
    }

    .page-header h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      position: relative;
    }

    .page-header .subtitle {
      font-size: 1.1rem;
      opacity: 0.9;
      position: relative;
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .toolbar-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: var(--shadow-sm);
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
    }

    .btn-secondary {
      background: var(--card-bg);
      color: var(--text-color);
      border: 2px solid var(--border-color);
    }

    .search-box {
      position: relative;
      flex: 1;
      max-width: 400px;
    }

    .search-box input {
      width: 100%;
      padding: 0.75rem 1rem 0.75rem 2.75rem;
      border: 2px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      background: var(--card-bg);
      color: var(--text-color);
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .search-box::before {
      content: '🔍';
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.2rem;
    }
    
    .container {
      max-width: 1600px;
      margin: 0 auto;
    }
    
    h1 {
      color: var(--text-color);
      margin-bottom: 10px;
      border-bottom: 3px solid var(--primary-color);
      padding-bottom: 10px;
      font-weight: 700;
    }
    
    h2 {
      color: var(--text-color);
      margin: 20px 0 10px 0;
      font-weight: 600;
    }
    
    h3 {
      color: var(--text-color);
      margin: 30px 0 15px 0;
      font-weight: 600;
    }
    
    .timestamp {
      color: var(--text-muted);
      font-size: 0.9em;
      margin-bottom: 20px;
    }
    
    /* Summary Cards */
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }
    
    .summary-card {
      background: var(--card-bg);
      padding: 1.5rem;
      border-radius: 12px;
      text-align: center;
      border: 2px solid var(--border-color);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .summary-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: var(--primary-color);
      transition: width 0.3s ease;
    }

    .summary-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }

    .summary-card:hover::before {
      width: 100%;
      opacity: 0.1;
    }
    
    .summary-card.success::before { background: var(--success-color); }
    .summary-card.failure::before { background: var(--failure-color); }
    .summary-card.warning::before { background: var(--warning-color); }
    
    .summary-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }
    
    .summary-value {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--text-color);
      line-height: 1;
    }

    .summary-card.success .summary-value { color: var(--success-color); }
    .summary-card.failure .summary-value { color: var(--failure-color); }
    
    /* Charts Container */
    .charts-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin: 2rem 0;
    }

    .chart-card {
      background: var(--card-bg);
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      border: 1px solid var(--border-color);
    }

    .chart-card h3 {
      margin-top: 0;
      margin-bottom: 1rem;
      font-size: 1.1rem;
      color: var(--text-color);
    }

    .chart-wrapper {
      position: relative;
      height: 250px;
    }
    
    /* Results Table */
    .table-container {
      background: var(--card-bg);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow-md);
      margin: 2rem 0;
      border: 1px solid var(--border-color);
    }

    .results-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    
    .results-table th {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      vertical-align: middle;
      position: sticky;
      top: 0;
      z-index: 10;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .results-table td {
      padding: 1rem;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
      word-wrap: break-word;
      max-width: 300px;
      background: var(--card-bg);
      transition: background 0.2s ease;
    }
    
    .results-table tr:hover td {
      background: var(--bg-color);
    }
    
    .status-pass { 
      background: rgba(16, 185, 129, 0.1) !important; 
    }

    .status-pass:hover { 
      background: rgba(16, 185, 129, 0.15) !important; 
    }
    
    .status-fail { 
      background: rgba(239, 68, 68, 0.1) !important; 
    }

    .status-fail:hover { 
      background: rgba(239, 68, 68, 0.15) !important; 
    }
    
    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .status-badge.status-pass {
      background: var(--success-color);
      color: white;
    }
    
    .status-badge.status-fail {
      background: var(--failure-color);
      color: white;
    }

    .results-table img {
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      border-radius: 8px;
    }

    .results-table img:hover {
      transform: scale(1.05);
      box-shadow: var(--shadow-lg);
    }
    
    .score {
      font-family: 'Courier New', monospace;
      font-weight: bold;
    }
    
    .success { color: var(--success-color); }
    .failure { color: var(--failure-color); }
    .warning { color: var(--warning-color); }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .page-header h1 {
        font-size: 1.75rem;
      }

      .toolbar {
        flex-direction: column;
        align-items: stretch;
      }

      .search-box {
        max-width: 100%;
      }

      .summary {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }

      .summary-value {
        font-size: 2rem;
      }

      .charts-container {
        grid-template-columns: 1fr;
      }

      .results-table {
        font-size: 0.8rem;
      }

      .results-table th,
      .results-table td {
        padding: 0.75rem 0.5rem;
      }
    }

    /* Animations */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .summary-card,
    .chart-card,
    .table-container {
      animation: fadeIn 0.5s ease forwards;
    }

    .summary-card:nth-child(1) { animation-delay: 0.1s; }
    .summary-card:nth-child(2) { animation-delay: 0.2s; }
    .summary-card:nth-child(3) { animation-delay: 0.3s; }
    .summary-card:nth-child(4) { animation-delay: 0.4s; }
    .summary-card:nth-child(5) { animation-delay: 0.5s; }

    /* Print Styles */
    @media print {
      body {
        background: white;
        padding: 0;
      }

      .toolbar,
      .btn {
        display: none !important;
      }

      .page-header {
        background: #667eea;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .summary-card,
      .table-container {
        box-shadow: none;
        page-break-inside: avoid;
      }
    }
    
    .toggle-details {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1em;
      margin-right: 8px;
      transition: transform 0.3s;
    }
    
    .toggle-details.open {
      transform: rotate(90deg);
    }
    
    .details-row td {
      background: var(--bg-color);
      padding: 20px;
    }
    
    .details-content {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .error-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--failure-color);
      padding: 15px;
      border-radius: 8px;
      color: var(--failure-color);
    }
    
    .warning-box {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid var(--warning-color);
      padding: 15px;
      border-radius: 8px;
      color: var(--warning-color);
    }
    
    .error-box strong, .warning-box strong {
      display: block;
      margin-bottom: 8px;
    }
    
    .screenshots {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 15px;
    }
    
    .screenshots img {
      max-width: 100%;
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }
    
    .metadata pre {
      background: var(--bg-color);
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.85em;
      border: 1px solid var(--border-color);
    }
    
    a {
      color: var(--primary-color);
      text-decoration: none;
      transition: color 0.2s ease;
    }
    
    a:hover {
      color: var(--secondary-color);
      text-decoration: underline;
    }
  `;
}

/**
 * Get JavaScript for interactive features
 */
function getReportScripts(): string {
  return `
    // Dark Mode Toggle
    function toggleDarkMode() {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('darkMode', isDark);
      updateDarkModeButton();
    }

    function updateDarkModeButton() {
      const btn = document.getElementById('darkModeBtn');
      if (btn) {
        const isDark = document.body.classList.contains('dark-mode');
        btn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
      }
    }

    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
      updateDarkModeButton();
    }

    // Search Functionality
    function searchTable() {
      const input = document.getElementById('searchInput');
      const filter = input.value.toUpperCase();
      const table = document.querySelector('.results-table');
      const tr = table.getElementsByTagName('tr');

      for (let i = 1; i < tr.length; i++) {
        let txtValue = tr[i].textContent || tr[i].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
          tr[i].style.display = '';
        } else {
          tr[i].style.display = 'none';
        }
      }
    }

    // Filter by Status
    function filterByStatus(status) {
      const table = document.querySelector('.results-table');
      const tr = table.getElementsByTagName('tr');

      for (let i = 1; i < tr.length; i++) {
        if (status === 'all') {
          tr[i].style.display = '';
        } else if (status === 'pass' && tr[i].classList.contains('status-pass')) {
          tr[i].style.display = '';
        } else if (status === 'fail' && tr[i].classList.contains('status-fail')) {
          tr[i].style.display = '';
        } else {
          tr[i].style.display = 'none';
        }
      }
    }

    // Export to PDF
    function exportToPDF() {
      window.print();
    }

    // Copy Summary to Clipboard
    function copySummary() {
      const summaryCards = document.querySelectorAll('.summary-card');
      let text = 'PIB FCU Automation Report\\n\\n';
      
      summaryCards.forEach(card => {
        const label = card.querySelector('.summary-label').textContent;
        const value = card.querySelector('.summary-value').textContent;
        text += label + ': ' + value + '\\n';
      });

      navigator.clipboard.writeText(text).then(() => {
        alert('Summary copied to clipboard!');
      });
    }

    // Initialize Charts (if Chart.js is available)
    function initCharts() {
      if (typeof Chart === 'undefined') return;

      const cards = document.querySelectorAll('.summary-card');
      if (cards.length < 2) return;

      // Get values from summary cards
      const totalTests = parseInt(cards[0]?.querySelector('.summary-value')?.textContent || '0');
      const passed = parseInt(cards[1]?.querySelector('.summary-value')?.textContent || '0');
      const failed = parseInt(cards[2]?.querySelector('.summary-value')?.textContent || '0');

      // Pass/Fail Pie Chart
      const pieCtx = document.getElementById('passFailChart');
      if (pieCtx) {
        new Chart(pieCtx, {
          type: 'doughnut',
          data: {
            labels: ['Passed', 'Failed'],
            datasets: [{
              data: [passed, failed],
              backgroundColor: [
                'rgba(16, 185, 129, 0.8)',
                'rgba(239, 68, 68, 0.8)'
              ],
              borderColor: [
                'rgba(16, 185, 129, 1)',
                'rgba(239, 68, 68, 1)'
              ],
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'bottom'
              }
            }
          }
        });
      }

      // Pass Rate Bar Chart
      const barCtx = document.getElementById('passRateChart');
      if (barCtx) {
        const passRate = ((passed / totalTests) * 100).toFixed(1);
        
        new Chart(barCtx, {
          type: 'bar',
          data: {
            labels: ['Pass Rate'],
            datasets: [{
              label: 'Pass Rate %',
              data: [passRate],
              backgroundColor: 'rgba(102, 126, 234, 0.8)',
              borderColor: 'rgba(102, 126, 234, 1)',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                max: 100
              }
            },
            plugins: {
              legend: {
                display: false
              }
            }
          }
        });
      }
    }

    // Initialize on load
    document.addEventListener('DOMContentLoaded', function() {
      updateDarkModeButton();
      setTimeout(initCharts, 100);
    });

    function toggleDetails(imageName) {
      const detailsRow = document.getElementById('details-' + imageName);
      const button = event.target;
      
      if (detailsRow.style.display === 'none') {
        detailsRow.style.display = 'table-row';
        button.classList.add('open');
      } else {
        detailsRow.style.display = 'none';
        button.classList.remove('open');
      }
    }
  `;
}

/**
 * Generate archive index HTML page
 */
export function generateArchiveIndex(): void {
  const archiveBaseDir = path.join('reports', 'archive');
  
  if (!fs.existsSync(archiveBaseDir)) {
    return;
  }
  
  // Get all archived runs (folders with timestamp names)
  const archivedRuns = fs.readdirSync(archiveBaseDir)
    .filter(item => {
      const itemPath = path.join(archiveBaseDir, item);
      return fs.statSync(itemPath).isDirectory();
    })
    .sort()
    .reverse(); // Most recent first
  
  const archiveEntries = archivedRuns.map(timestamp => {
    const archiveDir = path.join(archiveBaseDir, timestamp);
    const masterSummaryPath = path.join(archiveDir, 'master-summary.json');
    
    let summary = null;
    if (fs.existsSync(masterSummaryPath)) {
      summary = JSON.parse(fs.readFileSync(masterSummaryPath, 'utf-8')) as MasterSummary;
    }
    
    // Parse timestamp for display
    const [date, time] = timestamp.split('_');
    const [year, month, day] = date.split('-');
    const [hours, minutes, seconds] = time.split('-');
    const displayDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    return {
      timestamp,
      displayDate,
      summary
    };
  });
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PIB FCU Report History</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${getReportStyles()}
    .archive-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      transition: all 0.2s ease;
    }
    .archive-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }
    .archive-date {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--primary-color);
      margin-bottom: 0.5rem;
    }
    .archive-stats {
      display: flex;
      gap: 1rem;
      margin: 0.5rem 0;
      flex-wrap: wrap;
    }
    .stat-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .stat-badge.success {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
    }
    .stat-badge.failure {
      background: rgba(239, 68, 68, 0.1);
      color: var(--failure-color);
    }
    .stat-badge.info {
      background: rgba(102, 126, 234, 0.1);
      color: var(--primary-color);
    }
    .view-link {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 0.5rem;
      transition: all 0.2s ease;
    }
    .view-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
  </style>
</head>
<body>
  <div class=\"container\">
    <div class=\"page-header\">
      <h1>📁 PIB FCU Report History</h1>
      <p class=\"subtitle\">Browse archived test runs</p>
    </div>
    
    <div style=\"margin-bottom: 2rem;\">
      <a href=\"../master-report.html\" class=\"view-link\">← Back to Latest Report</a>
    </div>
    
    <div class=\"archive-list\">
      ${archiveEntries.length === 0 ? '<p>No archived reports found.</p>' : archiveEntries.map(entry => `
        <div class=\"archive-card\">
          <div class=\"archive-date\">🕒 ${entry.displayDate}</div>
          ${entry.summary ? `
            <div class=\"archive-stats\">
              <span class=\"stat-badge info\">📊 ${entry.summary.totalTests} Total Tests</span>
              <span class=\"stat-badge success\">✅ ${entry.summary.totalPassed} Passed</span>
              <span class=\"stat-badge failure\">❌ ${entry.summary.totalFailed} Failed</span>
              <span class=\"stat-badge info\">📈 ${((entry.summary.totalPassed / entry.summary.totalTests) * 100).toFixed(1)}% Pass Rate</span>
            </div>
            <div style=\"margin-top: 0.5rem; color: var(--text-muted); font-size: 0.9rem;\">
              Datasets: ${entry.summary.datasetSummaries.map((d: any) => d.datasetName).join(', ')}
            </div>
          ` : ''}
          <a href=\"${entry.timestamp}/master-report.html\" class=\"view-link\">📄 View Report</a>
        </div>
      `).join('')}
    </div>
  </div>
  
  <script>
    ${getReportScripts()}
  </script>
</body>
</html>`;
  
  const indexPath = path.join(archiveBaseDir, 'index.html');
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log(`📑 Archive index updated: ${indexPath}`);
}
