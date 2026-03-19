# Framework Update - FCU Validation Logic

## Overview

The framework has been updated from generic RAG validation to **FCU Real-World PASS Behavior** validation logic based on PIB team's actual testing criteria.

## Key Changes

### 1. Validation Logic (4-Step Flow)

**Old Approach:** Score-based validation with similarity scoring, LLM-as-judge patterns

**New Approach:** Hard fail logic with semantic grouping

#### Step 1: Tool Call Validation
- **Hard fail** - test stops if this fails
- Checks: `toolCall.exists === true` AND `metadata.relevant === true`

#### Step 2: Verdict Validation
- Semantic verdict grouping instead of exact string matching
- Groups: FALSE_GROUP, MISLEADING_GROUP, TRUE_GROUP
- Example: "FAKE" matches expected "false" (both in FALSE_GROUP)

#### Step 3: Keyword Validation
- At least **ONE** keyword must match (not all)
- Case-insensitive search

#### Step 4: Status ID Validation
- Extracts Twitter/X status ID from `fact_check_link`
- Validates status ID appears in chatbot response

### 2. Dataset Format Changes

**Old Format:**
```json
{
  "image": "test.jpg",
  "query": "Is this true?",
  "expected_verdict": "false",
  "expected_keywords": ["keyword1", "keyword2"],
  "expected_twitter_url": "https://x.com/...",
  "minimum_score_threshold": 0.90
}
```

**New Format:**
```json
{
  "image": "image1.jpg",
  "expected_query": "Has any incident taken place...",
  "expected_response": "This claim is FAKE. No such incident...",
  "fact_check_link": "https://x.com/PIBFactCheck/status/1328727700702302208",
  "keywords": ["Indian Army", "fake", "Ladakh"]
}
```

### 3. File Structure Changes

**New Files:**
- `config/selectors.ts` - Separated UI selectors from config
- `utils/fileResolver.ts` - Case-insensitive image file matching
- `utils/verdictMapper.ts` - Semantic verdict grouping
- `validators/toolValidator.ts` - Step 1 validation
- `validators/verdictValidator.ts` - Step 2 validation
- `validators/keywordValidator.ts` - Step 3 validation
- `validators/statusIdValidator.ts` - Step 4 validation

**Deleted Files:**
- `validators/ragValidator.ts` (replaced by toolValidator)
- `validators/answerValidator.ts` (replaced by verdictValidator + keywordValidator)
- `validators/twitterValidator.ts` (replaced by statusIdValidator)

**Updated Files:**
- `config/config.ts` - New TestCase interface, updated DefectCategory enum, removed score fields
- `utils/datasetLoader.ts` - Integrated fileResolver for case-insensitive matching
- `utils/reportGenerator.ts` - Removed score metrics, updated HTML table columns
- `tests/datasetRunner.spec.ts` - New 4-step validation flow
- `tests/uiSmoke.spec.ts` - Updated selector references

### 4. Defect Categories

**Old Categories:**
- RAG_NO_MATCH
- LOW_CONFIDENCE_SCORE
- WRONG_VERDICT
- MISSING_SOURCE_URL
- BROKEN_TWITTER_LINK
- TOOL_CALL_FAILURE
- UI_RENDER_FAILURE
- RESET_FAILURE

**New Categories:**
- TOOL_CALL_FAILED
- TOOL_NOT_RELEVANT
- VERDICT_MISMATCH
- KEYWORD_VALIDATION_FAILED
- STATUS_ID_MISMATCH
- STATUS_ID_NOT_FOUND
- FILE_NOT_FOUND
- UI_SELECTOR_ERROR

### 5. Removed Features

- Similarity scoring (no more `score` field in TestResult)
- RAG confidence thresholds (no `minimum_score_threshold`)
- Twitter page HTTP validation (only status ID matching now)
- LLM-as-judge verdict validation
- "All keywords must match" requirement

### 6. Interface Changes

**TestResult:**
```typescript
// Removed:
score?: number;

// Added:
responseTime: number;
verdictDetected?: string;
keywordMatched?: string;
statusIdMatched?: boolean;
```

**DatasetSummary:**
```typescript
// Removed:
averageScore: number;

// Added:
failed: number;
```

**MasterSummary:**
```typescript
// Removed:
overallAverageScore: number;

// Added:
overallAverageResponseTime: number;
datasetSummaries: DatasetSummary[];  // Fixed typo from 'overallAveragees'
```

## Migration Checklist

✅ Update config/selectors.ts with actual chatbot selectors
✅ Update datasets/*/testcases.json to new format
✅ Add real test images to datasets/*/images/
✅ Run `npm test` to verify framework works
✅ Review HTML reports in reports/ folder
✅ Adjust verdict groups in utils/verdictMapper.ts if needed

## Testing

All TypeScript compilation passed:
```bash
npx tsc --noEmit
# Exit code: 0 ✅
```

## Documentation Updated

- ✅ README.md - New validation logic, defect categories, testcases.json format
- ✅ QUICK_REFERENCE.md - Updated examples and troubleshooting
- ✅ PROJECT_STRUCTURE.md - New file structure, validation flow

## Next Steps

1. **Add Real Test Data:** Replace sample test cases with actual PIB FCU data
2. **Configure Selectors:** Update config/selectors.ts with correct DOM selectors from https://pib.myscheme.in/
3. **Run Tests:** Execute `npm test` to validate framework with real data
4. **Review Reports:** Check generated HTML/JSON reports
5. **Fine-tune:** Adjust verdict groups or keywords as needed based on test results

---

**Updated:** 2024
**Framework Version:** 2.0 (FCU Validation)
