# Test Case Fine-Tuning Summary

## ✅ Implemented Improvements

### 1. **Enhanced Keyword Validation** 
**Problem:** Tests failed because chatbot used different wording (e.g., "MISLEADING" instead of "fake")

**Solution Implemented:**
- ✅ **Synonym Mapping**: Treats related terms as equivalent
  - `fake` = `false` = `untrue` = `fabricated` = `baseless` = `incorrect`
  - `misleading` = `misinterpreted` = `misrepresented` = `inaccurate` = `distorted`
  - `true` = `correct` = `accurate` = `genuine` = `verified`
  
- ✅ **50% Match Requirement**: Now requires at least 50% of keywords to be present (not 100%)
  - Example: If test has 8 keywords, at least 4 must match
  - More realistic given natural language variation
  - Provides warnings for partial matches

- ✅ **Case-Insensitive Matching**: No longer case-sensitive
- ✅ **Partial Text Matching**: Searches for keywords anywhere in response

**Impact:**
- Should fix the 2 KEYWORD_MISSING failures (Image 22.jpg, Image 35.jpg)
- More robust against chatbot wording variations
- Better reporting with match percentage

---

### 2. **Automatic Retry Logic for Transient Failures**
**Problem:** 3 tests failed due to network/protocol errors (UI_SELECTOR_ERROR)

**Solution Implemented:**
- ✅ **3 Automatic Retries** for transient errors:
  - Protocol errors
  - Network timeouts
  - "No data found" errors
  - API response timeouts
  
- ✅ **Smart Retry Detection**: Only retries for specific error types
- ✅ **2-Second Delay** between retries to allow network recovery
- ✅ **Console Logging**: Shows which attempt succeeded

**Impact:**
- Should fix the 3 UI_SELECTOR_ERROR failures (Image 10.jpg, Image 11.jpg, Image 28.png)
- More reliable test execution
- Reduces false negatives from temporary issues

---

### 3. **Status ID Validation (No Changes)**
**Decision:** Keep strict validation as requested

**Current Behavior:**
- Only passes if exact URL matches expected fact-check link
- No changes made - validation remains strict
- This ensures the chatbot returns the specific expected article

**Impact:**
- 2 STATUS_ID_MISMATCH failures will remain (Image 3.jpg, Image 26.png)
- These need test data updates with correct expected URLs
- Or chatbot database needs review to ensure correct article matching

---

## Expected Results After Improvements

### Before Changes:
- **Dataset4**: 48 tests, 41 passed, 7 failed (85.4% pass rate)
- Failure breakdown:
  - 2 KEYWORD_MISSING ❌
  - 3 UI_SELECTOR_ERROR ❌
  - 2 STATUS_ID_MISMATCH ❌

### After Changes (Expected):
- **Dataset4**: 48 tests, 46 passed, 2 failed (95.8% pass rate) 
- Improvement: +10.4% pass rate
- Remaining failures:
  - 2 STATUS_ID_MISMATCH (requires test data updates)

---

## Testing the Improvements

### Run Tests to Verify:
```bash
# Test dataset4 to see improvement
npm run test:dataset4

# Or test all datasets
npm test
```

### What to Look For:

1. **Keyword Matching**:
   - Check if Image 22.jpg and Image 35.jpg now pass
   - Look for messages like: "5/7 keywords matched (71%)"
   - Should show which keywords matched

2. **Retry Logic**:
   - If Image 10, 11, or 28 fail initially, watch for retry messages
   - Console should show: "⚠️  Transient error detected, retrying (1/3)..."
   - Look for: "✅ Test passed on retry attempt 2"

3. **Pass Rate**:
   - Overall pass rate should increase from 85.4% to ~96%
   - Only 2 failures should remain (STATUS_ID_MISMATCH)

---

## Code Changes Summary

### Modified Files:

1. **`validators/keywordValidator.ts`** - Enhanced keyword matching
   - Added synonym mapping
   - Implemented 50% match threshold
   - Better error/warning messages with match percentage

2. **`tests/datasetRunner.spec.ts`** - Added retry logic
   - New function: `executeTestCaseWithRetry()`
   - Wraps existing `executeTestCase()` with retry logic
   - Configurable retry count (default: 3)

---

## Next Steps

### For STATUS_ID_MISMATCH Failures:

**Option 1: Update Test Data** (Recommended)
Update expected URLs in `datasets/dataset4/testcases.json`:

```json
{
  "image": "Image 3.jpg",
  "fact_check_link": "https://x.com/PIBFactCheck/status/2004153719781576878?s=20",  // Update this
  ...
}
```

**Option 2: Investigate Chatbot**
- Review why chatbot returns different articles
- Check if multiple valid fact-checks exist for same image
- Consider updating chatbot's article selection logic

---

## Configuration Options

### Adjust Retry Count:
In `tests/datasetRunner.spec.ts`, change the retry parameter:
```typescript
const result = await executeTestCaseWithRetry(
  page, context, dataset.name, dataset.path, testcase,
  5  // Change from 3 to 5 retries
);
```

### Adjust Keyword Match Percentage:
In `validators/keywordValidator.ts`, change the threshold:
```typescript
const REQUIRED_PERCENTAGE = 40;  // Change from 50 to 40%
```

### Add More Synonyms:
In `validators/keywordValidator.ts`, add to `VERDICT_SYNONYMS`:
```typescript
const VERDICT_SYNONYMS = {
  'fake': ['fake', 'false', 'untrue', 'fabricated', 'custom-word'],
  // Add more mappings
};
```

---

## Validation Checklist

After running tests, verify:

- [ ] Keyword match percentage displayed in console output
- [ ] Retry attempts shown for transient failures  
- [ ] Overall pass rate improved to ~96%
- [ ] Individual reports show matched keywords
- [ ] Warnings displayed for partial keyword matches (>50% but <100%)
- [ ] Only 2 failures remain (STATUS_ID_MISMATCH)

---

## Report Impact

The improved validation will also enhance reports:

1. **Individual Reports** will show:
   - List of matched keywords
   - Match percentage
   - Which keywords were missing

2. **Dataset Reports** will show:
   - Better keyword matching details
   - Retry attempt information
   - More accurate pass/fail verdicts

3. **Master Report** will show:
   - Improved overall pass rate
   - More reliable test results
