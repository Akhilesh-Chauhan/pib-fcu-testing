import { ToolCall, ValidationResult } from '../config/config';

/**
 * Validate tool call response (Step 1 - Hard Fail)
 * FCU Logic: FAIL if searchTextRAG.exists !== true OR metadata.relevant !== true
 */
export function validateToolCall(toolCall: ToolCall | undefined): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if tool call exists
  if (!toolCall) {
    return {
      passed: false,
      errors: ['searchTextRAG tool call not found in response'],
      warnings: [],
      defectCategory: 'TOOL_FAILURE',
    };
  }

  // Hard Fail Condition 1: exists !== true
  if (!toolCall.exists) {
    errors.push('searchTextRAG.exists is not true');
  }

  // Hard Fail Condition 2: metadata.relevant !== true
  if (!toolCall.metadata) {
    errors.push('searchTextRAG.metadata is missing');
  } else if (toolCall.metadata.relevant !== true) {
    errors.push('searchTextRAG.metadata.relevant is not true');
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    defectCategory: errors.length > 0 ? 'TOOL_FAILURE' : undefined,
  };
}
