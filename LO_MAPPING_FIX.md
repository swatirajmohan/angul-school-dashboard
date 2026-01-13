# Grade 5 Odia LO Mapping Fix

## Problem
In the source Excel file (`Angul_Item LOs and Answer Keys.xlsx`), one Grade 5 Odia item (row 20) had:
- **Blank LO Code**
- **Blank LO Description**

This caused:
- Empty LO rows in UI tables
- Incorrect item counts for LO aggregations
- Confusing output in school reports and district views

## Solution
Added data-level mapping in the preprocessing script (`scripts/preprocess.ts`) to automatically map blank Grade 5 Odia LOs to the correct target LO.

### Target LO
- **LO Code:** OD 407
- **LO Description:** "Read other materials alongside your textbook (such as children literature, main news articles, magazines, posters, etc.) and gain an understanding of them."

### Implementation
Location: `scripts/preprocess.ts` (lines ~507-512)

```typescript
// FIX: Map blank Grade 5 Odia LO to OD 407
if (grade === 5 && subject === 'Odia' && (!loCode || !loDescription)) {
  loCode = 'OD 407';
  loDescription = 'Read other materials alongside your textbook (such as children literature, main news articles, magazines, posters, etc.) and gain an understanding of them.';
  console.log(`  Mapped blank Grade 5 Odia LO to OD 407 at row ${i + 1}`);
}
```

## Verification Results

### 1. No Blank LO Codes
✅ **Verified:** 0 blank LO codes in Grade 5 Odia
```
Blank LO codes in Grade 5 Odia: 0
```

### 2. OD 407 Item Count
✅ **Verified:** OD 407 now has 2 items (previously had 1)
```
OD 407 item count: 2
```

### 3. LO Breakdown Aggregation
✅ **Verified:** Example from school UDISE 21150100101:
```json
{
  "loCode": "OD 407",
  "loDescription": "Read other materials alongside your textbook...",
  "itemCount": 2,
  "attempts": 72,
  "correct": 65,
  "percent": 90.3
}
```

## Impact
- **All UI views** (Dashboard, School Report, LO Details) now show correct OD 407 data
- **No blank LO rows** appear anywhere in the system
- **Aggregations** (attempts, correct, achievement %) include the previously blank item
- **Excel exports** will also reflect the corrected data

## Files Modified
1. `scripts/preprocess.ts` - Added LO mapping logic
2. `public/data/itemKeys.json` - Regenerated with fix
3. `public/data/schoolAggregates.json` - Regenerated with fix
4. `public/data/schoolLoBreakdown.json` - Regenerated with fix

## How to Re-run
If you update the source Excel files, simply run:
```bash
npm run preprocess
```

The fix will automatically apply during preprocessing.

## Date Completed
January 13, 2026

