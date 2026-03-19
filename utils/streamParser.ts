import { StreamedResponse, ToolCall, TOOL_NAMES } from '../config/config';

/**
 * Parse streamed API response and extract tool calls
 */
export function parseStreamedResponse(streamData: string): StreamedResponse {
  const result: StreamedResponse = {
    rawData: streamData,
  };

  try {
    // Split by newlines to handle streaming chunks
    const lines = streamData.split('\n').filter(line => line.trim());
    
    let searchTextRAGData: any = null;
    let searchTextRAGCallId: string = '';
    let generateFinalAnswerData: any = null;
    let generateFinalAnswerCallId: string = '';
    let usageData: any = null;

    for (const line of lines) {
      try {
        // Handle prefixed format (e.g., "f:{...}", "9:{...}", "a:{...}")
        let jsonStr = line.trim();
        
        // Remove single-character prefix followed by colon if present
        if (jsonStr.match(/^[a-z0-9]:/i)) {
          jsonStr = jsonStr.substring(2).trim();
        }
        
        // Handle SSE format (data: {...})
        if (jsonStr.startsWith('data:')) {
          jsonStr = jsonStr.substring(5).trim();
        }
        
        if (!jsonStr || jsonStr === '[DONE]') {
          continue;
        }

        const chunk = JSON.parse(jsonStr);

        // Extract toolName and combine data
        if (chunk.toolName === TOOL_NAMES.SEARCH_TEXT_RAG) {
          searchTextRAGData = searchTextRAGData || {};
          searchTextRAGCallId = chunk.toolCallId || searchTextRAGCallId;
          Object.assign(searchTextRAGData, chunk);
          
          // Merge result data if present
          if (chunk.result) {
            searchTextRAGData.result = searchTextRAGData.result || {};
            Object.assign(searchTextRAGData.result, chunk.result);
          }
        } 
        // Match by toolCallId for subsequent chunks (result data)
        else if (searchTextRAGCallId && chunk.toolCallId === searchTextRAGCallId && chunk.result) {
          searchTextRAGData.result = searchTextRAGData.result || {};
          Object.assign(searchTextRAGData.result, chunk.result);
        }
        else if (chunk.toolName === TOOL_NAMES.GENERATE_FINAL_ANSWER) {
          generateFinalAnswerData = generateFinalAnswerData || {};
          generateFinalAnswerCallId = chunk.toolCallId || generateFinalAnswerCallId;
          Object.assign(generateFinalAnswerData, chunk);
          
          // Merge result data if present
          if (chunk.result) {
            generateFinalAnswerData.result = generateFinalAnswerData.result || {};
            Object.assign(generateFinalAnswerData.result, chunk.result);
          }
        }
        // Match by toolCallId for subsequent chunks (result data)
        else if (generateFinalAnswerCallId && chunk.toolCallId === generateFinalAnswerCallId && chunk.result) {
          generateFinalAnswerData.result = generateFinalAnswerData.result || {};
          Object.assign(generateFinalAnswerData.result, chunk.result);
        }

        // Extract usage information
        if (chunk.usage) {
          usageData = chunk.usage;
        }

        // Extract finish reason
        if (chunk.finishReason) {
          result.finishReason = chunk.finishReason;
        }

      } catch (parseError) {
        // Skip non-JSON lines
        continue;
      }
    }

    // Build searchTextRAG tool call
    if (searchTextRAGData) {
      result.searchTextRAG = buildToolCall(searchTextRAGData, TOOL_NAMES.SEARCH_TEXT_RAG);
    }

    // Build generateFinalAnswer tool call
    if (generateFinalAnswerData) {
      result.generateFinalAnswer = buildToolCall(generateFinalAnswerData, TOOL_NAMES.GENERATE_FINAL_ANSWER);
    }

    // Add usage information
    if (usageData) {
      result.usage = {
        promptTokens: usageData.promptTokens || 0,
        completionTokens: usageData.completionTokens || 0,
        totalTokens: usageData.totalTokens || (usageData.promptTokens || 0) + (usageData.completionTokens || 0),
      };
    }

  } catch (error) {
    console.error('Error parsing streamed response:', error);
  }

  return result;
}

/**
 * Build a ToolCall object from raw chunk data
 */
function buildToolCall(data: any, toolName: string): ToolCall {
  const toolCall: ToolCall = {
    toolCallId: data.toolCallId || '',
    toolName: toolName as any,
    exists: true,
    metadata: {
      relevant: false,
      source_url: ''
    },
    rawResponse: JSON.stringify(data),
  };

  // Extract metadata from nested result structure (actual API format)
  if (data.result?.metadata) {
    toolCall.metadata = {
      source_url: data.result.metadata.source_url || '',
      relevant: data.result.metadata.relevant !== undefined ? data.result.metadata.relevant : true,
      name: data.result.metadata.name || '',
      fact_check_result: data.result.metadata.fact_check_result || '',
    };
  } 
  // Fallback to direct metadata if present
  else if (data.metadata) {
    toolCall.metadata = data.metadata;
  }

  // Extract score from nested result or metadata
  if (data.result?.score !== undefined) {
    toolCall.score = data.result.score;
  } else if (data.score !== undefined) {
    toolCall.score = data.score;
  } else if (data.metadata?.score !== undefined) {
    toolCall.score = data.metadata.score;
  }

  // Extract final answer from nested result or args
  if (data.args?.finalAnswer !== undefined) {
    toolCall.finalAnswer = data.args.finalAnswer;
  } else if (data.result?.finalAnswer !== undefined) {
    toolCall.finalAnswer = data.result.finalAnswer;
  } else if (data.finalAnswer !== undefined) {
    toolCall.finalAnswer = data.finalAnswer;
  } else if (data.content !== undefined) {
    toolCall.finalAnswer = data.content;
  }

  return toolCall;
}

/**
 * Extract metadata from tool call response
 */
export function extractMetadata(toolCall: ToolCall | undefined): any {
  if (!toolCall) {
    return null;
  }

  return {
    toolCallId: toolCall.toolCallId,
    toolName: toolCall.toolName,
    metadata: toolCall.metadata,
    score: toolCall.score,
    finalAnswer: toolCall.finalAnswer,
  };
}

/**
 * Check if response contains expected tool calls
 */
export function validateToolCallsExist(response: StreamedResponse): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!response.searchTextRAG) {
    missing.push(TOOL_NAMES.SEARCH_TEXT_RAG);
  }

  if (!response.generateFinalAnswer) {
    missing.push(TOOL_NAMES.GENERATE_FINAL_ANSWER);
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Safely extract text content from various response formats
 */
export function extractTextContent(data: any): string {
  if (typeof data === 'string') {
    return data;
  }
  
  if (data?.content) {
    return String(data.content);
  }
  
  if (data?.finalAnswer) {
    return String(data.finalAnswer);
  }
  
  if (data?.text) {
    return String(data.text);
  }

  return JSON.stringify(data);
}
