# Dataset Testing Guide

## Running Specific Datasets

You can now test specific datasets instead of running all datasets every time. The master report will still include all tested datasets.

---

## Methods to Run Specific Datasets

### Method 1: Using NPM Scripts (Easiest)

#### Test only dataset1:
```bash
npm run test:dataset1
```

#### Test only dataset4:
```bash
npm run test:dataset4
```

---

### Method 2: Using Environment Variable (Most Flexible)

#### Test a single dataset:
```bash
TEST_DATASETS=dataset1 npm test
```

#### Test multiple specific datasets (comma-separated):
```bash
TEST_DATASETS=dataset1,dataset4 npm test
```

#### Test in headed mode:
```bash
TEST_DATASETS=dataset4 npm run test:headed
```

---

### Method 3: Test All Datasets (Default)

If you don't specify TEST_DATASETS, all datasets will run:

```bash
npm test
# or
npm run test:dataset
```

---

## How It Works

1. **Dataset Filtering**: The `TEST_DATASETS` environment variable filters which datasets to run
2. **Master Report**: Each run generates a master report that includes ALL datasets that were tested in that run
3. **Individual Reports**: Each dataset gets its own HTML report in `reports/datasetX/report.html`
4. **Cumulative**: If you run dataset1 separately, then dataset4 separately, you'll have two different master reports

---

## Examples

### Run only dataset1 (3 test images):
```bash
npm run test:dataset1
```
**Output:**
- `reports/dataset1/report.html` - Dataset1 summary
- `reports/master-report.html` - Master report with only dataset1
- Individual reports in `reports/dataset1/individual/`

### Run dataset1 and dataset4 together:
```bash
TEST_DATASETS=dataset1,dataset4 npm test
```
**Output:**
- `reports/dataset1/report.html` - Dataset1 summary
- `reports/dataset4/report.html` - Dataset4 summary
- `reports/master-report.html` - Master report with BOTH datasets
- Individual reports for both datasets

### Run all datasets (default):
```bash
npm test
```
**Output:**
- All dataset reports
- Master report with ALL datasets

---

## Adding Custom Dataset Scripts

To add a script for a new dataset (e.g., dataset5), edit `package.json`:

```json
"scripts": {
  "test:dataset5": "TEST_DATASETS=dataset5 playwright test tests/datasetRunner.spec.ts"
}
```

Then run:
```bash
npm run test:dataset5
```

---

## Tips

1. **Development Testing**: Use specific dataset testing when developing new features or fixing bugs
2. **Full Regression**: Run all datasets before deployments
3. **Quick Validation**: Test a single dataset to verify chatbot changes
4. **Parallel Execution**: You can run different datasets in different terminals (be careful with browser resources)

---

## Checking Which Datasets Exist

```bash
ls -1 datasets/
```

Expected output:
```
dataset1
dataset4
```

---

## Master Report Behavior

- The master report (`reports/master-report.html`) shows summary of ALL datasets tested in that specific run
- If you run dataset1 only, master report shows only dataset1 stats
- If you run dataset1+dataset4, master report shows combined stats
- Each run overwrites the previous master report

---

## Common Use Cases

### Use Case 1: Debugging Failed Tests
```bash
# Run only the dataset with failures
TEST_DATASETS=dataset4 npm run test:headed
```

### Use Case 2: Quick Validation After Chatbot Change
```bash
# Test smaller dataset first
npm run test:dataset1
```

### Use Case 3: Full Test Suite Before Release
```bash
# Run all datasets
npm test
```

### Use Case 4: Test Multiple Specific Datasets
```bash
# Skip dataset2 and dataset3, only test 1 and 4
TEST_DATASETS=dataset1,dataset4 npm test
```

---

## Troubleshooting

**Q: I set TEST_DATASETS but all datasets still run**  
A: Make sure there are no spaces around commas: `dataset1,dataset4` (correct) vs `dataset1, dataset4` (wrong)

**Q: No tests run with TEST_DATASETS set**  
A: Check that the dataset names match exactly (case-sensitive): `dataset1` not `Dataset1`

**Q: Where is the master report?**  
A: Always at `reports/master-report.html` - it shows summary of the last test run

**Q: Can I run two datasets in parallel?**  
A: Not recommended - both would use the same browser instance and conflict. Run sequentially instead.
