import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosRequestConfig } from 'axios';
import { CONFIG } from '../config/config';

/**
 * Generate unique session ID for API requests
 */
function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Convert image file to base64 data URL
 */
export function imageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  // Determine content type from file extension
  const ext = path.extname(imagePath).toLowerCase();
  const contentTypeMap: { [key: string]: string } = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
  };
  const contentType = contentTypeMap[ext] || 'image/png';
  
  return `data:${contentType};base64,${base64Image}`;
}

/**
 * API Response structure
 */
export interface APIResponse {
  messageId?: string;
  toolCallId?: string;
  truth_label?: string;
  source_url?: string;
  fact_check_result?: string;
  tags?: string[];
  score?: number;
  fullResponse: string;
  detectedQuery?: string;
  // Metadata for reporting
  sessionId?: string;
  httpStatus?: number;
  apiEndpoint?: string;
  retryAttempts?: number;
}

/**
 * Parse Server-Sent Events (SSE) response
 * Handles both standard SSE format (data:) and custom format (f:, 9:, a:, etc.)
 */
function parseSSEResponse(responseText: string): APIResponse {
  const result: APIResponse = {
    fullResponse: responseText,
  };
  
  // Parse streaming response format
  const lines = responseText.split('\n');
  
  for (const line of lines) {
    let jsonStr = '';
    
    // Handle standard SSE format: data: {...}
    if (line.startsWith('data: ')) {
      jsonStr = line.substring(6).trim();
    }
    // Handle custom format: f:{...}, 9:{...}, a:{...}, etc.
    else if (line.match(/^[a-zA-Z0-9]+:/)) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        jsonStr = line.substring(colonIndex + 1).trim();
      }
    }
    
    if (jsonStr && jsonStr !== '[DONE]') {
      try {
        const data = JSON.parse(jsonStr);
        
        // Extract messageId
        if (data.messageId) {
          result.messageId = data.messageId;
        }
        
        // Extract toolCallId and toolName
        if (data.toolCallId) {
          result.toolCallId = data.toolCallId;
        }
        
        // Extract from result.metadata (nested structure)
        if (data.result && data.result.metadata) {
          const metadata = data.result.metadata;
          
          if (metadata.truth_label) result.truth_label = metadata.truth_label;
          if (metadata.source_url) result.source_url = metadata.source_url;
          if (metadata.fact_check_result) result.fact_check_result = metadata.fact_check_result;
          if (metadata.tags) result.tags = metadata.tags;
          if (metadata.score !== undefined) result.score = metadata.score;
          if (metadata.verdict) result.truth_label = metadata.verdict;
        }
        
        // Also check top-level fields (fallback)
        if (data.truth_label) result.truth_label = data.truth_label;
        if (data.source_url) result.source_url = data.source_url;
        if (data.fact_check_result) result.fact_check_result = data.fact_check_result;
        if (data.tags) result.tags = data.tags;
        if (data.score !== undefined) result.score = data.score;
        
        // Try to extract query from content or args
        if (data.content) {
          result.detectedQuery = data.content;
        }
        if (data.args && data.args.reason) {
          result.detectedQuery = data.args.reason;
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }
  }
  
  return result;
}

/**
 * Send image and query to PIB Fact Check API with retry logic
 */
export async function sendFactCheckRequest(
  imagePath: string,
  query: string,
  timeout: number = 60000,
  maxRetries: number = 3
): Promise<APIResponse> {
  const sessionId = generateSessionId();
  const imageBase64 = imageToBase64(imagePath);
  const imageName = path.basename(imagePath);
  const apiEndpoint = CONFIG.API_ENDPOINT || 'https://pib.myscheme.in/api/chat';
  
  const requestBody = {
    id: sessionId,
    messages: [
      {
        role: 'user',
        content: query,
        experimental_attachments: [
          {
            name: imageName,
            contentType: imageName.endsWith('.jpg') || imageName.endsWith('.jpeg') 
              ? 'image/jpeg' 
              : 'image/png',
            url: imageBase64,
          },
        ],
      },
    ],
  };
  
  console.log(`   📤 Sending API request...`);
  console.log(`      Session ID: ${sessionId}`);
  console.log(`      Image: ${imageName}`);
  console.log(`      Query: ${query.substring(0, 60)}...`);
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: CONFIG.API_ENDPOINT || 'https://pib.myscheme.in/api/chat',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        data: requestBody,
        timeout: timeout,
        responseType: 'text',
      };
      
      const response = await axios(config);
      
      console.log(`   ✅ API response received (${response.data.length} bytes)`);
      
      const parsedResponse = parseSSEResponse(response.data);
      
      // Add metadata
      parsedResponse.sessionId = sessionId;
      parsedResponse.httpStatus = response.status;
      parsedResponse.apiEndpoint = apiEndpoint;
      parsedResponse.retryAttempts = attempt - 1;
      
      if (parsedResponse.truth_label) {
        console.log(`   🏷️  Truth Label: ${parsedResponse.truth_label}`);
      }
      if (parsedResponse.source_url) {
        console.log(`   🔗 Source URL: ${parsedResponse.source_url}`);
      }
      
      return parsedResponse;
      
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error (429)
      if (error.response?.status === 429) {
        if (attempt < maxRetries) {
          const retryDelay = Math.pow(2, attempt) * 5000; // Exponential backoff: 10s, 20s, 40s
          console.warn(`   ⚠️  Rate limited (429), retrying in ${retryDelay/1000}s... (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        } else {
          // Max retries reached, return error response with metadata
          const errorResponse: APIResponse = {
            fullResponse: '',
            sessionId,
            httpStatus: 429,
            apiEndpoint,
            retryAttempts: maxRetries,
          };
          throw Object.assign(new Error(`API rate limit exceeded (429) after ${maxRetries} retries`), { response: errorResponse });
        }
      }
      
      // For other errors, include metadata
      const errorResponse: APIResponse = {
        fullResponse: '',
        sessionId,
        httpStatus: error.response?.status || 0,
        apiEndpoint,
        retryAttempts: attempt - 1,
      };
      console.error(`   ❌ API request failed: ${error.message}`);
      throw Object.assign(new Error(`API request failed: ${error.message}`), { response: errorResponse });
    }
  }
  
  // All retries exhausted
  console.error(`   ❌ All ${maxRetries} retry attempts failed`);
  throw new Error(`API request failed after ${maxRetries} retries: ${lastError.message}`);
}

/**
 * Add random delay between requests to prevent rate limiting
 */
export async function addRateLimitDelay(
  minSeconds: number = 2,
  maxSeconds: number = 5,
  hadError: boolean = false
): Promise<void> {
  const baseDelay = Math.random() * (maxSeconds - minSeconds) + minSeconds;
  const delay = hadError ? baseDelay * 2 : baseDelay;
  const delayMs = delay * 1000;
  
  console.log(`   ⏳ Rate limit delay: ${delay.toFixed(1)}s`);
  
  await new Promise(resolve => setTimeout(resolve, delayMs));
}
