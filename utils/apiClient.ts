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
}

/**
 * Parse Server-Sent Events (SSE) response
 */
function parseSSEResponse(responseText: string): APIResponse {
  const result: APIResponse = {
    fullResponse: responseText,
  };
  
  // Parse SSE format: data: {...}
  const lines = responseText.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const jsonStr = line.substring(6).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          const data = JSON.parse(jsonStr);
          
          // Extract fields from various possible structures
          if (data.truth_label) result.truth_label = data.truth_label;
          if (data.source_url) result.source_url = data.source_url;
          if (data.fact_check_result) result.fact_check_result = data.fact_check_result;
          if (data.tags) result.tags = data.tags;
          if (data.score !== undefined) result.score = data.score;
          if (data.messageId) result.messageId = data.messageId;
          if (data.toolCallId) result.toolCallId = data.toolCallId;
          
          // Try to extract query from content if present
          if (data.content) {
            result.detectedQuery = data.content;
          }
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }
  }
  
  return result;
}

/**
 * Send image and query to PIB Fact Check API
 */
export async function sendFactCheckRequest(
  imagePath: string,
  query: string,
  timeout: number = 60000
): Promise<APIResponse> {
  const sessionId = generateSessionId();
  const imageBase64 = imageToBase64(imagePath);
  const imageName = path.basename(imagePath);
  
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
    
    if (parsedResponse.truth_label) {
      console.log(`   🏷️  Truth Label: ${parsedResponse.truth_label}`);
    }
    if (parsedResponse.source_url) {
      console.log(`   🔗 Source URL: ${parsedResponse.source_url}`);
    }
    
    return parsedResponse;
    
  } catch (error: any) {
    console.error(`   ❌ API request failed: ${error.message}`);
    throw new Error(`API request failed: ${error.message}`);
  }
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
