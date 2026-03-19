// ===========================
// CONFIGURATION & CONSTANTS
// ===========================

export const CONFIG = {
  CHATBOT_URL: 'https://pib.myscheme.in/',
  API_ENDPOINT: 'https://pib.myscheme.in/api/chat',
  DATASETS_DIR: './datasets',
  REPORTS_DIR: './reports',
  // Filter datasets by name (comma-separated). Example: TEST_DATASETS=dataset1,dataset4
  // Leave empty or undefined to test all datasets
  TEST_DATASETS: process.env.TEST_DATASETS ? process.env.TEST_DATASETS.split(',').map(d => d.trim()) : undefined,
  
  // Testing Mode - Run subset of tests
  // Example: TEST_MODE=true MAX_TESTS=5 npm run test:dataset10
  TEST_MODE: {
    enabled: process.env.TEST_MODE === 'true',
    maxTests: parseInt(process.env.MAX_TESTS || '5'),
  },
  
  // Report Generation - Only generate individual reports for failed tests
  REPORT_MODE: {
    onlyFailures: process.env.REPORT_ONLY_FAILURES === 'true' || true, // Default: true (save space)
    generateScreenshots: process.env.GENERATE_SCREENSHOTS === 'true' || false, // Default: false for API mode
  },
  
  // Rate Limiting - Delays between API requests
  RATE_LIMIT: {
    minDelaySeconds: parseFloat(process.env.RATE_LIMIT_MIN || '15'), // 15 seconds min (increased from 2)
    maxDelaySeconds: parseFloat(process.env.RATE_LIMIT_MAX || '30'), // 30 seconds max (increased from 5)
    errorDelayMultiplier: 3, // Triple delay after errors (increased from 2)
  },
  
  TIMEOUT: {
    API_RESPONSE: 60000,
    PAGE_LOAD: 30000,
    ELEMENT_WAIT: 10000,
    RESET_CHAT: 5000,
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
  },
};

// ===========================
// TYPE DEFINITIONS
// ===========================

export interface TestCase {
  image: string;
  expected_query: string;
  expected_response: string;
  fact_check_link: string;
  verdict?: string; // Optional: Separate verdict field (e.g., "fake", "misleading", "true")
  keywords: string[]; // Descriptive keywords (verdict keywords optional if verdict field is used)
}

export interface DatasetConfig {
  name: string;
  path: string;
  testcases: TestCase[];
}

export interface ToolCallMetadata {
  relevant: boolean;
  source_url: string;
  verdict?: string;
  explanation?: string;
  score?: number;
  [key: string]: any;
}

export interface ToolCall {
  toolCallId: string;
  toolName: 'searchTextRAG' | 'generateFinalAnswer';
  exists: boolean;
  metadata: ToolCallMetadata;
  score?: number;
  finalAnswer?: string;
  rawResponse?: string;
}

export interface StreamedResponse {
  searchTextRAG?: ToolCall;
  generateFinalAnswer?: ToolCall;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  rawData: string;
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  defectCategory?: DefectCategory;
}

export type DefectCategory =
  | 'TOOL_FAILURE'
  | 'WRONG_VERDICT'
  | 'KEYWORD_MISSING'
  | 'STATUS_ID_MISMATCH'
  | 'RESET_FAILURE'
  | 'FILE_NOT_FOUND'
  | 'UI_SELECTOR_ERROR'
  | 'API_ERROR'
  | 'NONE';

export interface TestResult {
  datasetName: string;
  imageName: string;
  query: string;
  queryDetected?: string;
  expectedResponse?: string;
  factCheckLink?: string;
  keywords?: string[];
  passed: boolean;
  responseTime: number;
  verdictDetected?: string;
  keywordMatched?: string;
  statusIdMatched?: boolean;
  defectCategory: DefectCategory;
  errors: string[];
  warnings: string[];
  screenshots: {
    response?: string;
    twitter?: string;
    failure?: string;
  };
  metadata: {
    searchTextRAG?: ToolCall;
    generateFinalAnswer?: ToolCall;
    usage?: StreamedResponse['usage'];
  };
  timestamp: string;
  // API-specific fields
  testMode?: 'UI' | 'API';
  sessionId?: string;
  httpStatus?: number;
  apiEndpoint?: string;
  retryAttempts?: number;
}

export interface DatasetSummary {
  datasetName: string;
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  averageResponseTime: number;
  results: TestResult[];
}

export interface MasterSummary {
  totalDatasets: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  overallAverageResponseTime: number;
  datasetSummaries: DatasetSummary[];
  timestamp: string;
}

// ===========================
// Selectors are now imported from config/selectors.ts
// ===========================

// ===========================
// CONSTANTS
// ===========================

export const TOOL_NAMES = {
  SEARCH_TEXT_RAG: 'searchTextRAG',
  GENERATE_FINAL_ANSWER: 'generateFinalAnswer',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const;

export const COLORS = {
  SUCCESS: '#28a745',
  FAILURE: '#dc3545',
  WARNING: '#ffc107',
  INFO: '#17a2b8',
} as const;
