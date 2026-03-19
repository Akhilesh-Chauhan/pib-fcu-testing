import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensure directory exists, create if not
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Take screenshot of chatbot response
 */
export async function captureResponseScreenshot(
  page: Page,
  datasetName: string,
  imageName: string
): Promise<string> {
  const screenshotDir = path.join('reports', datasetName, imageName.replace(/\.[^/.]+$/, ''));
  ensureDir(screenshotDir);

  const screenshotPath = path.join(screenshotDir, 'response.png');
  
  try {
    // Try to capture the chat window/response area
    const chatWindow = page.locator('.chatbot-window, .chat-container, [role="dialog"]').first();
    
    if (await chatWindow.isVisible({ timeout: 2000 })) {
      await chatWindow.screenshot({ path: screenshotPath, timeout: 5000 });
    } else {
      // Fallback to full page screenshot
      await page.screenshot({ path: screenshotPath, fullPage: false });
    }
  } catch (error) {
    console.warn(`⚠️  Could not capture response screenshot: ${error}`);
    // Attempt full page as final fallback
    await page.screenshot({ path: screenshotPath, fullPage: false });
  }

  return screenshotPath;
}

/**
 * Take full-page screenshot of Twitter page
 */
export async function captureTwitterScreenshot(
  page: Page,
  datasetName: string,
  imageName: string
): Promise<string> {
  const screenshotDir = path.join('reports', datasetName, imageName.replace(/\.[^/.]+$/, ''));
  ensureDir(screenshotDir);

  const screenshotPath = path.join(screenshotDir, 'twitter.png');
  
  try {
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true,
      timeout: 10000 
    });
  } catch (error) {
    console.warn(`⚠️  Could not capture Twitter screenshot: ${error}`);
  }

  return screenshotPath;
}

/**
 * Take failure screenshot
 */
export async function captureFailureScreenshot(
  page: Page,
  datasetName: string,
  imageName: string,
  errorType: string
): Promise<string> {
  const screenshotDir = path.join('reports', datasetName, imageName.replace(/\.[^/.]+$/, ''));
  ensureDir(screenshotDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(screenshotDir, `failure_${errorType}_${timestamp}.png`);
  
  try {
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true,
      timeout: 5000 
    });
  } catch (error) {
    console.warn(`⚠️  Could not capture failure screenshot: ${error}`);
  }

  return screenshotPath;
}

/**
 * Save tool metadata to JSON file
 */
export function saveToolMetadata(
  datasetName: string,
  imageName: string,
  metadata: any
): string {
  const metadataDir = path.join('reports', datasetName, imageName.replace(/\.[^/.]+$/, ''));
  ensureDir(metadataDir);

  const metadataPath = path.join(metadataDir, 'tool-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return metadataPath;
}

/**
 * Save raw API response
 */
export function saveRawApiResponse(
  datasetName: string,
  imageName: string,
  rawResponse: string
): string {
  const responseDir = path.join('reports', datasetName, imageName.replace(/\.[^/.]+$/, ''));
  ensureDir(responseDir);

  const responsePath = path.join(responseDir, 'raw-api-response.json');
  fs.writeFileSync(responsePath, rawResponse, 'utf-8');

  return responsePath;
}

/**
 * Save console logs on failure
 */
export async function saveConsoleLogs(
  logs: string[],
  datasetName: string,
  imageName: string
): Promise<string> {
  const logsDir = path.join('reports', datasetName, imageName.replace(/\.[^/.]+$/, ''));
  ensureDir(logsDir);

  const logsPath = path.join(logsDir, 'console-logs.txt');
  fs.writeFileSync(logsPath, logs.join('\n'), 'utf-8');

  return logsPath;
}

/**
 * Get relative path for reporting
 */
export function getRelativePath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath);
}
