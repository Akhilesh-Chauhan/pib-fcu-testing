/**
 * Verdict Mapping and Grouping Logic
 * Based on FCU real-world PASS behavior
 */

export type VerdictGroup = 'FALSE_GROUP' | 'MISLEADING_GROUP' | 'TRUE_GROUP' | 'UNKNOWN';

/**
 * Verdict groups for semantic matching
 */
export const VERDICT_GROUPS = {
  FALSE_GROUP: ['false', 'fake', 'not true', 'incorrect', 'misleading', 'fabricated', 'misinformation'],
  MISLEADING_GROUP: ['misleading', 'partially true', 'partly true', 'partly false'],
  TRUE_GROUP: ['true', 'correct', 'accurate', 'verified', 'factual'],
} as const;

/**
 * Determine verdict group from expected response text
 */
export function determineVerdictGroup(expectedResponse: string): VerdictGroup {
  const normalized = expectedResponse.toLowerCase();

  // Check FALSE_GROUP (check this first as it's most common)
  for (const term of VERDICT_GROUPS.FALSE_GROUP) {
    if (normalized.includes(term)) {
      return 'FALSE_GROUP';
    }
  }

  // Check TRUE_GROUP
  for (const term of VERDICT_GROUPS.TRUE_GROUP) {
    if (normalized.includes(term)) {
      return 'TRUE_GROUP';
    }
  }

  // Check MISLEADING_GROUP
  for (const term of VERDICT_GROUPS.MISLEADING_GROUP) {
    if (normalized.includes(term)) {
      return 'MISLEADING_GROUP';
    }
  }

  return 'UNKNOWN';
}

/**
 * Extract verdict from actual response text
 */
export function extractVerdictFromResponse(actualResponse: string): {
  group: VerdictGroup;
  matchedTerm?: string;
} {
  const normalized = actualResponse.toLowerCase();

  // Check FALSE_GROUP
  for (const term of VERDICT_GROUPS.FALSE_GROUP) {
    if (normalized.includes(term)) {
      return { group: 'FALSE_GROUP', matchedTerm: term };
    }
  }

  // Check TRUE_GROUP
  for (const term of VERDICT_GROUPS.TRUE_GROUP) {
    if (normalized.includes(term)) {
      return { group: 'TRUE_GROUP', matchedTerm: term };
    }
  }

  // Check MISLEADING_GROUP
  for (const term of VERDICT_GROUPS.MISLEADING_GROUP) {
    if (normalized.includes(term)) {
      return { group: 'MISLEADING_GROUP', matchedTerm: term };
    }
  }

  return { group: 'UNKNOWN' };
}

/**
 * Check if verdict groups match
 */
export function checkVerdictMatch(
  expectedResponse: string,
  actualResponse: string
): {
  matched: boolean;
  expectedGroup: VerdictGroup;
  actualGroup: VerdictGroup;
  actualMatchedTerm?: string;
} {
  const expectedGroup = determineVerdictGroup(expectedResponse);
  const { group: actualGroup, matchedTerm: actualMatchedTerm } = extractVerdictFromResponse(actualResponse);

  const matched = expectedGroup === actualGroup && expectedGroup !== 'UNKNOWN';

  return {
    matched,
    expectedGroup,
    actualGroup,
    actualMatchedTerm,
  };
}

/**
 * Get all terms for a verdict group
 */
export function getVerdictGroupTerms(group: VerdictGroup): readonly string[] {
  switch (group) {
    case 'FALSE_GROUP':
      return VERDICT_GROUPS.FALSE_GROUP;
    case 'MISLEADING_GROUP':
      return VERDICT_GROUPS.MISLEADING_GROUP;
    case 'TRUE_GROUP':
      return VERDICT_GROUPS.TRUE_GROUP;
    default:
      return [];
  }
}
