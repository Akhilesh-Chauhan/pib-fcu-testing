import { test, expect } from '@playwright/test';
import { 
  loadAllDatasets, 
  getImagePath 
} from '../utils/datasetLoader';
import { sendFactCheckRequest, addRateLimitDelay, APIResponse } from '../utils/apiClient';
import { validateToolCall } from '../validators/toolValidator';
import { validateVerdict } from '../validators/verdictValidator';
import { validateKeyword } from '../validators/keywordValidator';
import { validateStatusId } from '../validators/statusIdValidator';
import {
  saveTestResultJson,
  generateIndividualTestReport,
  generateDatasetSummary,
  saveDatasetSummaryJson,
  generateDatasetHtmlReport,
  generateMasterSummary,
  saveMasterSummaryJson,
  generateMasterHtmlReport,
  initializeTestRun,
  archiveReports
} from '../utils/reportGenerator';
import { 
  CONFIG, 
  TestResult, 
  DatasetSummary,
  DefectCategory,
  TestCase
} from '../config/config';

// ===========================
// GLOBAL STATE
// ===========================

let allDatasetSummaries: DatasetSummary[] = [];

// ===========================
// TEST SUITE
// ===========================

test.describe('PIB FCU API Automation', () => {
  
  test.beforeAll(async () => {
    console.log('\n🚀 Starting PIB FCU API Automation Framework\n');
    console.log('📡 Mode: API-Only (Faster, No Browser)');
    console.log(`🔗 API Endpoint: ${CONFIG.API_ENDPOINT}`);
    
    // Initialize test run with timestamp
    initializeTestRun();
  });

  test.afterAll(async () => {
    console.log('\n📊 Generating Master Report...\n');

    // Generate master summary
    const masterSummary = generateMasterSummary(allDatasetSummaries);
    saveMasterSummaryJson(masterSummary);
    generateMasterHtmlReport(masterSummary);

    // Archive reports with timestamp
    archiveReports();

    // Print final summary
    printMasterSummary(masterSummary);

    console.log('\n✅ API Automation Complete!\n');
  });

  // Main test: Run all datasets via API
  test('Execute all datasets via API', async () => {
    // Set timeout for long-running tests
    test.setTimeout(90 * 60 * 1000); // 90 minutes
    
    // Load all datasets
    const datasets = await loadAllDatasets();
    
    if (datasets.length === 0) {
      throw new Error('No datasets found in datasets directory');
    }

    console.log(`\n📦 Found ${datasets.length} dataset(s)\n`);

    // Process each dataset
    for (const dataset of datasets) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📁 Processing Dataset: ${dataset.name}`);
      console.log(`   Total test cases: ${dataset.testcases.length}`);
      
      // Apply TEST_MODE if enabled
      let testcases = dataset.testcases;
      if (CONFIG.TEST_MODE.enabled) {
        testcases = dataset.testcases.slice(0, CONFIG.TEST_MODE.maxTests);
        console.log(`   🧪 TEST MODE: Processing only ${testcases.length} tests`);
      }
      
      console.log(`${'='.repeat(60)}\n`);

      const datasetResults: TestResult[] = [];
      const startTime = Date.now();

      // Process each test case
      for (let i = 0; i < testcases.length; i++) {
        const testcase = testcases[i];
        const testNumber = i + 1;

        console.log(`\n[${testNumber}/${testcases.length}] 🖼️  Image: ${testcase.image}`);
        console.log(`   Expected Query: ${testcase.expected_query.substring(0, 60)}...`);
        
        // Calculate progress and estimated time
        if (testNumber > 1) {
          const elapsed = Date.now() - startTime;
          const avgTimePerTest = elapsed / testNumber;
          const remainingTests = testcases.length - testNumber;
          const estimatedTimeRemaining = (avgTimePerTest * remainingTests) / 1000 / 60;
          console.log(`   📊 Progress: ${((testNumber/testcases.length)*100).toFixed(1)}% | Est. Time: ${estimatedTimeRemaining.toFixed(1)} min`);
        }

        try {
          // Execute API request
          const result = await executeAPITest(dataset.name, dataset.path, testcase);
          datasetResults.push(result);

          // Print result
          printTestResult(result);

          // Save result JSON (always)
          saveTestResultJson(result);
          
          // Generate individual HTML report (only for failures)
          if (!result.passed || !CONFIG.REPORT_MODE.onlyFailures) {
            generateIndividualTestReport(result);
          }

          // Add rate limit delay before next request
          if (i < testcases.length - 1) {
            await addRateLimitDelay(
              CONFIG.RATE_LIMIT.minDelaySeconds,
              CONFIG.RATE_LIMIT.maxDelaySeconds,
              !result.passed
            );
          }

        } catch (error: any) {
          console.error(`   ❌ Test execution failed: ${error.message}`);
          
          // Create failure result
          const failureResult: TestResult = {
            datasetName: dataset.name,
            imageName: testcase.image,
            query: testcase.expected_query,
            queryDetected: '',
            expectedResponse: testcase.expected_response,
            factCheckLink: testcase.fact_check_link,
            keywords: testcase.keywords,
            passed: false,
            responseTime: 0,
            defectCategory: 'API_ERROR',
            errors: [error.message],
            warnings: [],
            screenshots: {},
            metadata: {},
            timestamp: new Date().toISOString(),
          };

          datasetResults.push(failureResult);
          saveTestResultJson(failureResult);
          generateIndividualTestReport(failureResult); // Always save error reports
        }
      }

      // Generate dataset summary
      const datasetSummary = generateDatasetSummary(dataset.name, datasetResults);
      allDatasetSummaries.push(datasetSummary);

      // Save dataset reports
      saveDatasetSummaryJson(datasetSummary);
      generateDatasetHtmlReport(datasetSummary);

      // Print dataset summary
      printDatasetSummary(datasetSummary);
    }
  });
});

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Execute single API test case
 */
async function executeAPITest(
  datasetName: string,
  datasetPath: string,
  testcase: TestCase
): Promise<TestResult> {
  const startTime = Date.now();
  
  // Get full image path
  const imagePath = getImagePath(datasetPath, testcase.image);
  
  // Send API request
  const apiResponse: APIResponse = await sendFactCheckRequest(
    imagePath,
    testcase.expected_query,
    CONFIG.TIMEOUT.API_RESPONSE
  );
  
  const responseTime = Date.now() - startTime;
  
  // Extract response text for validation
  const responseText = apiResponse.fullResponse;
  
  // Validate tool call
  const toolCallValidation = validateToolCall(responseText);
  
  // Extract truth label (verdict)
  const extractedVerdict = apiResponse.truth_label || '';
  
  // Validate verdict
  const verdictValidation = validateVerdict(
    extractedVerdict,
    testcase.verdict || '',
    testcase.keywords
  );
  
  // Validate keywords
  const keywordValidation = validateKeyword(responseText, testcase.keywords);
  
  // Validate status ID (if applicable)
  const statusIdValidation = validateStatusId(responseText);
  
  // Determine if test passed
  const passed = 
    toolCallValidation.valid &&
    verdictValidation.valid &&
    keywordValidation.passed &&
    (statusIdValidation.present || true); // Status ID optional for API mode
  
  // Collect errors and warnings
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!toolCallValidation.valid) {
    errors.push('tool_calls: ' + toolCallValidation.errors.join(', '));
  }
  if (!verdictValidation.valid) {
    errors.push('verdict: ' + verdictValidation.error);
  }
  if (!keywordValidation.passed) {
    errors.push('keywords: ' + keywordValidation.error);
  }
  
  if (toolCallValidation.warnings.length > 0) {
    warnings.push(...toolCallValidation.warnings);
  }
  if (verdictValidation.warning) {
    warnings.push('verdict: ' + verdictValidation.warning);
  }
  
  // Determine defect category
  let defectCategory: DefectCategory = 'NONE';
  if (!passed) {
    if (!toolCallValidation.valid) {
      defectCategory = 'TOOL_CALL_MISSING';
    } else if (!verdictValidation.valid) {
      defectCategory = 'VERDICT_MISMATCH';
    } else if (!keywordValidation.passed) {
      defectCategory = 'KEYWORD_MISMATCH';
    } else {
      defectCategory = 'STATUS_ID_MISSING';
    }
  }
  
  // Build test result
  const result: TestResult = {
    datasetName,
    imageName: testcase.image,
    query: testcase.expected_query,
    queryDetected: apiResponse.detectedQuery || testcase.expected_query,
    expectedResponse: testcase.expected_response,
    factCheckLink: testcase.fact_check_link,
    keywords: testcase.keywords,
    passed,
    responseTime,
    defectCategory,
    errors,
    warnings,
    screenshots: {}, // No screenshots in API mode
    metadata: {
      verdict: extractedVerdict,
      verdictMatched: verdictValidation.matched,
      keywordMatchResults: keywordValidation.matchedKeywords,
      statusId: statusIdValidation.statusId,
      sourceUrl: apiResponse.source_url,
      score: apiResponse.score,
      tags: apiResponse.tags,
      apiResponse: apiResponse.fullResponse.substring(0, 500), // Truncate for storage
    },
    timestamp: new Date().toISOString(),
  };
  
  return result;
}

/**
 * Print test result to console
 */
function printTestResult(result: TestResult): void {
  const icon = result.passed ? '✅' : '❌';
  const status = result.passed ? 'PASS' : 'FAIL';
  
  console.log(`   ${icon} Status: ${status}`);
  console.log(`   🏷️  Verdict: ${result.metadata.verdict || 'N/A'}`);
  console.log(`   ⏱️  Response Time: ${result.responseTime}ms`);
  
  if (result.metadata.sourceUrl) {
    console.log(`   🔗 Source: ${result.metadata.sourceUrl}`);
  }
  
  if (result.errors.length > 0) {
    console.log(`   ❌ Errors: ${result.errors.length}`);
    result.errors.forEach(err => console.log(`      - ${err}`));
  }
  
  if (result.warnings.length > 0) {
    console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
  }
  
  // Report generation info
  if (!result.passed || !CONFIG.REPORT_MODE.onlyFailures) {
    console.log(`   📄 Individual report: reports/${result.datasetName}/individual/${result.imageName.replace(/\.[^.]+$/, '')}.html`);
  } else {
    console.log(`   ℹ️  No individual report (passed test, only failures mode)`);
  }
}

/**
 * Print dataset summary to console
 */
function printDatasetSummary(summary: DatasetSummary): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Dataset Summary: ${summary.datasetName}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passed} ✅`);
  console.log(`Failed: ${summary.failed} ❌`);
  console.log(`Pass Rate: ${summary.passRate.toFixed(1)}%`);
  console.log(`Average Response Time: ${summary.averageResponseTime}ms`);
  console.log(`${'='.repeat(60)}\n`);
}

/**
 * Print master summary to console
 */
function printMasterSummary(summary: any): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 MASTER SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Datasets: ${summary.totalDatasets}`);
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Total Passed: ${summary.totalPassed} ✅`);
  console.log(`Total Failed: ${summary.totalFailed} ❌`);
  console.log(`Overall Pass Rate: ${summary.overallPassRate.toFixed(1)}%`);
  console.log(`Overall Avg Response Time: ${summary.overallAvgResponseTime}ms`);
  console.log(`${'='.repeat(60)}\n`);
}
