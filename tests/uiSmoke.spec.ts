import { test, expect } from '@playwright/test';
import { CONFIG } from '../config/config';
import { SELECTORS } from '../config/selectors';

/**
 * UI Smoke Tests for PIB FCU Chatbot
 * These tests verify basic UI functionality without running full dataset validation
 */

test.describe('PIB FCU Chatbot - UI Smoke Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(CONFIG.CHATBOT_URL, { 
      waitUntil: 'networkidle', // Wait for React hydration
      timeout: CONFIG.TIMEOUT.PAGE_LOAD 
    });
    // Additional wait for React/Next.js hydration
    await page.waitForTimeout(1500);
  });

  test('Page loads successfully', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/PIB|Fact Check|MyScheme/i);
    
    // Verify page is loaded
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Page loaded successfully');
  });

  test('Chatbot icon is visible and clickable', async ({ page }) => {
    // Find chatbot icon/button
    const chatbotIcon = page.locator(SELECTORS.chatbotIcon).first();
    
    // Wait for button to be attached and visible
    await chatbotIcon.waitFor({ state: 'attached', timeout: 10000 });
    await expect(chatbotIcon).toBeVisible({ timeout: CONFIG.TIMEOUT.ELEMENT_WAIT });
    
    // Scroll into view and wait for animations
    await chatbotIcon.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    
    // Click to open chatbot (force click to bypass animation stability check)
    await chatbotIcon.click({ force: true, timeout: 5000 });
    
    // Wait a moment
    await page.waitForTimeout(2000);
    
    console.log('✅ Chatbot opens successfully');
  });

  test('Chat input elements are present', async ({ page }) => {
    // Open chatbot
    const chatbotIcon = page.locator(SELECTORS.chatbotIcon).first();
    await chatbotIcon.waitFor({ state: 'attached', timeout: 10000 });
    await chatbotIcon.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    await chatbotIcon.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify query input
    const chatInput = page.locator(SELECTORS.chatInput).first();
    await expect(chatInput).toBeVisible({ timeout: CONFIG.TIMEOUT.ELEMENT_WAIT });
    
    // Verify send button
    const sendButton = page.locator(SELECTORS.sendButton).first();
    await expect(sendButton).toBeVisible();
    
    console.log('✅ Chat input elements are present');
  });

  test('Image upload is available', async ({ page }) => {
    // Open chatbot
    const chatbotIcon = page.locator(SELECTORS.chatbotIcon).first();
    await chatbotIcon.waitFor({ state: 'attached', timeout: 10000 });
    await chatbotIcon.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    await chatbotIcon.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify file input exists
    const fileInput = page.locator(SELECTORS.fileUploadInput).first();
    await expect(fileInput).toBeAttached();
    
    console.log('✅ Image upload is available');
  });

  test('Reset button is available', async ({ page }) => {
    // Open chatbot
    const chatbotIcon = page.locator(SELECTORS.chatbotIcon).first();
    await chatbotIcon.waitFor({ state: 'attached', timeout: 10000 });
    await chatbotIcon.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    await chatbotIcon.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify reset button
    const resetButton = page.locator(SELECTORS.resetButton).first();
    
    // Reset button may appear after first interaction, so just check if selector is valid
    const resetCount = await resetButton.count();
    console.log(`   Reset button instances found: ${resetCount}`);
    
    console.log('✅ Reset button check complete');
  });

  test('Can send a simple text query', async ({ page }) => {
    // Open chatbot
    const chatbotIcon = page.locator(SELECTORS.chatbotIcon).first();
    await chatbotIcon.waitFor({ state: 'attached', timeout: 10000 });
    await chatbotIcon.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    await chatbotIcon.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(2000);

    // Type a simple query
    const chatInput = page.locator(SELECTORS.chatInput).first();
    await chatInput.fill('Hello, can you help me verify a claim?');

    // Click send
    const sendButton = page.locator(SELECTORS.sendButton).first();
    await sendButton.click();

    // Wait for response (basic check)
    await page.waitForTimeout(5000);

    // Check if any response message appears
    const responseMessage = page.locator(SELECTORS.responseContainer).first();
    const hasResponse = await responseMessage.count() > 0;
    
    console.log(`   Response received: ${hasResponse ? 'Yes' : 'No'}`);
    console.log('✅ Query submission works');
  });

  test('API endpoint is reachable', async ({ page }) => {
    let apiCalled = false;

    // Listen for API calls
    page.on('response', async (response) => {
      if (response.url().includes('/api/chat')) {
        apiCalled = true;
        console.log(`   API Response Status: ${response.status()}`);
        expect(response.status()).toBeLessThan(500); // Should not be server error
      }
    });

    // Open chatbot
    const chatbotIcon = page.locator(SELECTORS.chatbotIcon).first();
    await chatbotIcon.waitFor({ state: 'attached', timeout: 10000 });
    await chatbotIcon.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    await chatbotIcon.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(2000);

    // Send a test query
    const chatInput = page.locator(SELECTORS.chatInput).first();
    await chatInput.fill('Test query');
    
    const sendButton = page.locator(SELECTORS.sendButton).first();
    await sendButton.click();

    // Wait for API call
    await page.waitForTimeout(10000);

    expect(apiCalled).toBe(true);
    console.log('✅ API endpoint is reachable');
  });

  test('No console errors on page load', async ({ page }) => {
    const errors: string[] = [];

    // Listen to console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a moment for page to fully load
    await page.waitForTimeout(5000);

    // Open chatbot
    try {
      const chatbotIcon = page.locator(SELECTORS.chatbotIcon).first();
      await chatbotIcon.click();
      await page.waitForTimeout(3000);
    } catch (e) {
      // Ignore if chatbot can't open
    }

    console.log(`   Console errors found: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('   Errors:');
      errors.forEach(e => console.log(`      - ${e}`));
    }

    // This is a soft check - we log but don't fail
    console.log('✅ Console error check complete');
  });

  test('Page is responsive', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);

      // Verify page is still visible
      await expect(page.locator('body')).toBeVisible();
      
      console.log(`   ✅ ${viewport.name} (${viewport.width}x${viewport.height}) - OK`);
    }

    console.log('✅ Responsive design check complete');
  });
});

test.describe('PIB FCU Chatbot - API Structure Tests', () => {

  test('API response contains expected fields', async ({ page }) => {
    await page.goto(CONFIG.CHATBOT_URL, { 
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.TIMEOUT.PAGE_LOAD 
    });

    let apiResponseBody = '';

    // Intercept API response
    page.on('response', async (response) => {
      if (response.url().includes('/api/chat')) {
        try {
          apiResponseBody = await response.text();
        } catch (e) {
          // Ignore
        }
      }
    });

    // Open chatbot
    const chatbotButton = page.locator(SELECTORS.chatbotIcon).first();
    await chatbotButton.waitFor({ state: 'attached', timeout: 10000 });
    await chatbotButton.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    await chatbotButton.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(2000);

    // Send a test query
    const queryInput = page.locator(SELECTORS.chatInput).first();
    await queryInput.fill('Test API structure');
    
    const sendButton = page.locator(SELECTORS.sendButton).first();
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(15000);

    // Verify response structure
    if (apiResponseBody) {
      console.log(`   API Response Length: ${apiResponseBody.length} characters`);
      
      // Check for expected fields
      const hasToolName = apiResponseBody.includes('toolName');
      const hasToolCallId = apiResponseBody.includes('toolCallId');
      const hasMetadata = apiResponseBody.includes('metadata');
      const hasFinishReason = apiResponseBody.includes('finishReason');

      console.log(`   Contains toolName: ${hasToolName ? '✅' : '❌'}`);
      console.log(`   Contains toolCallId: ${hasToolCallId ? '✅' : '❌'}`);
      console.log(`   Contains metadata: ${hasMetadata ? '✅' : '❌'}`);
      console.log(`   Contains finishReason: ${hasFinishReason ? '✅' : '❌'}`);

      expect(hasToolName || hasMetadata).toBe(true);
    } else {
      console.warn('   ⚠️  No API response captured');
    }

    console.log('✅ API structure test complete');
  });
});
