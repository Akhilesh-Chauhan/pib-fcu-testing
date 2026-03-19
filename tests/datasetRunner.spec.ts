import { test, expect, Page, BrowserContext } from '@playwright/test';
import { 
  loadAllDatasets, 
  getImagePath, 
  validateTestCase 
} from '../utils/datasetLoader';
import { parseStreamedResponse, validateToolCallsExist } from '../utils/streamParser';
import { 
  captureResponseScreenshot, 
  captureTwitterScreenshot,
  captureFailureScreenshot,
  saveToolMetadata,
  saveRawApiResponse,
  saveConsoleLogs 
} from '../utils/screenshotHelper';
import { validateToolCall } from '../validators/toolValidator';
import { validateVerdict } from '../validators/verdictValidator';
import { validateKeyword } from '../validators/keywordValidator';
import { validateStatusId, extractStatusId } from '../validators/statusIdValidator';
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
  MasterSummary,
  DefectCategory,
  StreamedResponse,
  TestCase
} from '../config/config';
import { SELECTORS } from '../config/selectors';

// ===========================
// GLOBAL STATE
// ===========================

let allDatasetSummaries: DatasetSummary[] = [];
const consoleLogs: string[] = [];

// ===========================
// TEST SUITE
// ===========================

test.describe('PIB FCU Chatbot Automation', () => {
  let context: BrowserContext;
  let page: Page;
  let chatbotOpened = false;
  let browser: any; // Store browser reference for context recreation

  // Helper function to recreate browser context
  async function recreateContext() {
    console.log('   🔄 Recreating browser context...');
    
    try {
      // Try to close old context
      if (context) {
        await context.close();
      }
    } catch (e) {
      // Ignore errors from closing dead context
    }

    // Create new context
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    page = await context.newPage();

    // Listen to console logs
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Navigate to chatbot
    await page.goto(CONFIG.CHATBOT_URL, { 
      waitUntil: 'networkidle',
      timeout: CONFIG.TIMEOUT.PAGE_LOAD 
    });

    await page.waitForTimeout(2000);

    // Open chatbot window
    await openChatbot(page);
    chatbotOpened = true;
    
    console.log('   ✅ Context recreated successfully');
  }

  // Setup: Open browser and chatbot once
  test.beforeAll(async ({ browser: browserInstance }) => {
    console.log('\n🚀 Starting PIB FCU Automation Framework\n');
    
    browser = browserInstance; // Store browser reference
    
    // Initialize test run with timestamp
    initializeTestRun();
    
    // Create persistent context
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    page = await context.newPage();

    // Listen to console logs
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Navigate to chatbot
    console.log(`📍 Navigating to: ${CONFIG.CHATBOT_URL}`);
    await page.goto(CONFIG.CHATBOT_URL, { 
      waitUntil: 'networkidle', // Wait for network to be idle (React hydration)
      timeout: CONFIG.TIMEOUT.PAGE_LOAD 
    });

    // Additional wait for React/Next.js hydration
    await page.waitForTimeout(2000);

    // Open chatbot window
    await openChatbot(page);
    chatbotOpened = true;
  });

  // Cleanup: Generate master report
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

    // Close browser
    if (context) {
      await context.close();
    }

    console.log('\n✅ Automation Complete!\n');
  });

  // Main test: Run all datasets
  test('Execute all datasets', async () => {
    // Set timeout to 30 minutes for large dataset runs
    test.setTimeout(30 * 60 * 1000);
    
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
      console.log(`   Total images: ${dataset.testcases.length}`);
      console.log(`${'='.repeat(60)}\n`);

      const datasetResults: TestResult[] = [];

      // Process each test case (image)
      for (let i = 0; i < dataset.testcases.length; i++) {
        const testcase = dataset.testcases[i];
        const testNumber = i + 1;

        console.log(`\n[${testNumber}/${dataset.testcases.length}] 🖼️  Image: ${testcase.image}`);
        console.log(`   Expected Query: ${testcase.expected_query.substring(0, 60)}...`);

        // Validate test case structure
        const validation = validateTestCase(testcase);
        if (!validation.valid) {
          console.error(`   ❌ Invalid test case: ${validation.errors.join(', ')}`);
          continue;
        }

        try {          // Verify browser/page is still alive before each test
          if (page.isClosed() || context.pages().length === 0) {
            console.warn('   ⚠️  Page/context closed, recreating...');
            await recreateContext();
          }
                    // Execute single test case with retry logic
          const result = await executeTestCaseWithRetry(
            page,
            context,
            dataset.name,
            dataset.path,
            testcase,
            3 // Max 3 retry attempts
          );

          datasetResults.push(result);

          // Print result
          printTestResult(result);

          // Save individual result JSON
          saveTestResultJson(result);
          
          // Generate individual HTML report
          generateIndividualTestReport(result);

          // Reset chat for next test
          if (i < dataset.testcases.length - 1) {
            try {
              // Keep browser alive with a small action
              if (!page.isClosed()) {
                await page.evaluate(() => console.log('keepalive'));
              }
              
              await resetChat(page);
            } catch (resetError: any) {
              console.warn(`   ⚠️  Reset failed: ${resetError.message}, attempting page reload`);
              try {
                // If reset fails, reload the page
                if (!page.isClosed()) {
                  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
                  await page.waitForTimeout(2000);
                  await openChatbot(page);
                }
              } catch (reloadError: any) {
                console.error(`   ❌ Page reload also failed: ${reloadError.message}`);
                // Continue anyway, error will be caught in next iteration
              }
            }

            // Restart browser every 25 tests to prevent memory exhaustion
            if (testNumber % 25 === 0) {
              console.log(`\n🔄 Reached ${testNumber} tests - Restarting browser to free memory...`);
              try {
                await recreateContext();
                console.log(`   ✅ Browser restarted successfully\n`);
              } catch (restartError: any) {
                console.error(`   ❌ Browser restart failed: ${restartError.message}`);
                console.log(`   ⚠️  Continuing with existing browser...\n`);
              }
            }
          }

        } catch (error: any) {
          console.error(`   ❌ Test execution failed: ${error.message}`);
          
          // Check if context/page was closed
          const isContextClosed = error.message?.includes('closed') || 
                                  error.message?.includes('Target page') ||
                                  page.isClosed();
          
          if (isContextClosed) {
            console.warn('   ⚠️  Context closed during test, attempting recreation...');
            try {
              await recreateContext();
              console.log('   ✅ Context recreated, continuing with next test');
            } catch (recreateError: any) {
              console.error(`   ❌ Failed to recreate context: ${recreateError.message}`);
            }
          }
          
          // Capture failure screenshot (if possible)
          let failureScreenshot: string | undefined;
          try {
            if (!page.isClosed()) {
              failureScreenshot = await captureFailureScreenshot(
                page, 
                dataset.name, 
                testcase.image,
                'execution_error'
              );
            }
          } catch (screenshotError: any) {
            console.warn(`   ⚠️  Could not capture failure screenshot: ${screenshotError.message}`);
          }

          // Create failure result
          const failureResult: TestResult = {
            datasetName: dataset.name,
            imageName: testcase.image,
            query: testcase.expected_query,
            queryDetected: testcase.expected_query,
            expectedResponse: testcase.expected_response,
            factCheckLink: testcase.fact_check_link,
            keywords: testcase.keywords,
            passed: false,
            responseTime: 0,
            defectCategory: 'UI_SELECTOR_ERROR',
            errors: [error.message],
            warnings: [],
            screenshots: { failure: failureScreenshot },
            metadata: {},
            timestamp: new Date().toISOString(),
          };

          datasetResults.push(failureResult);
          saveTestResultJson(failureResult);
          generateIndividualTestReport(failureResult);
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
 * Open chatbot window
 */
async function openChatbot(page: Page): Promise<void> {
  try {
    console.log('🤖 Opening chatbot...');

    // Wait for React hydration and network to be idle
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000); // Additional wait for React hydration

    // Wait for chatbot icon/button to be fully rendered
    const chatbotIcon = page.locator(SELECTORS.chatbotIcon).first();
    
    // Wait for element to be attached to DOM and visible
    await chatbotIcon.waitFor({ state: 'attached', timeout: 10000 });
    await chatbotIcon.waitFor({ state: 'visible', timeout: 10000 });
    
    // Scroll into view to ensure it's in viewport
    await chatbotIcon.scrollIntoViewIfNeeded().catch(() => {});
    
    // Wait a moment for any animations to settle
    await page.waitForTimeout(500);
    
    // Force click to bypass animation stability check
    await chatbotIcon.click({ force: true, timeout: 5000 });

    // Wait for chat to open
    await page.waitForTimeout(2000);

    console.log('   ✅ Chatbot opened');
  } catch (error) {
    console.warn('   ⚠️  Could not find standard chatbot icon, chatbot may be already open');
  }
}

/**
 * Execute a test case with retry logic for transient failures
 */
async function executeTestCaseWithRetry(
  page: Page,
  context: BrowserContext,
  datasetName: string,
  datasetPath: string,
  testcase: TestCase,
  maxRetries: number = 3
): Promise<TestResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeTestCase(page, context, datasetName, datasetPath, testcase);
      
      // Retry only for specific transient errors
      const shouldRetry = result.defectCategory === 'UI_SELECTOR_ERROR' && 
                          attempt < maxRetries &&
                          (result.errors.some(e => 
                            e.includes('Protocol error') || 
                            e.includes('timeout') || 
                            e.includes('No data found') ||
                            e.includes('API response timeout')
                          ));
      
      if (shouldRetry) {
        console.log(`   ⚠️  Transient error detected, retrying (${attempt}/${maxRetries})...`);
        await page.waitForTimeout(2000); // Wait 2 seconds before retry
        continue;
      }
      
      // Success or non-retriable error
      if (attempt > 1 && result.passed) {
        console.log(`   ✅ Test passed on retry attempt ${attempt}`);
      }
      return result;
      
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries) {
        console.log(`   ⚠️  Attempt ${attempt} failed, retrying...`);
        await page.waitForTimeout(2000);
      }
    }
  }
  
  // All retries failed
  throw lastError || new Error('Test failed after all retries');
}

/**
 * Execute a single test case
 */
async function executeTestCase(
  page: Page,
  context: BrowserContext,
  datasetName: string,
  datasetPath: string,
  testcase: TestCase
): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let defectCategory: DefectCategory = 'NONE';
  const screenshots: any = {};
  let verdictDetected: string | undefined;
  let keywordMatched: string | undefined;
  let statusIdMatched: boolean | undefined;

  try {
    // Check if page is still open
    if (page.isClosed()) {
      throw new Error('Page is closed - cannot execute test');
    }

    // Get image path (with case-insensitive matching)
    const imagePath = getImagePath(datasetPath, testcase.image);

    // Upload image
    await uploadImage(page, imagePath);

    // Enter query
    await enterQuery(page, testcase.expected_query);

    // Intercept API call and get response
    const apiResponse = await interceptApiCall(page);

    // Save raw response for debugging
    console.log(`   📡 Raw API Response (first 1500 chars): ${apiResponse.data.substring(0, 1500)}`);
    console.log(`   📡 Response length: ${apiResponse.data.length} chars`);

    // Parse streamed response
    const parsedResponse = parseStreamedResponse(apiResponse.data);

    // Save raw response
    saveRawApiResponse(datasetName, testcase.image, apiResponse.data);

    // Extract final answer text
    // Priority: generateFinalAnswer > searchTextRAG.metadata.fact_check_result
    const finalAnswerText = parsedResponse.generateFinalAnswer?.finalAnswer 
      || parsedResponse.searchTextRAG?.metadata?.fact_check_result 
      || '';

    // Save metadata
    const metadata = {
      searchTextRAG: parsedResponse.searchTextRAG,
      generateFinalAnswer: parsedResponse.generateFinalAnswer,
      usage: parsedResponse.usage,
    };
    saveToolMetadata(datasetName, testcase.image, metadata);

    // === STEP 1: Tool Validation (Hard Fail) ===
    const toolValidation = validateToolCall(parsedResponse.searchTextRAG);
    errors.push(...toolValidation.errors);
    warnings.push(...toolValidation.warnings);
    if (!toolValidation.passed) {
      defectCategory = 'TOOL_FAILURE';
    }

    // === STEP 2: Verdict Validation (Semantic Grouping) ===
    if (toolValidation.passed) {
      const verdictValidation = validateVerdict(finalAnswerText, testcase);
      errors.push(...verdictValidation.errors);
      warnings.push(...verdictValidation.warnings);
      verdictDetected = verdictValidation.verdictDetected;
      if (!verdictValidation.passed && defectCategory === 'NONE') {
        defectCategory = 'WRONG_VERDICT';
      }
    }

    // === STEP 3: Keyword Validation ===
    if (toolValidation.passed) {
      const keywordValidation = validateKeyword(finalAnswerText, testcase);
      errors.push(...keywordValidation.errors);
      warnings.push(...keywordValidation.warnings);
      keywordMatched = keywordValidation.keywordMatched;
      if (!keywordValidation.passed && defectCategory === 'NONE') {
        defectCategory = 'KEYWORD_MISSING';
      }
    }

    // === STEP 4: Status ID Validation ===
    if (toolValidation.passed) {
      const sourceUrl = parsedResponse.searchTextRAG?.metadata?.source_url || '';
      const statusIdValidation = validateStatusId(finalAnswerText, testcase, sourceUrl);
      errors.push(...statusIdValidation.errors);
      warnings.push(...statusIdValidation.warnings);
      statusIdMatched = statusIdValidation.statusIdMatched;
      if (!statusIdValidation.passed && defectCategory === 'NONE') {
        defectCategory = 'STATUS_ID_MISMATCH';
      }
    }

    // Capture response screenshot
    screenshots.response = await captureResponseScreenshot(page, datasetName, testcase.image);

    // Note: Twitter page validation removed in FCU validation flow
    // Status ID validation is done directly on chatbot response

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Determine pass/fail
    const passed = errors.length === 0;

    return {
      datasetName,
      imageName: testcase.image,
      query: testcase.expected_query,
      queryDetected: metadata.searchTextRAG?.metadata?.extracted_query || testcase.expected_query,
      expectedResponse: testcase.expected_response,
      factCheckLink: testcase.fact_check_link,
      keywords: testcase.keywords,
      passed,
      verdictDetected,
      keywordMatched,
      statusIdMatched,
      responseTime,
      defectCategory: passed ? 'NONE' : defectCategory,
      errors,
      warnings,
      screenshots,
      metadata,
      timestamp: new Date().toISOString(),
    };

  } catch (error: any) {
    // Check if it's a FILE_NOT_FOUND error
    if (error.name === 'FILE_NOT_FOUND') {
      return {
        datasetName,
        imageName: testcase.image,
        query: testcase.expected_query,
        queryDetected: testcase.expected_query,
        expectedResponse: testcase.expected_response,
        factCheckLink: testcase.fact_check_link,
        keywords: testcase.keywords,
        passed: false,
        responseTime: Date.now() - startTime,
        defectCategory: 'FILE_NOT_FOUND',
        errors: [error.message],
        warnings: [],
        screenshots: {},
        metadata: {},
        timestamp: new Date().toISOString(),
      };
    }

    // Capture failure screenshot
    screenshots.failure = await captureFailureScreenshot(
      page,
      datasetName,
      testcase.image,
      'test_execution'
    );

    // Save console logs
    await saveConsoleLogs(consoleLogs, datasetName, testcase.image);

    return {
      datasetName,
      imageName: testcase.image,
      query: testcase.expected_query,
      queryDetected: testcase.expected_query,
      expectedResponse: testcase.expected_response,
      factCheckLink: testcase.fact_check_link,
      keywords: testcase.keywords,
      passed: false,
      responseTime: Date.now() - startTime,
      defectCategory: 'UI_SELECTOR_ERROR',
      errors: [error.message],
      warnings: [],
      screenshots,
      metadata: {},
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Upload image to chatbot
 */
async function uploadImage(page: Page, imagePath: string): Promise<void> {
  const fileInput = page.locator(SELECTORS.fileUploadInput).first();
  await fileInput.setInputFiles(imagePath);
  
  // Wait a moment for image to be processed (frontend OCR)
  await page.waitForTimeout(3000);
}

/**
 * Enter query text
 */
async function enterQuery(page: Page, query: string): Promise<void> {
  const queryInput = page.locator(SELECTORS.chatInput).first();
  await queryInput.fill(query);
}

/**
 * Intercept API call and capture response
 */
async function interceptApiCall(page: Page): Promise<{ data: string; time: number }> {
  const startTime = Date.now();
  let responseData = '';
  let responseReceived = false;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!responseReceived && responseData) {
        // Got partial response, return what we have
        console.warn('   ⚠️  API response timeout, returning partial data');
        resolve({
          data: responseData,
          time: Date.now() - startTime,
        });
      } else {
        reject(new Error('API response timeout - no data received'));
      }
    }, CONFIG.TIMEOUT.API_RESPONSE);

    // Listen for API response
    const responseHandler = async (response: any) => {
      if (response.url().includes('/api/chat')) {
        try {
          // Read response body (stream)
          const body = await response.text();
          responseData += body;

          // Check if streaming is complete
          if (body.includes('[DONE]') || body.includes('finishReason') || body.trim().endsWith('}')) {
            responseReceived = true;
            clearTimeout(timeout);
            page.off('response', responseHandler);
            resolve({
              data: responseData,
              time: Date.now() - startTime,
            });
          }
        } catch (error: any) {
          clearTimeout(timeout);
          page.off('response', responseHandler);
          // Return partial data if available
          if (responseData) {
            resolve({
              data: responseData,
              time: Date.now() - startTime,
            });
          } else {
            reject(error);
          }
        }
      }
    };

    page.on('response', responseHandler);

    // Click send button
    page.locator(SELECTORS.sendButton).first().click().catch((err) => {
      clearTimeout(timeout);
      page.off('response', responseHandler);
      reject(new Error(`Failed to click send button: ${err.message}`));
    });
  });
}

/**
 * Reset chat for next test
 */
async function resetChat(page: Page): Promise<void> {
  try {
    // Check if page is still open
    if (page.isClosed()) {
      throw new Error('Page is closed');
    }

    const resetButton = page.locator(SELECTORS.resetButton).first();
    
    // Check if reset button exists
    const exists = await resetButton.count() > 0;
    if (!exists) {
      console.warn('   ⚠️  Reset button not found, refreshing page instead');
      await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await openChatbot(page);
      return;
    }

    await resetButton.click({ timeout: CONFIG.TIMEOUT.ELEMENT_WAIT, force: true });

    // Wait for chat to clear
    await page.waitForTimeout(CONFIG.TIMEOUT.RESET_CHAT);

    // Verify chat cleared (message container should be empty or minimal)
    const messageContainer = page.locator(SELECTORS.chatMessageContainer);
    const messageCount = await messageContainer.count();

    if (messageCount > 2) {
      console.warn('   ⚠️  Chat may not have fully reset');
    }

  } catch (error) {
    throw new Error('RESET_FAILURE: Failed to reset chat');
  }
}

// ===========================
// CONSOLE OUTPUT HELPERS
// ===========================

/**
 * Print test result to console
 */
function printTestResult(result: TestResult): void {
  const status = result.passed ? '✅ PASS' : '❌ FAIL';
  const verdictDetected = result.verdictDetected || 'N/A';
  const keywordMatched = result.keywordMatched || 'None';
  const statusId = result.statusIdMatched ? '✅' : '❌';
  const time = result.responseTime.toFixed(0);

  console.log(`   Status: ${status}`);
  console.log(`   Verdict: ${verdictDetected}`);
  console.log(`   Keyword: ${keywordMatched}`);
  console.log(`   Status ID: ${statusId}`);
  console.log(`   Response Time: ${time}ms`);
  
  if (result.errors.length > 0) {
    console.log(`   Errors: ${result.errors.length}`);
    result.errors.forEach(e => console.log(`      - ${e}`));
  }

  if (result.warnings.length > 0) {
    console.log(`   Warnings: ${result.warnings.length}`);
  }
}

/**
 * Print dataset summary
 */
function printDatasetSummary(summary: DatasetSummary): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Dataset Summary: ${summary.datasetName}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passed} ✅`);
  console.log(`Failed: ${summary.failed} ❌`);
  console.log(`Pass Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`);
  console.log(`Average Response Time: ${summary.averageResponseTime.toFixed(0)}ms`);
  console.log(`${'='.repeat(60)}\n`);
}

/**
 * Print master summary
 */
function printMasterSummary(summary: MasterSummary): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 MASTER SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Datasets: ${summary.totalDatasets}`);
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Total Passed: ${summary.totalPassed} ✅`);
  console.log(`Total Failed: ${summary.totalFailed} ❌`);
  console.log(`Overall Pass Rate: ${((summary.totalPassed / summary.totalTests) * 100).toFixed(1)}%`);
  console.log(`Overall Avg Response Time: ${summary.overallAverageResponseTime.toFixed(0)}ms`);
  console.log(`${'='.repeat(60)}\n`);
}
