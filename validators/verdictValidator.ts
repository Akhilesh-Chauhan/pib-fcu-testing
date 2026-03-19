import { ValidationResult, TestCase } from '../config/config';
import { checkVerdictMatch, VerdictGroup } from '../utils/verdictMapper';

/**
 * Validate verdict using FCU semantic grouping logic (Step 2)
 * PASS if actual response contains ANY term from the same verdict group
 */
export function validateVerdict(
  actualResponse: string,
  testCase: TestCase
): ValidationResult & { verdictDetected?: string; expectedGroup?: VerdictGroup; actualGroup?: VerdictGroup } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!actualResponse) {
    return {
      passed: false,
      errors: ['Actual response is empty'],
      warnings: [],
      defectCategory: 'WRONG_VERDICT',
    };
  }

  // If testCase has separate verdict field, use it. Otherwise extract from expected_response
  const expectedText = testCase.verdict || testCase.expected_response;
  
  // Use verdict mapper to check semantic match
  const verdictCheck = checkVerdictMatch(expectedText, actualResponse);

  if (!verdictCheck.matched) {
    errors.push(
      `Verdict mismatch: Expected group "${verdictCheck.expectedGroup}" but got "${verdictCheck.actualGroup}"`
    );
  }

  return {
    passed: verdictCheck.matched,
    errors,
    warnings,
    defectCategory: verdictCheck.matched ? undefined : 'WRONG_VERDICT',
    verdictDetected: verdictCheck.actualMatchedTerm,
    expectedGroup: verdictCheck.expectedGroup,
    actualGroup: verdictCheck.actualGroup,
  };
}
