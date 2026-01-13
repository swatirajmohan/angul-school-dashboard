# Anugul District School Assessment Dashboard - Functional Requirements Specification (FRS)

## 1. Goal

Build a simple web dashboard for Anugul district, Odisha, to show school wise learning achievement for Grades 5 and 8, based on a two day assessment.

The app must have:
- A filterable list view of all schools
- A school detail view with a deep dive into LO wise achievement
- No PDF, no bilingual, English only.

## 2. Users and Key Use Cases

### 2.1 Primary User

District, block, and programme teams who want to quickly see:
- Which schools are performing low or high
- Subject wise averages for Grade 5 and Grade 8
- Within a school, which Learning Outcomes are weak

### 2.2 Core Use Cases

1. Search a school by name or UDISE
2. Filter schools by Block, Management, Location
3. Sort schools by overall score or any subject score
4. Click a school row to open School Report
5. In School Report, switch Grade, then Subject, and see LO wise achievement

## 3. Data Inputs and What Each File Contains

### 3.1 Schools Master

**File:** `Cursor Version, List of schools in Anugul.xlsx`

**Needed fields:**
- UDISE Code
- Block Name
- School Name
- Management type (Govt, Govt Aided)
- School Location (Rural, Urban)

**Note on formatting:**
The first row in this file is not a real header in the Excel sense. It contains the header labels inside the first data row. So the ETL must promote row 1 into headers.

### 3.2 Item, LO Mapping and Answer Keys

**File:** `Cursor Version, Angul_Item LOs and Answer Keys.xlsx`

**Needed fields per item:**
- Grade
- Day
- Subject
- LO Code
- LO Description
- Question Number
- Answer Key

### 3.3 Student Response Data

**Files:**
- `Cursor Version, Grade 5 Day 1 and 2.xlsx`
- `Cursor Version, Grade 8 Day 1 and 2.xlsx`

Each row represents one student attempt with:
- Grade
- Day (1 or 2)
- UDISE Code
- Block
- Student responses stored in one cell as a sequence like `A#B#C#...` etc
- Asterisk (*) means not answered, score must be 0

### Assessment Structure Rules

**Grade 5:**
- Day 1: 30 questions total (first 15 Odia, next 15 EVS)
- Day 2: 30 questions total (first 15 English, next 15 Mathematics)

**Grade 8:**
- Day 1: 60 questions total (first 20 Odia, next 20 English, last 20 Science)
- Day 2: 40 questions total (first 20 Mathematics, next 20 Social Science)

**Scoring:**
- Correct answer: 1 mark
- Wrong answer: 0 marks
- Missing (asterisk): 0 marks

## 4. Output Metrics and Definitions

### 4.1 Student Level Scoring

For each student row:
1. Split response string by `#`
2. Convert asterisk to empty response
3. Map each position to the correct item key based on Grade and Day and subject order defined in section 3.3
4. Score per item: 1 if response matches answer key else 0

### 4.2 School Level Subject Averages

For each school, for each grade, for each subject:
- Total marks per student in that subject
- Subject total possible marks (Grade 5 subjects are out of 15, Grade 8 subjects are out of 20)
- School subject average: average student marks for that subject
- Also compute school subject percentage: average marks divided by total possible, times 100

**Display choice:**
Show marks as "x out of total" in the UI, and also show percentage in smaller text.

### 4.3 School Level Overall Averages

For each school, for each grade:
- Overall average marks across all subjects in that grade
- Overall percentage across that grade

### 4.4 LO Wise Achievement

For each school, grade, subject, LO Code:
1. Identify all items mapped to that LO Code from the key file for that grade and subject
2. For all students in that school and grade, compute total attempts for those items
3. Compute total correct for those items
4. LO achievement percent: correct divided by attempts times 100
5. Also store item count mapped to that LO

**Important:**
If an LO has multiple items, it must aggregate across them.

## 5. Data Processing Approach (Must Be Fast in Browser)

### 5.1 Non-Negotiable Requirement

The dashboard must load fast and must not compute over raw 20k to 30k student rows in the browser on every page load.

### 5.2 Required Solution

Do one time preprocessing to produce clean JSON files that the React app can load quickly.

**Implementation plan:**
1. Add a Node based preprocessing script in the repo, run locally before deployment
2. Script reads all Excel files and generates JSON outputs into `public/data`
3. React app only loads the precomputed JSON

### 5.3 Output JSON Contracts

Create these files:

**1. `public/data/schools.json`**
One record per school
- Fields:
  - udise
  - schoolName
  - block
  - management
  - location

**2. `public/data/schoolAggregates.json`**
One record per school with grade level summary
- Fields:
  - udise
  - grade5:
    - subjects (Odia, English, Mathematics, EVS)
      - each subject has: avgMarks, totalMarks, avgPercent
    - overallAvgMarks, overallPercent
    - studentCount
  - grade8:
    - subjects (Odia, English, Mathematics, Science, Social Science)
      - same fields as above
    - studentCount

**3. `public/data/schoolLoBreakdown.json`**
One record per school, grade, subject, LO
- Fields:
  - udise
  - grade
  - subject
  - loCode
  - loDescription
  - itemCount
  - attempts
  - correct
  - percent

**Optional but useful for debugging:**
**4. `public/data/meta.json`**
- Fields:
  - generatedAt
  - totalSchools
  - totalStudentRowsGrade5
  - totalStudentRowsGrade8

### 5.4 Key Mapping Logic (Avoid Brittle Row Range Rules)

Do not hardcode Excel row numbers.

Instead build a key map using the key file columns:
1. Filter by Grade and Day
2. Group by Subject
3. Sort each subject by Question Number
4. Concatenate subjects in the required order for that Grade and Day from section 3.3
5. This produces an array `keysByPosition` (index 0 is question 1 in that day response string)

Then for each student response position `i`:
- `key = keysByPosition[i]`
- compare response letter to `key.answerKey`

This guarantees correct mapping even if the key sheet row order changes.

## 6. Pages and UI Requirements

### 6.1 Layout and Navigation

Single page app with 2 routes:
- Dashboard list view (default route)
- School report view (route includes udise)

### 6.2 Dashboard List View

**Header:**
- Title: "Anugul School Assessment Dashboard"
- Subtext: "Assessment conducted over two days, Grades 5 and 8"

**Filters bar:**
- Search input (school name or UDISE)
- Block dropdown (multi select)
- Management dropdown (Govt, Govt Aided)
- Location dropdown (Rural, Urban)
- Clear filters button

**Table:**

Columns:
- School Name
- UDISE
- Block
- Grade 5 Average score (with sub columns: Odia, English, Mathematics, EVS)
- Grade 8 Average score (with sub columns: Odia, English, Mathematics, Science, Social Science)
- View School Report button

**Display rules:**
- Each subject cell shows `avgMarks out of totalMarks` (example: "7.8 out of 15")
- Below it show percent in smaller text (example: "52%")
- If a school has no student data for that grade, show "No data" in all subject cells for that grade

**Sorting:**
- Default sort by School Name
- Allow sort by any subject column and overall averages

**Pagination:**
- Required (1446 schools)
- Page size selector: 25, 50, 100
- Page controls

### 6.3 School Report View

**Header section:**
- School name
- UDISE
- Block, management, location
- Student counts (Grade 5 student count, Grade 8 student count)

**Grade selector:**
Two tabs:
- Grade 5
- Grade 8

**Grade summary cards:**
- Overall average marks out of total
- Overall percent
- Subject averages as smaller cards

**Subject selector:**
Show subjects for the selected grade as tabs

**LO wise table:**

Columns:
- LO Code
- LO Description
- Item count
- Percent correct
- Attempts (optional)

**Sorting:**
- Default sort by percent ascending, so weakest shows on top
- Search within LO description

**Empty state:**
If no data exists for the selected grade or subject, show "No data available for this grade and subject."

## 7. Tech Requirements

### 7.1 Frontend

- Vite + React + TypeScript
- Tailwind for styling
- No backend required

### 7.2 Preprocessing Script

- Node script using `xlsx` library
- Run command: `npm run preprocess`
- Writes JSON to `public/data`
- Must validate outputs and print a summary

### 7.3 Performance Targets

- Dashboard initial load under 2 seconds on normal laptop once JSON exists
- School report route change under 500 ms after JSON loaded
- No heavy computations in the UI beyond filtering and sorting

## 8. Data Validation and Error Handling

### 8.1 Validation Checks in Preprocessing

- UDISE present in student files must exist in schools master, else log as unknown school
- Response string length must equal expected questions for that Grade and Day, if not, log and skip that row
- Only letters A to D and asterisk allowed, anything else becomes invalid response and scores 0
- Keys must cover all positions, if missing, stop preprocessing and throw error

### 8.2 Logging Outputs

At the end print:
- Total schools loaded
- Total student rows processed (Grade 5, Grade 8)
- Number of rows skipped and reasons
- Number of unknown UDISE rows

## 9. Step by Step Build Plan

**Step 1: Repo setup**
- Create Vite React TypeScript app
- Add Tailwind
- Create routes for Dashboard and SchoolReport

**Step 2: Add preprocessing**
- Add `scripts/preprocess/preprocess.js`
- Read four Excel files
- Clean schools master header row and columns
- Build `keysByPosition` for each Grade and Day
- Parse each student row, compute item scores
- Aggregate to school subject averages and LO breakdown
- Write JSON outputs

**Step 3: Build Dashboard UI**
- Load `schools.json` and `schoolAggregates.json`
- Join by udise in memory
- Implement filters, sorting, pagination
- Add View School Report navigation

**Step 4: Build School report UI**
- Load `schoolLoBreakdown.json`
- Filter by udise then grade then subject
- Render LO table with sorting

**Step 5: QA with spot checks**
- Pick 2 schools and manually verify one student row scoring matches answer key
- Verify subject totals (Grade 5 out of 15, Grade 8 out of 20)
- Verify LO aggregation sums match item mapping

## 10. Out of Scope

- PDF generation
- User login
- Bilingual support
- Student level drilldowns (unless needed later)

---

**Document Status:** Initial Draft  
**Date:** January 13, 2026  
**Project:** Anugul District School Assessment Dashboard

