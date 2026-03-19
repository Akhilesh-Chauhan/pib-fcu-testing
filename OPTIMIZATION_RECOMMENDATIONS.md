# Framework Optimization Recommendations

Based on analysis of Python PIB Fact Check Validator framework.

---

## 🎯 High-Impact Optimizations (RECOMMENDED)

### 1. Enhanced Summary Statistics ⭐⭐⭐
**Current**: Basic pass/fail counts  
**Python Framework**: Detailed breakdown by verdict, error types, match rates

#### Implementation:
```typescript
// Add to DatasetSummary interface in config/config.ts
export interface DatasetSummary {
  // ... existing fields
  verdictBreakdown: {
    fake: { total: number; passed: number; failed: number };
    misleading: { total: number; passed: number; failed: number };
    true: { total: number; passed: number; failed: number };
  };
  errorBreakdown: {
    keyword_mismatch: number;
    verdict_mismatch: number;
    status_id_missing: number;
    ui_error: number;
    timeout: number;
  };
  linkMatchRate: {
    matched: number;
    notMatched: number;
    matchPercentage: number;
  };
}
```

**Benefits**:
- Identify which verdict types fail most
- Pinpoint specific error categories
- Track link validation accuracy

---

### 2. Testing Mode (Subset Processing) ⭐⭐⭐
**Current**: Must process all tests in dataset  
**Python Framework**: `MAX_IMAGES = 3` for quick testing

#### Implementation:
```typescript
// Add to playwright.config.ts or as environment variable
export const TEST_MODE = {
  enabled: process.env.TEST_MODE === 'true',
  maxTests: parseInt(process.env.MAX_TESTS || '3'),
};

// In datasetRunner.spec.ts
const testcases = TEST_MODE.enabled 
  ? dataset.testcases.slice(0, TEST_MODE.maxTests)
  : dataset.testcases;
```

**Usage**:
```bash
TEST_MODE=true MAX_TESTS=5 npm run test:dataset10
```

**Benefits**:
- Quick validation before full run
- Saves time during development
- Faster CI/CD pipeline testing

---

### 3. CSV Import for Test Cases ⭐⭐
**Current**: Manual JSON creation  
**Python Framework**: CSV-based queries with simple format

#### Implementation:
```typescript
// utils/csvImporter.ts
import * as fs from 'fs';
import * as csv from 'csv-parser';

export async function importTestCasesFromCSV(csvPath: string): Promise<TestCase[]> {
  const testcases: TestCase[] = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        testcases.push({
          image: row.image,
          expected_query: row.query,
          expected_response: row.expected_response,
          fact_check_link: row.fact_check_link,
          keywords: row.keywords?.split(',').map((k: string) => k.trim()) || [],
          verdict: row.verdict as 'fake' | 'misleading' | 'true',
        });
      })
      .on('end', () => resolve(testcases))
      .on('error', reject);
  });
}
```

**CSV Format**:
```csv
image,query,expected_response,fact_check_link,keywords,verdict
Image 1.png,Has Delhi University...,Fake order...,"https://x.com/PIB...","Delhi University,fake order,reopening",fake
```

**Benefits**:
- Easier for non-technical users to add tests
- Bulk import from existing data
- Excel-friendly editing

---

### 4. Enhanced Rate Limiting with Adaptive Delays ⭐⭐
**Current**: Browser restart every 25 tests  
**Python Framework**: 10-20 second random delays between requests

#### Implementation:
```typescript
// Add to datasetRunner.spec.ts
const RATE_LIMITING = {
  minDelay: 2000,        // 2 seconds minimum
  maxDelay: 5000,        // 5 seconds maximum
  adaptiveMode: true,    // Increase delays after errors
  errorDelayMultiplier: 2,
};

async function adaptiveDelay(hadError: boolean = false) {
  const baseDelay = Math.random() * 
    (RATE_LIMITING.maxDelay - RATE_LIMITING.minDelay) + 
    RATE_LIMITING.minDelay;
    
  const delay = hadError ? 
    baseDelay * RATE_LIMITING.errorDelayMultiplier : 
    baseDelay;
    
  console.log(`   ⏳ Waiting ${(delay/1000).toFixed(1)}s before next test...`);
  await page.waitForTimeout(delay);
}

// After each test
if (i < dataset.testcases.length - 1) {
  await resetChat(page);
  await adaptiveDelay(result.passed === false);
}
```

**Benefits**:
- Reduces server load
- Prevents rate limiting issues
- Adapts to errors automatically

---

### 5. Link/URL Validation Enhancement ⭐⭐
**Current**: Basic fact_check_link in test cases  
**Python Framework**: Extracts URLs from response and validates against expected

#### Implementation:
```typescript
// validators/linkValidator.ts
export function validateFactCheckLink(
  responseText: string,
  expectedLink: string
): { matched: boolean; extractedLinks: string[]; warnings: string[] } {
  const warnings: string[] = [];
  
  // Extract all URLs from response
  const urlPattern = /https?:\/\/[^\s\)"']+/g;
  const extractedLinks = responseText.match(urlPattern) || [];
  
  // Normalize URLs (strip whitespace, trailing slashes)
  const normalizedExpected = expectedLink.trim().replace(/\/$/, '');
  const normalizedExtracted = extractedLinks.map(url => 
    url.trim().replace(/\/$/, '')
  );
  
  // Check for exact match
  const matched = normalizedExtracted.some(link => 
    link === normalizedExpected ||
    link.includes(normalizedExpected) ||
    normalizedExpected.includes(link)
  );
  
  if (!matched && extractedLinks.length > 0) {
    warnings.push(`Expected: ${normalizedExpected}, Found: ${extractedLinks.join(', ')}`);
  }
  
  return { matched, extractedLinks, warnings };
}
```

**Usage in test**:
```typescript
const linkValidation = validateFactCheckLink(response.text, testcase.fact_check_link);
result.metadata.linkMatched = linkValidation.matched;
result.warnings.push(...linkValidation.warnings);
```

**Benefits**:
- Better link validation accuracy
- Identify incorrect reference links
- Track link match rates

---

## ⚡ Medium-Impact Optimizations

### 6. Progress Indicators ⭐⭐
**Python Framework**: Shows `[1/3]` progress, estimated time

#### Implementation:
```typescript
// Add to test execution
const startTime = Date.now();
console.log(`\n[${testNumber}/${dataset.testcases.length}] 🖼️  Image: ${testcase.image}`);

// After each test
const elapsed = Date.now() - startTime;
const avgTimePerTest = elapsed / testNumber;
const remainingTests = dataset.testcases.length - testNumber;
const estimatedTimeRemaining = (avgTimePerTest * remainingTests) / 1000 / 60;

console.log(`   📊 Progress: ${((testNumber/dataset.testcases.length)*100).toFixed(1)}%`);
console.log(`   ⏱️  Est. Time Remaining: ${estimatedTimeRemaining.toFixed(1)} minutes`);
```

**Benefits**:
- Better visibility into long-running tests
- Helps plan test execution time
- User-friendly feedback

---

### 7. Multiple Output Formats ⭐
**Current**: JSON and HTML reports  
**Python Framework**: CSV, JSON, and TXT reports

#### Implementation:
```typescript
// utils/reportGenerator.ts
export function generateCSVReport(datasetSummary: DatasetSummary): void {
  const csvRows = [
    ['Image', 'Query', 'Verdict', 'Keywords Found', 'Passed', 'Response Time', 'Errors']
  ];
  
  for (const result of datasetSummary.testResults) {
    csvRows.push([
      result.imageName,
      result.query,
      result.metadata.verdict || 'N/A',
      result.metadata.keywordMatchResults?.join(', ') || 'None',
      result.passed ? 'Yes' : 'No',
      `${result.responseTime}ms`,
      result.errors.join('; ')
    ]);
  }
  
  const csv = csvRows.map(row => row.join(',')).join('\n');
  fs.writeFileSync(
    path.join('reports', datasetSummary.datasetName, 'dataset-report.csv'),
    csv
  );
}
```

**Benefits**:
- Excel-friendly format for analysis
- Easy sharing with non-technical stakeholders
- Compatible with data analysis tools

---

### 8. Configurable Validation Keywords ⭐
**Current**: Hardcoded validation logic  
**Python Framework**: `VALIDATION_KEYWORDS = ["Fake", "Misleading", ...]`

#### Implementation:
```typescript
// config/config.ts
export const VALIDATION_CONFIG = {
  keywords: {
    fake: ['fake', 'false', 'fabricated', 'morphed', 'not issued'],
    misleading: ['misleading', 'out of context', 'partially true'],
    true: ['true', 'correct', 'verified', 'authentic'],
  },
  strictMode: false, // If true, requires exact match
};
```

**Benefits**:
- Easy to update validation rules
- No code changes for new keywords
- Configurable per use case

---

## 🔄 Architecture Considerations

### 9. Hybrid Approach: API + UI Testing ⭐⭐⚠️
**Python Framework**: Direct API calls (faster, no browser overhead)  
**Your Framework**: Browser automation (tests full UI flow)

#### Recommendation:
Add optional API-only mode for smoke tests:

```typescript
// utils/apiClient.ts (NEW)
export async function sendAPIRequest(
  image: Buffer,
  query: string
): Promise<{ truth_label: string; source_url: string; response: string }> {
  const base64Image = image.toString('base64');
  
  const response = await fetch('https://pib.myscheme.in/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: generateId(),
      messages: [{
        role: 'user',
        content: query,
        experimental_attachments: [{
          name: 'image.png',
          contentType: 'image/png',
          url: `data:image/png;base64,${base64Image}`
        }]
      }]
    })
  });
  
  return parseResponse(await response.text());
}
```

**When to use each**:
- **API Mode**: Quick validation, CI/CD smoke tests, regression testing
- **UI Mode**: Full e2e testing, screenshot capture, UI interaction validation

---

## 📊 Implementation Priority

| Priority | Optimization | Effort | Impact | Timeline |
|----------|-------------|--------|--------|----------|
| 🔥 HIGH | Testing Mode (subset) | 1 hour | High | Immediate |
| 🔥 HIGH | Enhanced Statistics | 3 hours | High | Week 1 |
| ⚡ MEDIUM | CSV Import | 4 hours | Medium | Week 2 |
| ⚡ MEDIUM | Link Validation | 2 hours | Medium | Week 1 |
| ⚡ MEDIUM | Progress Indicators | 1 hour | Medium | Week 1 |
| 🔵 LOW | CSV Reports | 2 hours | Low | Week 3 |
| 🔵 LOW | Configurable Keywords | 2 hours | Low | Week 2 |
| ⚠️ CONSIDER | API Mode | 8+ hours | Variable | Week 4+ |

---

## 🚀 Quick Wins (Implement First)

### Week 1 Priority:
1. ✅ **Testing Mode** - Add `MAX_TESTS` environment variable (1 hour)
2. ✅ **Progress Indicators** - Show percentage and estimated time (1 hour)
3. ✅ **Link Validation** - Enhance URL matching logic (2 hours)
4. ✅ **Enhanced Statistics** - Add verdict breakdown (3 hours)

**Total**: ~7 hours of work for significant improvements

---

## 📝 NOT Recommended

### ❌ Complete Rewrite to Python
- Your Playwright framework tests the actual UI
- Browser automation provides screenshot evidence
- TypeScript codebase is already well-structured
- Python framework is API-only (different use case)

### ❌ 10-20 Second Delays Between Tests
- Browser automation is slower by nature
- Your 25-test restart strategy is more effective
- Rate limiting less critical for UI testing

### ❌ Base64 Image Encoding
- Playwright handles file uploads natively
- No benefit for browser automation
- Adds unnecessary complexity

---

## 🎓 Key Takeaways

**What works in Python framework**:
✅ Summary statistics and breakdowns  
✅ Testing mode for quick validation  
✅ Multiple output formats  
✅ Progress tracking  
✅ Link validation logic  

**What doesn't apply to your framework**:
❌ API-only approach (you need UI testing)  
❌ Base64 encoding (not needed for browser)  
❌ Long delays (browser is already slow)  

**Your framework's strengths** (keep these):
✅ Browser automation with screenshots  
✅ UI interaction validation  
✅ Comprehensive HTML reports  
✅ Automatic browser restart (memory management)  
✅ Multiple validator types (verdict, keyword, status ID)  

---

## 📞 Implementation Support

For implementing these optimizations:
1. Start with **Testing Mode** - easiest and highest ROI
2. Add **Enhanced Statistics** - improves reporting significantly
3. Consider **CSV Import** - if non-technical users need to add tests
4. Evaluate **API Mode** - only if you need ultra-fast smoke tests

**Contact**: Review this document with your team before implementation.

---

**Last Updated**: March 19, 2026  
**Status**: 📋 Recommendations Ready for Implementation
