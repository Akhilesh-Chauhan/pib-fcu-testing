import { ValidationResult, TestCase } from '../config/config';

/**
 * Synonym mapping for verdict-related keywords
 * Treats these as equivalent when matching
 */
const VERDICT_SYNONYMS: { [key: string]: string[] } = {
  'fake': ['fake', 'false', 'untrue', 'fabricated', 'baseless', 'incorrect'],
  'false': ['fake', 'false', 'untrue', 'fabricated', 'baseless', 'incorrect'],
  'misleading': ['misleading', 'misinterpreted', 'misrepresented', 'inaccurate', 'distorted'],
  'true': ['true', 'correct', 'accurate', 'genuine', 'verified'],
  'partially true': ['partially', 'partly true', 'half-truth'],
};

/**
 * Priority verdict keywords - if ANY of these are found, test should pass
 * These are the most critical indicators of a correct response
 */
const VERDICT_KEYWORDS = ['fake', 'false', 'misleading', 'true', 'partially true', 'correct', 'incorrect'];

/**
 * Check if a keyword is a verdict keyword
 */
function isVerdictKeyword(keyword: string): boolean {
  const normalized = normalizeText(keyword);
  return VERDICT_KEYWORDS.some(vk => normalized === normalizeText(vk) || 
                                     VERDICT_SYNONYMS[normalizeText(vk)]?.includes(normalized));
}

/**
 * Normalize text for keyword matching
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Common words to ignore in phrase matching
 */
const STOP_WORDS = new Set([
  'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'about', 'as', 'into', 'through',
  'will', 'has', 'have', 'had', 'do', 'does', 'did', 'can', 'could',
  'would', 'should', 'may', 'might', 'must', 'shall', 'this', 'that',
  'these', 'those', 'it', 'its', 'they', 'their', 'them'
]);

/**
 * Dynamically check if a word could be an abbreviation
 * Abbreviations are typically: uppercase, short (2-5 chars), or contain numbers
 */
function isLikelyAbbreviation(word: string): boolean {
  const normalized = word.toLowerCase();
  // Check if it's all uppercase in original (before normalization)
  const isUpperCase = word === word.toUpperCase() && word.length >= 2 && word.length <= 6;
  // Check if it contains numbers (like II, 2, etc.)
  const hasNumbers = /\d/.test(normalized);
  return isUpperCase || hasNumbers;
}

/**
 * Extract potential full forms from text that might match an abbreviation
 * Example: "Reserve Bank of India" -> ["reserve bank of india", "rbi"]
 */
function extractPotentialAbbreviations(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const abbreviations: string[] = [];
  
  // Find sequences of capitalized words that could form abbreviations
  const matches = text.match(/\b([A-Z][a-z]*(?:\s+[A-Z][a-z]*)+)\b/g);
  if (matches) {
    for (const match of matches) {
      // Create abbreviation from first letters
      const abbrev = match.split(/\s+/).map(w => w[0]).join('').toLowerCase();
      abbreviations.push(abbrev);
    }
  }
  
  return abbreviations;
}

/**
 * Flexible word matching that handles:
 * - Plural forms (word/words, atm/atms)
 * - Number variations (ii/2/two)
 * - Special characters (₹500/500)
 */
function wordsMatch(word1: string, word2: string): boolean {
  const w1 = word1.toLowerCase().replace(/[^\w]/g, '');
  const w2 = word2.toLowerCase().replace(/[^\w]/g, '');
  
  // Exact match
  if (w1 === w2) return true;
  
  // Plural variations (add/remove 's')
  if (w1 === w2 + 's' || w2 === w1 + 's') return true;
  if (w1 === w2 + 'es' || w2 === w1 + 'es') return true;
  
  // Number word variations
  const numberMap: { [key: string]: string[] } = {
    '1': ['i', 'one', '1'],
    '2': ['ii', 'two', '2'],
    '3': ['iii', 'three', '3'],
    '4': ['iv', 'four', '4'],
    '5': ['v', 'five', '5'],
  };
  
  for (const variants of Object.values(numberMap)) {
    if (variants.includes(w1) && variants.includes(w2)) return true;
  }
  
  return false;
}

/**
 * Check if a keyword or its synonyms are present in the response
 * Enhanced to handle multi-word phrases with flexible matching
 */
function isKeywordPresent(keyword: string, response: string): boolean {
  const normalizedKeyword = normalizeText(keyword);
  const normalizedResponse = normalizeText(response);
  
  // Direct exact match
  if (normalizedResponse.includes(normalizedKeyword)) {
    return true;
  }
  
  // Check synonyms for single words
  for (const [baseWord, synonyms] of Object.entries(VERDICT_SYNONYMS)) {
    if (normalizedKeyword === baseWord || synonyms.includes(normalizedKeyword)) {
      for (const syn of synonyms) {
        if (normalizedResponse.includes(syn)) {
          return true;
        }
      }
    }
  }
  
  // For multi-word phrases, check if most significant words are present
  if (normalizedKeyword.includes(' ')) {
    const keywordWords = normalizedKeyword
      .split(/\s+/)
      .filter(word => word.length > 0 && !STOP_WORDS.has(word));
    
    if (keywordWords.length === 0) return false;
    
    // Extract potential abbreviations from response
    const responseAbbreviations = extractPotentialAbbreviations(response);
    const responseWords = normalizedResponse.split(/\s+/);
    
    // Check each keyword word against response words
    const matchedWords = keywordWords.filter(keywordWord => {
      // Check direct match or plural variations in response
      for (const responseWord of responseWords) {
        if (wordsMatch(keywordWord, responseWord)) {
          return true;
        }
      }
      
      // If keyword word looks like abbreviation, check against extracted abbreviations
      if (isLikelyAbbreviation(keywordWord)) {
        // Try to match against potential abbreviations in response
        if (responseAbbreviations.some(abbrev => wordsMatch(keywordWord, abbrev))) {
          return true;
        }
        
        // Try to find expanded form in response
        // Example: "rbi" in keyword should match "reserve bank of india" in response
        const expandedPattern = new RegExp(keywordWord.split('').join('[a-z]*\\s+'), 'i');
        if (expandedPattern.test(response)) {
          return true;
        }
      }
      
      // If response contains capitalized words, check if keyword could be their abbreviation
      // Example: keyword "reserve bank" should match "RBI" in response
      if (keywordWord.length > 2 && !isLikelyAbbreviation(keywordWord)) {
        const words = keywordWord.split(/\s+/);
        if (words.length > 1) {
          const potentialAbbrev = words.map(w => w[0]).join('');
          if (responseAbbreviations.includes(potentialAbbrev) || 
              responseWords.some(rw => wordsMatch(potentialAbbrev, rw))) {
            return true;
          }
        }
      }
      
      return false;
    });
    
    // Consider it a match if at least 60% of significant words are present
    const matchPercentage = (matchedWords.length / keywordWords.length) * 100;
    return matchPercentage >= 60;
  }
  
  return false;
}

/**
 * Validate keyword presence with improved matching
 * Requirements:
 * - At least ONE keyword must be present (or its synonym)
 * - Case-insensitive matching
 * - Supports synonym mapping for verdict terms
 * - If testCase.verdict is provided, verdict keywords in keywords array are optional
 */
export function validateKeyword(
  actualResponse: string,
  testCase: TestCase
): ValidationResult & { keywordMatched?: string } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!actualResponse) {
    return {
      passed: false,
      errors: ['Actual response is empty'],
      warnings: [],
      defectCategory: 'KEYWORD_MISSING',
    };
  }

  if (!testCase.keywords || testCase.keywords.length === 0) {
    warnings.push('No keywords provided in test case');
    return {
      passed: true,
      errors: [],
      warnings,
    };
  }

  const matchedKeywords: string[] = [];
  const unmatchedKeywords: string[] = [];
  
  // Filter out verdict keywords if separate verdict field is provided
  const keywordsToCheck = testCase.verdict 
    ? testCase.keywords.filter(kw => !isVerdictKeyword(kw))
    : testCase.keywords;

  // If all keywords were verdict keywords and we have a separate verdict field, pass
  if (keywordsToCheck.length === 0 && testCase.verdict) {
    return {
      passed: true,
      errors: [],
      warnings: ['All keywords were verdict keywords; validated separately via verdict field'],
    };
  }

  // Check each keyword
  for (const keyword of keywordsToCheck) {
    if (isKeywordPresent(keyword, actualResponse)) {
      matchedKeywords.push(keyword);
    } else {
      unmatchedKeywords.push(keyword);
    }
  }

  const totalKeywords = keywordsToCheck.length;
  const matchedCount = matchedKeywords.length;
  const matchPercentage = (matchedCount / totalKeywords) * 100;

  // Pass if at least ONE keyword is matched
  const passed = matchedCount > 0;

  if (!passed) {
    const expectedKeywordsMsg = testCase.verdict 
      ? `Expected any of: ${keywordsToCheck.join(', ')} (verdict keywords validated separately)`
      : `Expected any of: ${keywordsToCheck.join(', ')}`;
    errors.push(
      `None of the expected keywords found. ` + expectedKeywordsMsg
    );
  } else if (matchPercentage < 100) {
    // Provide info about partial matches
    warnings.push(
      `${matchedCount}/${totalKeywords} keywords matched (${matchPercentage.toFixed(0)}%). ` +
      `Missing: ${unmatchedKeywords.join(', ')}`
    );
  }

  return {
    passed,
    errors,
    warnings,
    defectCategory: passed ? undefined : 'KEYWORD_MISSING',
    keywordMatched: matchedKeywords.length > 0 ? matchedKeywords.join(', ') : undefined,
  };
}
