import { ValidationResult, TestCase } from '../config/config';

/**
 * Extract numeric status ID from Twitter/X URL
 * Examples:
 * - https://x.com/PIBFactCheck/status/1328727700702302208?s=20 → 1328727700702302208
 * - https://twitter.com/PIBFactCheck/status/1234567890 → 1234567890
 */
export function extractStatusId(url: string): string | null {
  if (!url) {
    return null;
  }

  // Match status ID pattern (numeric ID after /status/)
  const statusIdPattern = /\/status\/(\d+)/i;
  const match = url.match(statusIdPattern);

  return match ? match[1] : null;
}

/**
 * Validate status ID presence (Step 4)
 * FCU Logic: PASS if actual response OR source_url contains same numeric status ID,
 * regardless of x.com/twitter.com or formatting differences
 */
export function validateStatusId(
  actualResponse: string,
  testCase: TestCase,
  sourceUrl?: string
): ValidationResult & { statusIdMatched?: boolean; expectedStatusId?: string } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!actualResponse && !sourceUrl) {
    return {
      passed: false,
      errors: ['Actual response and source URL are both empty'],
      warnings: [],
      defectCategory: 'STATUS_ID_MISMATCH',
    };
  }

  if (!testCase.fact_check_link) {
    warnings.push('No fact_check_link provided in test case');
    return {
      passed: true,
      errors: [],
      warnings,
    };
  }

  // Extract status ID from expected fact check link
  const expectedStatusId = extractStatusId(testCase.fact_check_link);

  if (!expectedStatusId) {
    warnings.push(`Could not extract status ID from fact_check_link: ${testCase.fact_check_link}`);
    return {
      passed: true,
      errors: [],
      warnings,
    };
  }

  // Check if actual response OR source URL contains this status ID
  const statusIdInResponse = actualResponse?.includes(expectedStatusId) || false;
  const statusIdInSource = sourceUrl?.includes(expectedStatusId) || false;
  const statusIdMatched = statusIdInResponse || statusIdInSource;

  if (!statusIdMatched) {
    errors.push(
      `Status ID not found in response or source URL. Expected: ${expectedStatusId} from ${testCase.fact_check_link}`
    );
  }

  return {
    passed: statusIdMatched,
    errors,
    warnings,
    defectCategory: statusIdMatched ? undefined : 'STATUS_ID_MISMATCH',
    statusIdMatched,
    expectedStatusId,
  };
}

/**
 * Validate full fact check link presence
 */
export function validateFactCheckLink(
  actualResponse: string,
  testCase: TestCase
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!actualResponse) {
    return {
      passed: false,
      errors: ['Actual response is empty'],
      warnings: [],
    };
  }

  if (!testCase.fact_check_link) {
    return {
      passed: true,
      errors: [],
      warnings: ['No fact_check_link in test case'],
    };
  }

  // Check if response contains the link (with flexibility for x.com vs twitter.com)
  const normalizedResponse = actualResponse.toLowerCase();
  const normalizedLink = testCase.fact_check_link.toLowerCase();

  // Extract status ID and check for it
  const statusId = extractStatusId(testCase.fact_check_link);
  
  if (statusId && normalizedResponse.includes(statusId)) {
    return {
      passed: true,
      errors: [],
      warnings: [],
    };
  }

  // Try exact link match
  if (normalizedResponse.includes(normalizedLink)) {
    return {
      passed: true,
      errors: [],
      warnings: [],
    };
  }

  // Try with domain variations
  const linkVariations = [
    normalizedLink.replace('x.com', 'twitter.com'),
    normalizedLink.replace('twitter.com', 'x.com'),
  ];

  for (const variation of linkVariations) {
    if (normalizedResponse.includes(variation)) {
      return {
        passed: true,
        errors: [],
        warnings: [],
      };
    }
  }

  warnings.push('Fact check link not found in response');

  return {
    passed: true,
    errors: [],
    warnings,
  };
}
