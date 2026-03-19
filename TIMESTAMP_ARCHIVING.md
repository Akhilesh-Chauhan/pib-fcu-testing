# ⏰ Timestamp-Based Report Archiving

## Overview

Every test run now automatically creates a **timestamped archive** of all reports, allowing you to track and compare test results over time.

---

## 🎯 Features

### **1. Automatic Timestamp Generation**
- Each test run gets a unique timestamp ID: `YYYY-MM-DD_HH-MM-SS`
- Example: `2026-03-03_09-52-42`

### **2. Visible Run ID**
- Reports display the Run ID badge in the header
- Easy identification of which run generated the report

### **3. Archive Folder Structure**
```
reports/
├── master-report.html           ← Latest run
├── master-summary.json
├── dataset1/
│   ├── report.html
│   └── dataset-summary.json
├── dataset4/
│   ├── report.html
│   └── dataset-summary.json
└── archive/                     ← Historical runs
    ├── index.html              ← Browse past runs
    ├── 2026-03-03_09-52-42/    ← Run 1
    │   ├── master-report.html
    │   ├── master-summary.json
    │   ├── dataset1/
    │   │   ├── report.html
    │   │   └── dataset-summary.json
    │   └── dataset4/
    │       ├── report.html
    │       └── dataset-summary.json
    ├── 2026-03-03_14-30-15/    ← Run 2
    │   └── ...
    └── 2026-03-04_10-15-30/    ← Run 3
        └── ...
```

---

## 📊 Report History Browser

### **Access via Master Report**
1. Open `reports/master-report.html`
2. Click **"📁 View Report History"** button in toolbar
3. Browse all archived runs

### **Or Direct Access**
- Open `reports/archive/index.html` directly

### **History Page Features**
- **Chronological Listing**: Most recent runs first
- **Summary Cards**: Each run shows:
  - 🕒 Timestamp (formatted as `YYYY-MM-DD HH:MM:SS`)
  - 📊 Total Tests
  - ✅ Passed Count
  - ❌ Failed Count
  - 📈 Pass Rate %
  - Dataset names

---

## 🔍 Use Cases

### **1. Track Progress Over Time**
```bash
# Run tests multiple times during the day
npm test                    # Run 1: 09:52:42
# ... make code changes ...
npm test                    # Run 2: 14:30:15
# ... fix issues ...
npm test                    # Run 3: 16:45:00
```

Each run is preserved with its own timestamp, so you can:
- Compare pass rates over time
- See which fixes improved results
- Track regression issues

### **2. A/B Testing**
- Test different configurations
- Compare results side-by-side
- Keep historical records

### **3. Debugging**
- "What changed between morning and afternoon runs?"
- Click through archived reports to find differences

### **4. Stakeholder Demos**
- Show improvement over time
- Present historical data
- Prove bug fixes worked

---

## 🎨 Visual Features

### **1. Run ID Badge**
Every report now shows:
```
┌─────────────────────────────────────┐
│ 📊 PIB FCU Automation Report        │
│ Generated: 3/3/2026, 9:52:42 AM     │
│ 🕒 Run ID: 2026-03-03_09-52-42      │
└─────────────────────────────────────┘
```

### **2. Archive History Cards**
```
┌───────────────────────────────────────────┐
│ 🕒 2026-03-03 09:52:42                    │
│                                           │
│ 📊 3 Total Tests  ✅ 3 Passed  ❌ 0 Failed│
│ 📈 100.0% Pass Rate                       │
│                                           │
│ Datasets: dataset1                        │
│                                           │
│ [📄 View Report]                          │
└───────────────────────────────────────────┘
```

---

## ⚙️ How It Works

### **1. Test Initialization**
When you run `npm test`, the framework:
1. Calls `initializeTestRun()` to create timestamp
2. Logs: `📅 Test Run Initialized: 2026-03-03_09-52-42`

### **2. Report Generation**
All reports include the timestamp:
- Master Report: Shows Run ID badge + "View Report History" link
- Dataset Reports: Shows Run ID badge
- Individual Reports: Not archived (keep latest only)

### **3. Archiving Process**
After all tests complete:
1. Creates `reports/archive/YYYY-MM-DD_HH-MM-SS/` folder
2. Copies `master-report.html` and `master-summary.json`
3. For each dataset:
   - Copies `report.html`
   - Copies `dataset-summary.json`
4. Generates/updates `archive/index.html` with all runs

Console output:
```
📦 Archiving reports to: reports/archive/2026-03-03_09-52-42
✅ Reports archived successfully
📑 Archive index updated: reports/archive/index.html
```

---

## 📂 What Gets Archived

### **✅ Archived Files**
- `master-report.html` - Main summary report
- `master-summary.json` - Master JSON data
- `dataset1/report.html` - Dataset HTML report
- `dataset1/dataset-summary.json` - Dataset JSON data
- `dataset4/report.html`
- `dataset4/dataset-summary.json`
- (All tested datasets)

### **❌ NOT Archived** (to save space)
- Individual test HTML files (`Image 1.html`, etc.)
- Raw JSON files (`Image 1.json`, etc.)
- Screenshots (`.png` files)
- Console logs

**Rationale**: 
- Archive preserves high-level summaries
- Latest run keeps all details
- Reduces disk space usage

---

## 🗑️ Archive Management

### **Manual Cleanup**
Archives are never auto-deleted. To clean up old runs:

```bash
# View all archived runs
ls -la reports/archive/

# Delete specific run
rm -rf reports/archive/2026-03-03_09-52-42

# Delete runs older than 7 days (example)
find reports/archive/ -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;

# Keep only last 10 runs (example)
cd reports/archive && ls -t | tail -n +11 | xargs -I {} rm -rf {}
```

### **Disk Space Considerations**
- Each archive: ~100-500 KB (depends on dataset size)
- 100 runs: ~10-50 MB
- Consider cleaning monthly if running many tests

---

## 🔧 Configuration

### **Timestamp Format**
Defined in `formatTimestamp()` function:
```typescript
// Format: YYYY-MM-DD_HH-MM-SS
// Example: 2026-03-03_09-52-42
```

**To customize** (edit `utils/reportGenerator.ts`):
```typescript
function formatTimestamp(date: Date): string {
  // Current format
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  
  // Alternative: Date only
  return `${year}-${month}-${day}`;
  
  // Alternative: Unix timestamp
  return String(Math.floor(date.getTime() / 1000));
}
```

### **Archive Location**
Default: `reports/archive/`

**To change** (edit all occurrences in `utils/reportGenerator.ts`):
```typescript
const archiveDir = path.join('reports', 'history', timestamp); // custom location
```

---

## 🚀 Quick Start

### **1. Run Tests**
```bash
npm test
# or
TEST_DATASETS=dataset1 npm test
```

### **2. View Latest Report**
Open `reports/master-report.html`

### **3. View History**
Click **"📁 View Report History"** button

### **4. Compare Runs**
- Open multiple archived reports in tabs
- Compare pass rates, response times, etc.

---

## 📊 Example Workflow

### **Morning Run**
```bash
$ npm test
📅 Test Run Initialized: 2026-03-03_09-00-00
...
✅ 45/48 passed (93.8%)
📦 Archiving reports to: reports/archive/2026-03-03_09-00-00
```

### **After Bug Fix**
```bash
$ npm test
📅 Test Run Initialized: 2026-03-03_14-30-00
...
✅ 47/48 passed (97.9%)
📦 Archiving reports to: reports/archive/2026-03-03_14-30-00
```

### **Compare Results**
1. Open `reports/archive/index.html`
2. See two runs:
   - `09:00:00` - 93.8% pass rate
   - `14:30:00` - 97.9% pass rate ✨ Improved!
3. Click each to see detailed reports

---

## 🎯 Benefits

✅ **Never Lose Test Results**: Every run is preserved
✅ **Easy Comparison**: Side-by-side run comparison
✅ **Time Tracking**: See when tests were run
✅ **Historical Data**: Track trends and regressions
✅ **Stakeholder Reports**: Show progress over time
✅ **Debugging**: Find when issues started
✅ **No Manual Work**: Fully automatic archiving
✅ **Clean Latest**: Main reports folder stays current

---

## 🔗 Related Files

- **Implementation**: `utils/reportGenerator.ts`
  - `initializeTestRun()` - Creates timestamp
  - `getCurrentRunTimestamp()` - Gets current run ID
  - `archiveReports()` - Archives all reports
  - `generateArchiveIndex()` - Creates history browser

- **Test Runner**: `tests/datasetRunner.spec.ts`
  - `beforeAll()` - Calls `initializeTestRun()`
  - `afterAll()` - Calls `archiveReports()`

---

## 🎉 Summary

Your test reports now have **full historical tracking**! Every run is automatically archived with a timestamp, and you can browse all past runs through a beautiful web interface.

**Key Points:**
- 🕒 Every run gets unique timestamp ID
- 📦 Automatic archiving after tests complete
- 📁 Browse history via `archive/index.html`
- 🔍 Compare runs side-by-side
- 💾 Historical data preserved indefinitely
- 🎨 Modern UI with cards and badges

No configuration needed - **it just works!** 🚀
