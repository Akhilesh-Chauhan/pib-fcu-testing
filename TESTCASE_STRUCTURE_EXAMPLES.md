# Test Case Structure Examples

The framework now supports **two structures** for test cases with full backward compatibility:

---

## ✅ **NEW Structure (Recommended)** - Separate Verdict & Keywords

```json
{
  "image": "Image 1.jpg",
  "expected_query": "Is this SBI rewards APK message genuine?",
  "expected_response": "The claim is FALSE. SBI never sends APK files.",
  "fact_check_link": "https://x.com/PIBFactCheck/status/2004888112846307655?s=20",
  "verdict": "fake",
  "keywords": [
    "SBI rewards APK",
    "SBI reward SMS",
    "download SBI APK",
    "phishing SBI"
  ]
}
```

### Benefits:
- ✅ **Clearer intent**: Verdict is the critical validation
- ✅ **Stricter verdict validation**: Must match exactly (uses semantic grouping)
- ✅ **Flexible keywords**: Purely descriptive terms (ANY ONE match passes)
- ✅ **Better reporting**: Verdict and keywords shown separately
- ✅ **No duplication**: Don't need "fake", "false" in keywords array

### Verdict Values:
- `"fake"` - For false/fabricated content
- `"misleading"` - For misleading/misrepresented content
- `"true"` - For verified/correct content
- `"partially true"` - For partially correct content

---

## 🔄 **OLD Structure (Still Supported)** - Keywords Include Verdict

```json
{
  "image": "Image 1.jpg",
  "expected_query": "Is this SBI rewards APK message genuine?",
  "expected_response": "The claim is FALSE. SBI never sends APK files.",
  "fact_check_link": "https://x.com/PIBFactCheck/status/2004888112846307655?s=20",
  "keywords": [
    "SBI rewards APK",
    "SBI reward SMS",
    "download SBI APK",
    "phishing SBI",
    "fake",
    "false"
  ]
}
```

### Note:
- If no `verdict` field is provided, verdict is extracted from `expected_response`
- Keywords array can include verdict terms
- Fully backward compatible with existing test cases

---

## 🔍 How Validation Works

### With NEW Structure:
1. **Verdict Validation**: Checks `verdict` field against response (strict semantic grouping)
2. **Keyword Validation**: Checks descriptive keywords only (ANY ONE match passes)

### With OLD Structure:
1. **Verdict Validation**: Extracts verdict from `expected_response` (semantic grouping)
2. **Keyword Validation**: Checks all keywords including verdict terms (ANY ONE match passes)

---

## 📝 Migration Guide

**To convert existing test cases:**

1. Add `verdict` field with the expected verdict
2. Remove verdict keywords from `keywords` array
3. Keep only descriptive/contextual keywords

**Example conversion:**

```json
// BEFORE
{
  "keywords": ["SBI APK", "phishing", "fake", "false"]
}

// AFTER
{
  "verdict": "fake",
  "keywords": ["SBI APK", "phishing"]
}
```

---

## ⚙️ Validation Rules

| Component | Old Structure | New Structure |
|-----------|--------------|---------------|
| **Verdict Match** | Extracted from `expected_response` | Uses `verdict` field |
| **Verdict Pass Rule** | Semantic grouping (fake=false=untrue) | Same semantic grouping |
| **Keyword Match** | ALL keywords (including verdict) | Only descriptive keywords |
| **Keyword Pass Rule** | ANY ONE keyword matches | ANY ONE keyword matches |
| **Verdict in Keywords** | Validated with other keywords | Skipped (validated separately) |

---

## 🎯 Best Practices

### For New Test Cases:
✅ Use separate `verdict` field  
✅ Keep keywords purely descriptive  
✅ Use 3-6 contextual keywords per test  
✅ Don't duplicate verdict in keywords  

### For Existing Test Cases:
✅ No changes needed - framework handles both  
✅ Migrate gradually for better reporting  
✅ Can mix old/new structure in same dataset  

---

## 🚀 Example Dataset (Mixed Structure)

```json
[
  {
    "image": "Image 1.jpg",
    "verdict": "fake",
    "keywords": ["SBI APK", "phishing"],
    "expected_query": "...",
    "expected_response": "...",
    "fact_check_link": "..."
  },
  {
    "image": "Image 2.png",
    "keywords": ["YONO blocked", "Aadhaar", "fake", "false"],
    "expected_query": "...",
    "expected_response": "...",
    "fact_check_link": "..."
  }
]
```

Both test cases work perfectly! 🎉
