# PIB FCU Automation Framework

![Playwright](https://img.shields.io/badge/Playwright-45ba4b?style=for-the-badge&logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)

Enterprise-grade Playwright automation framework for testing the **PIB Fact Check Unit (FCU)** AI chatbot - a Government of India RAG-based system for verifying misinformation claims.

---

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Dataset Structure](#dataset-structure)
- [Usage](#usage)
- [Test Execution Flow](#test-execution-flow)
- [Validation & Reporting](#validation--reporting)
- [Defect Categories](#defect-categories)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Contributing](#contributing)

---

## 🎯 Overview

This framework automates end-to-end testing of the PIB FCU chatbot, which uses:
- **Frontend OCR** for text extraction from images
- **RAG (Retrieval-Augmented Generation)** for fact-checking
- **Tool-calling LLM** architecture with streaming responses
- **Vector database** for similarity search

The automation validates:
- ✅ RAG search accuracy and relevance scores
- ✅ AI-generated fact-check responses
- ✅ Twitter/X source URL validation
- ✅ Performance metrics (response time, token usage)
- ✅ Session management (reset chat functionality)

---

## 🏗️ System Architecture

```
User Upload Image → Frontend OCR → Text Extraction
                                        ↓
                                   Vectorization
                                        ↓
                              Vector DB Query (RAG)
                                        ↓
                                    LLM Agent
                                        ↓
                              Tool Calls (Streamed):
                              1. searchTextRAG
                              2. generateFinalAnswer
                                        ↓
                           Response with Metadata
```

**API Endpoint:** `POST https://pib.myscheme.in/api/chat`

**Response Format (Streamed):**
```json
{
  "toolCallId": "call_abc123",
  "toolName": "searchTextRAG",
  "metadata": {
    "relevant": true,
    "source_url": "https://x.com/PIBFactCheck/...",
    "score": 0.9523
  },
  "score": 0.9523
}

{
  "toolCallId": "call_def456",
  "toolName": "generateFinalAnswer",
  "finalAnswer": "This claim is FALSE. The SBI reward scheme is a scam...",
  "metadata": {
    "verdict": "false",
    "source_url": "https://x.com/PIBFactCheck/..."
  }
}

{
  "finishReason": "stop",
  "usage": {
    "promptTokens": 1234,
    "completionTokens": 567,
    "totalTokens": 1801
  }
}
```

---

## ✨ Features

### 🔬 Comprehensive Testing
- Multi-dataset support (40-100 images per dataset)
- Parallel-ready architecture
- Retry mechanisms for flaky tests
- Console log capture on failures

### 🎯 Advanced Validation
- **RAG Validation:**
  - Relevance score thresholds
  - Source URL verification
  - Metadata completeness
  
- **Answer Validation:**
  - Expected verdict matching
  - Keyword presence checks
  - Verdict variation support

- **Twitter Validation:**
  - HTTP status checks
  - Content keyword validation
  - Full-page screenshot capture

### 📊 Rich Reporting
- **HTML Reports:**
  - Interactive dataset summaries
  - Collapsible test details
  - Embedded screenshots
  - Color-coded pass/fail indicators

- **JSON Reports:**
  - Machine-readable test results
  - Full metadata preservation
  - Performance metrics

- **Console Output:**
  - Real-time progress tracking
  - Per-image status updates
  - Summary statistics

### 🔧 Session Management
- Reset chat between tests (no page reload)
- Token accumulation prevention
- State verification

### 📸 Screenshot Automation
- Chatbot response capture
- Twitter page full screenshots
- Failure debugging screenshots

---

## 📁 Project Structure

```
pib-fcu-automation/
├── config/
│   └── config.ts                 # Configuration & TypeScript types
├── datasets/
│   └── dataset1/
│       ├── testcases.json        # Test case definitions
│       └── images/               # Test images
│           ├── img1.jpg
│           ├── img2.jpg
│           └── ...
├── reports/                      # Auto-generated reports
│   ├── dataset1/
│   │   ├── img1/
│   │   │   ├── response.png
│   │   │   ├── twitter.png
│   │   │   ├── tool-metadata.json
│   │   │   └── raw-api-response.json
│   │   ├── report.html
│   │   └── dataset-summary.json
│   ├── master-report.html
│   └── master-summary.json
├── tests/
│   ├── datasetRunner.spec.ts    # Main test orchestrator
│   └── uiSmoke.spec.ts           # Basic UI smoke tests
├── utils/
│   ├── datasetLoader.ts          # Dataset loading logic
│   ├── streamParser.ts           # API response parser
│   ├── screenshotHelper.ts       # Screenshot utilities
│   └── reportGenerator.ts        # HTML/JSON report generation
├── validators/
│   ├── ragValidator.ts           # RAG response validation
│   ├── answerValidator.ts        # Final answer validation
│   └── twitterValidator.ts       # Twitter URL validation
├── .gitignore
├── package.json
├── playwright.config.ts
├── tsconfig.json
└── README.md
```

---

## 📦 Prerequisites

- **Node.js:** v18+ (LTS recommended)
- **npm:** v9+
- **Operating System:** Windows, macOS, or Linux
- **Internet Connection:** Required for API calls and Twitter validation

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "PIB FCU automation"
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `@playwright/test` - Test framework
- `typescript` - TypeScript compiler
- `axios` - HTTP client for Twitter validation

### 3. Install Playwright Browsers

```bash
npx playwright install chromium
```

---

## ⚙️ Configuration

### Update Selectors

The chatbot UI selectors are defined in [`config/selectors.ts`](config/selectors.ts). Update these based on your actual DOM structure:

```typescript
export const SELECTORS: ChatbotSelectors = {
  chatbotIcon: 'button[aria-label="Open chatbot"]',
  chatInput: 'textarea[placeholder*="message"]',
  sendButton: 'button[aria-label="Send"]',
  fileUploadInput: 'input[type="file"]',
  resetButton: 'button[aria-label="Reset"]',
  chatMessageContainer: '.chat-messages',
  responseContainer: '.bot-message',
};
```

### Adjust Timeouts

Modify timeouts in [`config/config.ts`](config/config.ts) if needed:

```typescript
export const CONFIG = {
  TIMEOUT: {
    API_RESPONSE: 60000,    // 60 seconds
    PAGE_LOAD: 30000,       // 30 seconds
    ELEMENT_WAIT: 10000,    // 10 seconds
    RESET_CHAT: 5000,       // 5 seconds
  },
};
```

---

## 📂 Dataset Structure

### Directory Layout

```
datasets/
└── dataset1/
    ├── testcases.json
    └── images/
        ├── sbi_reward_scam.jpg
        ├── pm_scheme_announcement.jpg
        └── ...
```

### testcases.json Schema

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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | string | ✅ | Filename in `images/` folder (case-insensitive) |
| `expected_query` | string | ✅ | Expected query text extracted from image via OCR |
| `expected_response` | string | ✅ | Expected chatbot response (includes verdict) |
| `fact_check_link` | string | ✅ | PIB FactCheck Twitter/X URL with status ID |
| `keywords` | string[] | ✅ | Keywords to find in response (at least ONE must match) |

---

## 🎮 Usage

### Run All Tests

```bash
npm test
```

### Run Dataset Tests Only

```bash
npm run test:dataset
```

### Run UI Smoke Tests Only

```bash
npm run test:smoke
```

### Run in Headed Mode (See Browser)

```bash
npm run test:headed
```

### Run in UI Mode (Interactive)

```bash
npm run test:ui
```

### Debug Mode

```bash
npm run test:debug
```

### Clean Reports

```bash
npm run clean
```

---

## 🔄 Test Execution Flow

### High-Level Flow

```
1. Launch Browser (Once)
2. Navigate to Chatbot URL
3. Open Chatbot Window
4. For Each Dataset:
     For Each Image:
        a. Upload Image
        b. Enter Query
        c. Click Send
        d. Intercept API Response
        e. Parse Streamed Response
        f. Validate searchTextRAG
        g. Validate generateFinalAnswer
        h. Validate Twitter URL
        i. Capture Screenshots
        j. Save Metadata
        k. Click Reset Chat
        l. Verify Reset
5. Generate Reports
6. Close Browser
```

### Session Management

**IMPORTANT:** The framework does NOT reload the page between tests. Instead:

1. After each image test, the **Reset Chat** button is clicked
2. Framework waits for chat to clear
3. Verifies next request contains only 1 user message
4. Ensures token counts don't accumulate

---

## 📊 Validation & Reporting

### Validation Logic

The framework validates chatbot responses using **FCU Real-World PASS Behavior** with a **4-step validation flow**. No similarity scoring is used; instead, the framework uses **semantic verdict grouping** and **hard fail logic**.

#### Step 1: Tool Call Validation (`validators/toolValidator.ts`)

**HARD FAIL validation** - if this fails, the entire test fails regardless of other validations.

**Pass Conditions:**
```typescript
✅ toolCall.exists === true
✅ metadata.relevant === true
```

**If Failed:**
- Defect: `TOOL_CALL_FAILED` or `TOOL_NOT_RELEVANT`
- Test marked as FAIL
- No further validations executed

#### Step 2: Verdict Validation (`validators/verdictValidator.ts`)

**Semantic verdict matching** using verdict groups instead of exact string matching.

**Verdict Groups:**
- `FALSE_GROUP`: ["false", "fake", "फर्जी", "गलत"]
- `MISLEADING_GROUP`: ["misleading", "partly true", "partly false", "भ्रामक"]
- `TRUE_GROUP`: ["true", "सत्य", "सही"]

**Pass Conditions:**
```typescript
✅ Detected verdict (case-insensitive) belongs to same group as expected verdict
```

Example: "FAKE" in response matches expected "false" (both in FALSE_GROUP)

**If Failed:**
- Defect: `VERDICT_MISMATCH`
- Test marked as FAIL

#### Step 3: Keyword Validation (`validators/keywordValidator.ts`)

**At least ONE keyword must match** - not all keywords are required.

**Pass Conditions:**
```typescript
✅ Case-insensitive search
✅ At least 1 keyword from expected keywords found in response
```

Example: keywords ["SBI", "fake", "scam"] - finding "SBI" alone is sufficient

**If Failed:**
- Defect: `KEYWORD_VALIDATION_FAILED`
- Test marked as FAIL

#### Step 4: Status ID Validation (`validators/statusIdValidator.ts`)

**Twitter/X status ID extraction and matching**.

**Pass Conditions:**
```typescript
✅ Status ID extracted from fact_check_link using regex: /\/status\/(\d+)/i
✅ Same status ID found in chatbot response
```

Example: Link `https://x.com/PIBFactCheck/status/1328727700702302208` → Status ID: `1328727700702302208`

**If Failed:**
- Defect: `STATUS_ID_MISMATCH` or `STATUS_ID_NOT_FOUND`
- Test marked as FAIL

**Overall Test Result:** A test **PASSES** only if **ALL 4 validations pass**. If any validation fails, the test is marked as FAIL with the corresponding defect category.

### Report Types

#### 1. JSON Reports

**Individual Test Result:**
```json
{
  "datasetName": "dataset1",
  "imageName": "sbi_reward_scam.jpg",
  "query": "Is this legitimate?",
  "passed": true,
  "score": 0.9523,
  "responseTime": 3421,
  "defectCategory": "NONE",
  "errors": [],
  "warnings": [],
  "screenshots": {
    "response": "reports/dataset1/sbi_reward_scam/response.png",
    "twitter": "reports/dataset1/sbi_reward_scam/twitter.png"
  },
  "metadata": { ... },
  "timestamp": "2026-02-17T10:30:00.000Z"
}
```

**Dataset Summary:**
```json
{
  "datasetName": "dataset1",
  "totalTests": 40,
  "passed": 38,
  "failed": 2,
  "averageScore": 0.9234,
  "averageResponseTime": 3200,
  "results": [...]
}
```

**Master Summary:**
```json
{
  "totalDatasets": 3,
  "totalTests": 120,
  "totalPassed": 115,
  "totalFailed": 5,
  "overallAverageScore": 0.9187,
  "overallAverageResponseTime": 3150,
  "datasetSummaries": [...]
}
```

#### 2. HTML Reports

- **Dataset Reports:** `reports/<dataset>/report.html`
- **Master Report:** `reports/master-report.html`

Features:
- Interactive tables with expandable rows
- Embedded screenshots
- Color-coded pass/fail status
- Clickable image names
- Metadata JSON viewers

### Console Output Example

```
🚀 Starting PIB FCU Automation Framework

📍 Navigating to: https://pib.myscheme.in/
🤖 Opening chatbot...
   ✅ Chatbot opened

📦 Found 2 dataset(s)

============================================================
📁 Processing Dataset: dataset1
   Total images: 5
============================================================

[1/5] 🖼️  Image: sbi_reward_scam.jpg
   Query: Is this SBI reward claim legitimate?...
   Status: ✅ PASS
   Score: 0.9523
   Response Time: 3421ms

[2/5] 🖼️  Image: pm_scheme_announcement.jpg
   Query: Did the Prime Minister announce this new scheme?...
   Status: ❌ FAIL
   Score: 0.8234
   Response Time: 2987ms
   Errors: 1
      - searchTextRAG.score (0.8234) is below threshold (0.85)

...

============================================================
📊 Dataset Summary: dataset1
============================================================
Total Tests: 5
Passed: 4 ✅
Failed: 1 ❌
Pass Rate: 80.0%
Average Score: 0.9012
Average Response Time: 3124ms
============================================================
```

---

## 🏷️ Defect Categories

Auto-tagged failure categories based on FCU validation flow:

| Category | Description | Trigger Condition |
|----------|-------------|-------------------|
| `TOOL_CALL_FAILED` | Tool call missing from response | `toolCall.exists === false` |
| `TOOL_NOT_RELEVANT` | RAG retrieved irrelevant result | `metadata.relevant === false` |
| `VERDICT_MISMATCH` | Verdict doesn't match expected group | Detected verdict not in same semantic group |
| `KEYWORD_VALIDATION_FAILED` | No keywords found in response | None of the expected keywords matched |
| `STATUS_ID_MISMATCH` | Twitter status ID doesn't match | Expected status ID not found in response |
| `STATUS_ID_NOT_FOUND` | No status ID in fact_check_link | Cannot extract status ID from URL |
| `FILE_NOT_FOUND` | Image file not found | Image doesn't exist in images/ folder |
| `UI_SELECTOR_ERROR` | UI interaction failure | Element not found/timeout |

---

## 🛠️ Troubleshooting

### Issue: Chatbot doesn't open

**Solution:** Update `SELECTORS.chatbotButton` in [`config/config.ts`](config/config.ts) to match actual DOM selector.

### Issue: Image upload fails

**Solution:**
1. Verify `SELECTORS.imageInput` is correct
2. Check file path in `testcases.json`
3. Ensure images exist in `datasets/<dataset>/images/`

### Issue: API response not captured

**Solution:**
1. Check API endpoint URL in browser DevTools Network tab
2. Update `CONFIG.API_ENDPOINT` if needed
3. Increase `TIMEOUT.API_RESPONSE`

### Issue: Twitter validation fails

**Solution:**
1. Check internet connectivity
2. Verify Twitter URL is accessible
3. Twitter may block automated requests - consider using HTTP validation instead of browser-based

### Issue: Reset chat not working

**Solution:**
1. Update `SELECTORS.resetButton`
2. Increase `TIMEOUT.RESET_CHAT`
3. Check if reset button appears only after first message

### Issue: Tests fail due to slow network

**Solution:**
Increase timeouts in [`config/config.ts`](config/config.ts):
```typescript
TIMEOUT: {
  API_RESPONSE: 90000,  // Increase to 90 seconds
  PAGE_LOAD: 60000,     // Increase to 60 seconds
}
```

---

## 💡 Best Practices

### 1. Dataset Organization

- Keep datasets small and focused (max 100 images per dataset)
- Use descriptive dataset names (e.g., `sbi_scams`, `covid_misinformation`)
- Add `README.md` in each dataset folder documenting its purpose

### 2. Image Naming

- Use descriptive filenames: `sbi_reward_scam.jpg` > `img1.jpg`
- Keep names lowercase with underscores
- Avoid special characters

### 3. Test Case Design

- Set realistic `minimum_score_threshold` (0.80-0.95 range)
- Use specific keywords for validation
- Include verdict variations in expected outcomes

### 4. CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: PIB FCU Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npx playwright install chromium
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: reports/
```

### 5. Performance Optimization

- Use `workers: 1` in [`playwright.config.ts`](playwright.config.ts) to maintain session
- Consider splitting large datasets into multiple files
- Use HTTP-based Twitter validation for speed (instead of browser-based)

---

## 🤝 Contributing

### Adding New Validators

1. Create validator in `validators/` folder
2. Import in test spec
3. Call during test execution
4. Update types in [`config/config.ts`](config/config.ts)

### Adding New Report Formats

1. Add generator function in [`utils/reportGenerator.ts`](utils/reportGenerator.ts)
2. Call in test's `afterAll` hook
3. Update documentation

### Fixing Bugs

1. Create issue describing the bug
2. Fork repository
3. Create feature branch
4. Fix bug with tests
5. Submit pull request

---

## 📄 License

ISC License

---

## 👥 Authors

- **QA Team** - Initial work

---

## 📞 Support

For issues and questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review Playwright documentation: https://playwright.dev
3. Open an issue in the repository

---

## 🎓 Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PIB Fact Check on Twitter](https://twitter.com/PIBFactCheck)

---

**Happy Testing! 🚀**
