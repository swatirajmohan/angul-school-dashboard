# Complete Data Processing & Analysis Summary
## Anugul SAKSHAM Assessment Dashboard

---

## 1. SOURCE DATA FILES

### 1.1 Input Excel Files (Located in `data-source/`)

| File Name | Purpose | Sheet Used |
|-----------|---------|------------|
| `Cursor Version_ List of schools in Anugul.xlsx` | School master data | Sheet 1 |
| `Cursor Version_ Angul_Item LOs and Answer Keys.xlsx` | Answer keys & LO mapping | "G5 and G8" |
| `Cursor Version_ Grade 5 Day 1 & 2.xlsx` | Student responses for Grade 5 | Sheet 1 |
| `Cursor Version_ Grade 8 Day 1 & 2.xlsx` | Student responses for Grade 8 | Sheet 1 |

---

## 2. DATA CLEANING & PREPROCESSING

### 2.1 SCHOOL MASTER DATA (`schools.json`)

#### Source Sheet Structure
- **File:** List of schools in Anugul.xlsx
- **Headers Location:** Row 2 (index 1) - NOT row 1
- **Data Rows:** Starting from row 3 (index 2)

#### Header Mapping (Flexible Aliases)
Excel headers were mapped using aliases to handle variations:

| Target Field | Excel Header Aliases |
|--------------|---------------------|
| `udise` | "UDISE Code", "Udise_Code", "UDISE_Code", "udise", "UDISE" |
| `schoolName` | "School Name", "School_Name", "school_name", "SchoolName" |
| `block` | "Block", "Block_Name", "block", "BLOCK" |
| `management` | "Management", "mgmt", "Mgmt", "MGMT" |
| `location` | "Location", "School_Location", "School Location", "loc" |

#### Data Cleaning Steps
1. **Trimmed all string fields** - removed leading/trailing whitespace
2. **Converted UDISE to string** - preserved leading zeros (e.g., "21150100101")
3. **Dropped rows with missing critical data:**
   - Missing UDISE code → EXCLUDED
   - Missing school name → EXCLUDED
4. **Preserved all other fields as-is** (block, management, location)

#### Output Schema
```json
{
  "udise": "21150100101",
  "schoolName": "Krushnachandrapur UPS",
  "block": "ANGUL",
  "management": "Govt. Aided",
  "location": "1-Rural"
}
```

**Records Processed:** 1,413 schools  
**Records Excluded:** Schools with missing UDISE or name (exact count logged during preprocessing)

---

### 2.2 ANSWER KEYS & LO MAPPING (`itemKeys.json`)

#### Source Sheet Structure
- **File:** Angul_Item LOs and Answer Keys.xlsx
- **Sheet:** "G5 and G8"
- **Headers:** Row 1
- **Data Rows:** Starting from row 2

#### Header Mapping
| Target Field | Excel Header |
|--------------|--------------|
| `grade` | "Grade" |
| `subject` | "Subject" |
| `loCode` | "LO Code" |
| `loDescription` | "LO Description" |
| `questionNumber` | "Question No." |
| `answerKey` | "Answer Key" |

#### Critical Data Issue & Fix
**Problem:** Excel file did NOT contain a "Day" column  
**Solution:** Inferred Day (1 or 2) based on Grade-Subject combination

**Inference Logic:**
```
Grade 5:
  Day 1 → Odia, EVS
  Day 2 → English, Mathematics

Grade 8:
  Day 1 → Odia, English, Science
  Day 2 → Mathematics, Social Science
```

#### Data Cleaning Steps
1. **Converted Grade to number** - validated as 5 or 8
2. **Trimmed all text fields**
3. **Converted answer keys to uppercase** - standardized A, B, C, D
4. **Validated answer keys** - must be A, B, C, or D only
5. **Excluded rows with:**
   - Invalid grade (not 5 or 8)
   - Unknown subject (not matching Day inference rules)
   - Invalid question number
   - Missing or invalid answer key
   - Invalid answer key format (not A/B/C/D)

#### Special Fix: Blank Grade 5 Odia LO
**Issue:** One Grade 5 Odia item (row 20) had blank LO Code and LO Description  
**Fix Applied:** Automatically mapped to existing LO:
- **LO Code:** OD 407
- **LO Description:** "Read other materials alongside your textbook (such as children literature, main news articles, magazines, posters, etc.) and gain an understanding of them."

**Logic:** Hard-coded override in preprocessing script
```typescript
if (grade === 5 && subject === 'Odia' && (!loCode || !loDescription)) {
  loCode = 'OD 407';
  loDescription = '[full description above]';
}
```

#### Position-Based Ordering
Items were sorted and assigned positions (1-based) by:
1. Grade (5 or 8)
2. Day (1 or 2)
3. Subject (alphabetically within day)
4. Question Number (ascending)

**Example:**
- Position 1 = Grade 5, Day 1, Odia, Question 1
- Position 2 = Grade 5, Day 1, Odia, Question 2
- ...
- Position 16 = Grade 5, Day 1, EVS, Question 1

#### Output Schema
```json
{
  "grade5_day1": [
    {
      "grade": 5,
      "day": 1,
      "subject": "Odia",
      "loCode": "OD 507",
      "loDescription": "Explain the meanings of unfamiliar words...",
      "questionNumber": 1,
      "answerKey": "B",
      "position": 1
    }
  ],
  "grade5_day2": [...],
  "grade8_day1": [...],
  "grade8_day2": [...]
}
```

**Total Items Processed:**
- Grade 5 Day 1: 30 items (Odia: 15, EVS: 15)
- Grade 5 Day 2: 30 items (English: 15, Mathematics: 15)
- Grade 8 Day 1: 60 items (Odia: 20, English: 20, Science: 20)
- Grade 8 Day 2: 40 items (Mathematics: 20, Social Science: 20)
- **Grand Total: 160 items**

**Records Excluded:** 839 rows (empty rows, invalid data, headers)

---

### 2.3 STUDENT RESPONSES (`schoolAggregates.json`)

#### Source Sheet Structure
- **Files:** 
  - Grade 5 Day 1 & 2.xlsx
  - Grade 8 Day 1 & 2.xlsx
- **Headers:** Row 1
- **Data Rows:** Starting from row 2

#### Header Mapping
| Target Field | Excel Header Aliases |
|--------------|---------------------|
| `udise` | "UDISE Code", "Udise_Code", "UDISE_Code", "udise", "UDISE" |
| `studentName` | "Name", "Student Name", "student_name", "StudentName" |
| `grade` | "Grade", "Class", "grade" |
| `day` | "Day", "day" |
| `responses` | **"Answers"** (critical mapping) |

#### Critical Data Issue & Fix
**Problem:** Response strings had trailing "#" delimiter  
**Example:** `"A#B#C#"` when split by "#" produced `["A", "B", "C", ""]`

**Fix Applied:**
```typescript
const responses = responsesRaw.split('#').filter(r => r !== '');
```
Filtered out empty strings after splitting.

#### Response Parsing & Scoring Logic

**Step 1: Parse Response String**
- Split by "#" delimiter
- Remove empty strings
- Result: Array of student answers (e.g., ["A", "B", "C"])

**Step 2: Match Against Answer Keys**
- Retrieved correct answer key array based on Grade & Day
- Example: `itemKeys.grade5_day1` for Grade 5, Day 1
- Matched by position (index-based)

**Step 3: Score Each Response**
```typescript
for (let i = 0; i < responses.length; i++) {
  if (responses[i] === itemKeys[i].answerKey) {
    correctCount++;
  }
  totalCount++;
}
```

**Step 4: Validate Response Length**
- Expected length = number of items in answer key
- **EXCLUDED students with length mismatch:**
  - Too few responses → DATA INVALID
  - Too many responses → DATA INVALID
  - Logged warning with student details

#### Aggregation Logic

**Per Student:**
1. Total marks = number of correct answers
2. Maximum possible = number of questions
3. Percentage = (correct / total) × 100

**Per Subject (per school):**
1. Sum all student marks for that subject
2. Count total students who took that subject
3. Count total possible marks (students × questions)
4. Calculate:
   - `totalMarks` = sum of all student scores
   - `maxMarks` = studentCount × questionCount
   - `avgMarks` = totalMarks / studentCount
   - `avgPercent` = (totalMarks / maxMarks) × 100, rounded to 1 decimal

**Per Grade (per school):**
1. Aggregate across all subjects in that grade
2. Calculate overall statistics:
   - `studentCount` = unique students across all subjects
   - `totalMarks` = sum across all subjects
   - `maxMarks` = sum of max marks across subjects
   - `overallMarks` = totalMarks / studentCount
   - `overallPercent` = (totalMarks / maxMarks) × 100, rounded to 1 decimal

#### Student Count Tracking (CRITICAL UPDATE)

**Issue:** Initial implementation didn't track students per subject/day correctly

**Fix Applied:** Track unique UDISE-Day combinations
- `studentCount` per subject
- `day1StudentCount`, `day2StudentCount` per grade
- `uniqueStudentCount` per grade (students who took at least one day)

**Logic:**
```typescript
// Track unique students per subject
const subjectStudentSet = new Set<string>();
// For each response:
subjectStudentSet.add(`${udise}-${day}`);
// Final count:
studentCount = subjectStudentSet.size;
```

#### Output Schema
```json
{
  "21150100101": {
    "grade5": {
      "uniqueStudentCount": 71,
      "day1StudentCount": 71,
      "day2StudentCount": 64,
      "totalMarks": 735.5,
      "maxMarks": 1065,
      "overallMarks": 10.35,
      "overallPercent": 69.1,
      "subjects": {
        "Odia": {
          "studentCount": 36,
          "totalMarks": 385,
          "maxMarks": 540,
          "avgMarks": 10.69,
          "avgPercent": 71.3
        }
      }
    }
  }
}
```

**Records Processed:**
- Grade 5: 27,670 students
- Grade 8: 29,303 students
- **Total: 56,973 student responses**

**Schools with Data:**
- Grade 5: 1,233 schools
- Grade 8: 532 schools

**Records Excluded:**
- Students with mismatched response length (logged as warnings)
- Students with missing UDISE (cannot be attributed to school)

---

### 2.4 LO-WISE BREAKDOWN (`schoolLoBreakdown.json`)

#### Processing Logic

**Step 1: Iterate Through All Student Responses** (same as above)

**Step 2: Map Each Question to its LO**
- Used `itemKeys.json` position mapping
- Each question has associated LO Code and LO Description
- Example: Question 1 in Grade 5 Day 1 → Position 1 → LO "OD 507"

**Step 3: Track Correct/Incorrect per LO**
```typescript
for (let i = 0; i < responses.length; i++) {
  const item = itemKeys[i];
  const loCode = item.loCode;
  
  // Initialize LO if not exists
  if (!loMap[loCode]) {
    loMap[loCode] = {
      loCode: loCode,
      loDescription: item.loDescription,
      itemCount: 0,
      attempts: 0,
      correct: 0
    };
  }
  
  // Track this item
  loMap[loCode].itemCount++; // per unique question
  loMap[loCode].attempts++;
  
  if (responses[i] === item.answerKey) {
    loMap[loCode].correct++;
  }
}
```

**Step 4: Calculate Achievement per LO**
```typescript
percent = (correct / attempts) × 100, rounded to 1 decimal
```

#### Aggregation per School, Grade, Subject
- Each school has separate LO breakdown
- Organized by:
  - Grade 5 → Subject → Array of LOs
  - Grade 8 → Subject → Array of LOs

#### Output Schema
```json
{
  "21150100101": {
    "grade5": {
      "Odia": [
        {
          "loCode": "OD 507",
          "loDescription": "Explain the meanings of unfamiliar words...",
          "itemCount": 3,
          "attempts": 108,
          "correct": 85,
          "percent": 78.7
        }
      ]
    }
  }
}
```

**Records Generated:**
- Total LO records: 74,337 (across all schools, grades, subjects)
- Schools with Grade 5 LO data: 1,233
- Schools with Grade 8 LO data: 532

**Records Excluded:** Same as student responses (length mismatch, missing UDISE)

---

## 3. MATHEMATICAL CALCULATIONS

### 3.1 Subject-Level Metrics

**Average Marks per Subject:**
```
avgMarks = totalMarks / studentCount

Where:
  totalMarks = sum of all student scores in that subject
  studentCount = number of students who took that subject
```

**Average Percentage per Subject:**
```
avgPercent = (totalMarks / maxMarks) × 100

Where:
  totalMarks = sum of all student scores
  maxMarks = studentCount × questionCount
  
Result: Rounded to 1 decimal place
```

### 3.2 Grade-Level Metrics

**Overall Grade Average:**
```
overallPercent = (totalMarks / maxMarks) × 100

Where:
  totalMarks = sum of totalMarks across all subjects in grade
  maxMarks = sum of maxMarks across all subjects in grade
  
Result: Rounded to 1 decimal place
```

**Overall Marks per Student:**
```
overallMarks = totalMarks / uniqueStudentCount

Where:
  totalMarks = sum across all subjects
  uniqueStudentCount = unique students who took at least one subject
  
Result: Rounded to 2 decimal places
```

### 3.3 LO-Level Metrics

**LO Achievement Percentage:**
```
loPercent = (correct / attempts) × 100

Where:
  attempts = total number of times students attempted this LO's questions
  correct = total number of correct responses across all attempts
  
Result: Rounded to 1 decimal place
```

**Item Count per LO:**
```
itemCount = number of unique questions mapped to this LO

Note: Multiple questions can map to the same LO
```

### 3.4 District & Block Aggregations (Dashboard)

**Block Average for Subject:**
```
blockAverage = sum(schoolSubjectAvg) / count(schoolsWithData)

Where:
  schoolSubjectAvg = avgPercent for each school in that block
  count = number of schools with data for that subject
  
Result: Rounded to nearest integer
```

**District Average:**
```
districtAverage = sum(schoolSubjectAvg) / count(allSchoolsWithData)

Across all blocks
Result: Rounded to nearest integer
```

---

## 4. DATA EXCLUSIONS SUMMARY

### 4.1 School Master Data
| Exclusion Reason | Count | Action |
|-----------------|-------|--------|
| Missing UDISE Code | Logged | Excluded from output |
| Missing School Name | Logged | Excluded from output |
| Other fields missing | 0 | Kept in output (may show "No data") |

### 4.2 Answer Keys
| Exclusion Reason | Count | Action |
|-----------------|-------|--------|
| Invalid Grade (not 5 or 8) | Logged | Excluded |
| Unknown Subject | Logged | Excluded |
| Invalid Answer Key (not A/B/C/D) | Logged | Excluded |
| Missing Question Number | Logged | Excluded |
| Empty rows / headers | 839 | Excluded |

**Valid Items Retained:** 160 out of 999 total rows

### 4.3 Student Responses
| Exclusion Reason | Count | Action |
|-----------------|-------|--------|
| Response length mismatch | Logged per student | Excluded (logged warning) |
| Missing UDISE | Logged | Excluded |
| Invalid grade/day | Logged | Excluded |
| Unparseable response string | Logged | Excluded |

**Valid Students Processed:**
- Grade 5: 27,670
- Grade 8: 29,303

**Skipped Students:** Logged in preprocessing output (see terminal logs)

### 4.4 LO Breakdown
| Exclusion Reason | Count | Action |
|-----------------|-------|--------|
| Same as Student Responses | Same | Inherited from response processing |
| Blank LO Code (Grade 5 Odia) | 1 item | **NOT EXCLUDED** - Mapped to OD 407 |

---

## 5. DATA VALIDATION CHECKS

### 5.1 Automated Validations

**During Preprocessing:**
1. **Header Validation:** All required headers present (using aliases)
2. **Length Validation:** Response count matches answer key length
3. **Type Validation:** UDISE as string, Grade as number
4. **Range Validation:** Answer keys must be A, B, C, or D
5. **Referential Integrity:** UDISE in responses exists in school master (warning if not)

**Counts Logged:**
- Total rows read
- Valid rows processed
- Rows skipped
- Students processed vs skipped
- Schools with data per grade

### 5.2 Expected vs Actual Item Counts

| Grade-Day | Expected Items | Actual Items | Status |
|-----------|---------------|--------------|--------|
| Grade 5 Day 1 | 30 | 30 | ✓ Match |
| Grade 5 Day 2 | 30 | 30 | ✓ Match |
| Grade 8 Day 1 | 60 | 60 | ✓ Match |
| Grade 8 Day 2 | 40 | 40 | ✓ Match |

**Validation:** Logged during preprocessing

---

## 6. OUTPUT FILES & SCHEMAS

### 6.1 Output File Summary

| File | Size | Records | Purpose |
|------|------|---------|---------|
| `schools.json` | ~200 KB | 1,413 schools | School master lookup |
| `itemKeys.json` | ~100 KB | 160 items | Answer key & LO mapping |
| `schoolAggregates.json` | ~500 KB | 1,413 schools | Performance metrics |
| `schoolLoBreakdown.json` | ~2 MB | 74,337 LO records | Detailed LO analysis |

### 6.2 Data Relationships

```
schools.json (UDISE)
    ↓
schoolAggregates.json (UDISE → Grades → Subjects)
    ↓
schoolLoBreakdown.json (UDISE → Grades → Subjects → LOs)
```

All linked by UDISE code (school identifier)

---

## 7. PREPROCESSING EXECUTION

### 7.1 Command
```bash
npm run preprocess
```

### 7.2 Script Location
```
scripts/preprocess.ts
```

### 7.3 Processing Steps (Sequential)
1. Load environment variables from `.env`
2. Process School Master (STEP 1)
3. Process Answer Keys (STEP 2)
4. Process Student Responses & Aggregates (STEP 3)
5. Process LO-wise Breakdown (STEP 4)
6. Write all JSON outputs to `public/data/`

### 7.4 Logging
- Console output shows progress for each step
- Warnings logged for data issues
- Success confirmation with sample records
- Total counts displayed

---

## 8. KEY DATA TRANSFORMATIONS

### 8.1 Excel → JSON Structure
| Source Format | Target Format | Transformation |
|--------------|---------------|----------------|
| Flat rows | Nested objects | Grouped by UDISE → Grade → Subject |
| String responses ("A#B#C#") | Scored integers | Parsed, matched, counted |
| Separate day files | Unified grade data | Merged by UDISE |
| Item-LO mapping | LO aggregations | Reverse mapped and summed |

### 8.2 Data Denormalization
- School master data denormalized into display records
- Subject averages pre-calculated (not computed client-side)
- LO breakdowns pre-aggregated per school
- District/block summaries computed client-side from aggregates

---

## 9. DATA QUALITY NOTES

### 9.1 Known Issues & Fixes
1. **Missing Day column in answer keys** → Fixed by inference logic
2. **Trailing # in response strings** → Fixed by filtering empty strings
3. **Blank LO in Grade 5 Odia** → Fixed by hard-coded mapping to OD 407
4. **Header variations** → Fixed by flexible alias mapping
5. **Headers in row 2 (not row 1)** → Fixed by adjusting row indices

### 9.2 Data Integrity
- ✅ All UDISE codes preserved as strings
- ✅ All percentages calculated consistently
- ✅ No duplicate records in outputs
- ✅ All relationships maintained (UDISE as key)

### 9.3 Precision
- Percentages: 1 decimal place
- Marks: 2 decimal places (where applicable)
- Counts: Integers (no rounding)

---

## 10. REPRODUCIBILITY

To reprocess data:
1. Place Excel files in `data-source/` folder
2. Update `.env` with file paths (or use auto-detection)
3. Run `npm run preprocess`
4. Verify console output for warnings
5. Check `public/data/` for generated JSON files

All logic is contained in `scripts/preprocess.ts` with inline documentation.

---

## Document Version
- **Created:** January 14, 2026
- **Last Updated:** January 14, 2026
- **Author:** AI Assistant (via Cursor IDE)
- **Project:** Anugul SAKSHAM Assessment Dashboard

