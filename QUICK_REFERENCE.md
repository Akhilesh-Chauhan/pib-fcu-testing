# PIB FCU Automation - Quick Reference

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Install browsers
npx playwright install chromium

# Run all tests
npm test
```

## 📁 Add New Dataset

1. Create folder: `datasets/my_dataset/`
2. Create `datasets/my_dataset/testcases.json`
3. Add images to `datasets/my_dataset/images/`
4. Run: `npm test`

## 🎯 testcases.json Template

```json
[
  {
    "image": "image1.jpg",
    "expected_query": "Has any incident taken place regarding the India–China border stand-off in Ladakh?",
    "expected_response": "A social media post claiming that Indian Army soldiers were captured by Chinese People's Liberation Army (PLA) forces in the India–China border stand-off in Ladakh is FAKE. No such incident has taken place.",
    "fact_check_link": "https://x.com/PIBFactCheck/status/1328727700702302208?s=20",
    "keywords": [
      "Indian Army",
      "no such incident",
      "Ladakh",
      "fake"
    ]
  }
]
```

**Field Descriptions:**
- `image` - Filename in images/ folder (case-insensitive matching)
- `expected_query` - Expected OCR-extracted query text
- `expected_response` - Expected chatbot response with verdict
- `fact_check_link` - PIB FactCheck Twitter/X URL (contains status ID)
- `keywords` - Array of keywords (at least ONE must match)

## 🔧 Update Selectors

Edit `config/selectors.ts` → `SELECTORS` object

```typescript
export const SELECTORS: ChatbotSelectors = {
  chatbotIcon: 'YOUR_SELECTOR_HERE',
  chatInput: 'textarea[placeholder*="message"]',
  sendButton: 'button[aria-label="Send"]',
  fileUploadInput: 'input[type="file"]',
  resetButton: 'button[aria-label="Reset"]',
  chatMessageContainer: '.chat-messages',
  responseContainer: '.bot-message',
};
```

## 📊 View Reports

- **HTML Reports:** Open `reports/master-report.html` in browser
- **Dataset Reports:** `reports/<dataset>/report.html`
- **JSON Data:** `reports/master-summary.json`

## 🐛 Common Commands

```bash
# Run specific test file
npx playwright test tests/datasetRunner.spec.ts

# Run in headed mode (see browser)
npm run test:headed

# Run UI mode (interactive)
npm run test:ui

# Debug mode
npm run test:debug

# Clean reports
npm run clean

# View last report
npm run report
```

## ⚡ Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| Chatbot won't open | Update `SELECTORS.chatbotIcon` in config/selectors.ts |
| Image upload fails | Check `SELECTORS.fileUploadInput` |
| API timeout | Increase `CONFIG.TIMEOUT.API_RESPONSE` |
| Reset fails | Update `SELECTORS.resetButton` |
| Tests too slow | Reduce dataset size or increase timeouts |
| File not found | Check case-insensitive matching in images/ folder |

## 📝 Test Result Interpretation

### Validation Flow
1. **Step 1:** Tool Call Validation (HARD FAIL)
2. **Step 2:** Verdict Validation (semantic grouping)
3. **Step 3:** Keyword Validation (at least ONE match)
4. **Step 4:** Status ID Validation (Twitter status ID)

### Console Output
```
✅ PASS - All 4 validations passed
❌ FAIL - One or more validations failed
Response Time: 3421ms - End-to-end response time
```

### Defect Categories (FCU Validation)
- `TOOL_CALL_FAILED` → Tool call missing from response
- `TOOL_NOT_RELEVANT` → RAG retrieved irrelevant result
- `VERDICT_MISMATCH` → Verdict doesn't match expected group
- `KEYWORD_VALIDATION_FAILED` → No keywords found in response
- `STATUS_ID_MISMATCH` → Twitter status ID doesn't match
- `STATUS_ID_NOT_FOUND` → No status ID in fact_check_link
- `FILE_NOT_FOUND` → Image file not found
- `UI_SELECTOR_ERROR` → UI interaction failure

## 🎨 Customization Points

1. **Validators:** Modify FCU validators in `validators/` (toolValidator, verdictValidator, keywordValidator, statusIdValidator)
2. **Verdict Groups:** Edit `utils/verdictMapper.ts` for semantic grouping
3. **Selectors:** Edit `config/selectors.ts` for UI element selectors
4. **Timeouts:** Edit `config/config.ts` → `CONFIG.TIMEOUT`
5. **Report Format:** Modify `utils/reportGenerator.ts`
6. **File Matching:** Adjust `utils/fileResolver.ts` for image file resolution

## 📞 Getting Help

1. Check `README.md` (full documentation)
2. Review `tests/uiSmoke.spec.ts` for basic examples
3. Inspect browser DevTools during headed mode
4. Check Playwright docs: https://playwright.dev

## 🔥 Performance Tips

- Keep datasets ≤ 100 images
- Use descriptive test case names
- Use semantic verdict grouping (FALSE, MISLEADING, TRUE)
- Provide targeted keywords (at least 1-3 per test case)
- Clean reports regularly: `npm run clean`
- Use `workers: 1` for session management
- Case-insensitive file names reduce errors
