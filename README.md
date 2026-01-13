# Anugul District School Assessment Dashboard

## Current Status: STEP 5 Complete ✓

The complete system is ready! Data preprocessing is done and the dashboard UI is displaying school-wise assessment results.

## How to Set Up Excel Paths (No Coding Required!)

**For Non-Technical Users:** Don't worry! You don't need to know coding. Just follow these simple steps:

### Step 1: Create a Configuration File

1. **Open your project folder** named `angulpilotdashboard`
2. **Create a new text file** in this folder:
   - On Mac: Right-click → New Document (or use TextEdit)
   - On Windows: Right-click → New → Text Document
3. **Name it exactly:** `.env` (yes, it starts with a dot!)
   - If your computer hides the dot, name it `env.txt` first, then rename to `.env`

### Step 2: Tell the Program Where Your Excel Files Are

1. **Open the `.env` file** in any text editor (Notepad, TextEdit, etc.)
2. **Copy and paste these 4 lines** into the file:

```
ANGUL_SCHOOLS_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version:  List of schools in Anugul.xlsx
ANGUL_KEYS_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version: Angul_Item LOs and Answer Keys.xlsx
ANGUL_GRADE5_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version: Grade 5 Day 1 & 2.xlsx
ANGUL_GRADE8_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version: Grade 8 Day 1 & 2.xlsx
```

3. **If your Excel files are somewhere else:**
   - Replace the part after `=` with the actual location
   - Make sure to keep the exact file names (including spaces and special characters)
   - Example: If your files are in `Documents/Angul`, change to:
     `ANGUL_SCHOOLS_XLSX_PATH=/Users/yourname/Documents/Angul/Cursor Version:  List of schools in Anugul.xlsx`

4. **Save the file** and close it

### Step 3: You're Done! ✅

The program will now know where to find your Excel files. You don't need to touch the `.env` file again unless you move the Excel files to a different location.

---

## For Technical Users: Quick Setup

```bash
cp .env.example .env
# Edit .env and set all 4 paths
```

## Running the Data Processing

### Open Terminal/Command Prompt

1. Navigate to your project folder:
   ```bash
   cd /Users/swatirajmohan/Desktop/angulpilotdashboard
   ```

2. Run the processing command:
   ```bash
   npm run preprocess
   ```

### What Happens Next

The program will:
1. **Read all 4 Excel files** (schools, answer keys, Grade 5 responses, Grade 8 responses)
2. **Validate the data** and check for any issues
3. **Score all student responses** using the answer keys
4. **Calculate school-level averages** for each subject and grade
5. **Generate LO-wise breakdowns** showing performance on each learning outcome
6. **Generate 4 clean data files** ready for the dashboard

**Time:** Takes about 20-40 seconds depending on your computer.

## What You'll See (Console Output)

The program will print progress messages:

**STEP 1 - Schools:**
- Reading schools Excel file
- Number of schools found
- Sample school records

**STEP 2 - Answer Keys:**
- Reading answer keys file
- Questions organized by grade and subject
- Validation that all questions are accounted for

**STEP 3 - Student Responses:**
- Processing Grade 5 students
- Processing Grade 8 students
- Number of students scored
- Schools with data for each grade
- Sample results for 2 schools

**STEP 4 - LO Breakdown:**
- Processing LO-wise performance for Grade 5
- Processing LO-wise performance for Grade 8
- Total LO records generated
- Sample LO breakdown for one school

**Final Message:**
```
✅ STEP 4 COMPLETE: schoolLoBreakdown.json generated successfully!
=== ALL PREPROCESSING STEPS COMPLETE ===
```

## Verify Everything Worked

Check that these 4 files were created in `public/data/`:
1. **schools.json** - List of all 1446 schools
2. **itemKeys.json** - Answer keys organized by grade and day
3. **schoolAggregates.json** - School performance summaries ⭐
4. **schoolLoBreakdown.json** - Detailed LO-wise performance ⭐

## Project Structure

```
angulpilotdashboard/
├── data-source/                    # Your Excel files go here
│   ├── Cursor Version:  List of schools in Anugul.xlsx
│   ├── Cursor Version: Angul_Item LOs and Answer Keys.xlsx
│   ├── Cursor Version: Grade 5 Day 1 & 2.xlsx
│   └── Cursor Version: Grade 8 Day 1 & 2.xlsx
├── scripts/
│   └── preprocess.ts              # Main processing script
├── public/
│   └── data/                      # Generated outputs
│       ├── schools.json           # School master data
│       ├── itemKeys.json          # Answer key mappings
│       ├── schoolAggregates.json  # School performance data ⭐
│       └── schoolLoBreakdown.json # LO-wise performance ⭐
├── .env                           # Your configuration (create this!)
├── .env.example                   # Template
├── package.json
└── README.md
```

## Common Issues & Solutions

### ⚠️ "Setup Required: Excel File Paths Not Configured"

**What it means:** You haven't created the `.env` file yet.

**Solution:**
1. Follow the "How to Set Up Excel Paths" section above
2. Create a `.env` file in your project folder
3. Copy the 4 lines with file paths into it

---

### ❌ "File Not Found"

**What it means:** The program can't find one or more Excel files at the paths you provided.

**Solution:**
1. Check that all 4 Excel files are in the `data-source` folder
2. Check the file names exactly match (including spaces)
3. If files are elsewhere, update the paths in `.env` file

---

### ⚠️ "Required fields not found"

**What it means:** An Excel file is missing expected column headers.

**Solution:** The program will tell you which columns are missing. Check your Excel file to ensure it has the correct headers.

---

### ⚠️ "Item count mismatch"

**What it means:** The answer key file doesn't have the expected number of questions.

**Expected counts:**
- Grade 5 Day 1: 30 questions (15 Odia + 15 EVS)
- Grade 5 Day 2: 30 questions (15 English + 15 Mathematics)
- Grade 8 Day 1: 60 questions (20 Odia + 20 English + 20 Science)
- Grade 8 Day 2: 40 questions (20 Mathematics + 20 Social Science)

**Solution:** Check your answer key Excel file for missing or extra rows.

## Data Outputs

### schools.json
Array of school records with:
- `udise` - School UDISE code
- `schoolName` - School name
- `block` - Block name
- `management` - Management type (Govt/Govt Aided)
- `location` - Location (Rural/Urban)

### itemKeys.json
Ordered answer key mappings for each grade/day combination:
- `grade5_day1` - Array of 30 items (Odia, EVS)
- `grade5_day2` - Array of 30 items (English, Mathematics)
- `grade8_day1` - Array of 60 items (Odia, English, Science)
- `grade8_day2` - Array of 40 items (Mathematics, Social Science)

Each item includes position, subject, answer key, and learning outcome details.

### schoolAggregates.json ⭐ (Main Output)

School-level performance data for the dashboard:

**Structure per school:**
```json
{
  "21010101234": {
    "udise": "21010101234",
    "grade5": {
      "studentCount": 45,
      "subjects": {
        "Odia": { "avgMarks": 8.5, "totalMarks": 15, "avgPercent": 56.67 },
        "English": { "avgMarks": 7.2, "totalMarks": 15, "avgPercent": 48.0 },
        "Mathematics": { "avgMarks": 6.8, "totalMarks": 15, "avgPercent": 45.33 },
        "EVS": { "avgMarks": 9.1, "totalMarks": 15, "avgPercent": 60.67 }
      },
      "overallAvgMarks": 7.9,
      "overallPercent": 52.67
    },
    "grade8": { ... similar structure ... }
  }
}
```

**What it contains:**
- Average marks per subject (out of 15 for Grade 5, out of 20 for Grade 8)
- Average percentage per subject
- Overall averages across all subjects
- Student count per grade

### schoolLoBreakdown.json ⭐ (LO-wise Details)

Learning Outcome level performance data showing which specific LOs need attention:

**Structure per school:**
```json
{
  "21010101234": {
    "grade5": {
      "Odia": [
        {
          "loCode": "LO501",
          "loDescription": "Reads simple words and sentences",
          "itemCount": 3,
          "attempts": 135,
          "correct": 89,
          "percent": 65.9
        },
        {
          "loCode": "LO502",
          "loDescription": "Identifies main idea in a passage",
          "itemCount": 2,
          "attempts": 90,
          "correct": 54,
          "percent": 60.0
        }
      ],
      "English": [ ... ],
      "Mathematics": [ ... ],
      "EVS": [ ... ]
    },
    "grade8": {
      "Odia": [ ... ],
      "English": [ ... ],
      "Mathematics": [ ... ],
      "Science": [ ... ],
      "Social Science": [ ... ]
    }
  }
}
```

**What it contains:**
- **loCode** - Learning Outcome identifier
- **loDescription** - What the learning outcome measures
- **itemCount** - Number of questions mapped to this LO
- **attempts** - Total attempts across all students and items (includes wrong and unanswered)
- **correct** - Number of correct responses
- **percent** - Success rate (rounded to 1 decimal place)

**Use case:** Identify which specific learning outcomes are weak within each subject so teachers can focus on those areas.

## Running the Dashboard

### Step 1: Generate Data Files (One-time Setup)

If you haven't run the preprocessing yet:

```bash
cd /Users/swatirajmohan/Desktop/angulpilotdashboard
npm run preprocess
```

This will generate 4 JSON files in `public/data/`.

### Step 2: Start the Dashboard

```bash
npm run dev
```

You'll see:
```
VITE v5.0.11  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 3: Open in Browser

Open your web browser and go to: **http://localhost:5173/**

You should see the Anugul School Assessment Dashboard with a table showing all 1,446 schools!

### To Stop the Server

Press `Ctrl+C` in the terminal.

## What You Can See in the Dashboard

✅ **Complete school list** with all 1,446 schools  
✅ **Grade 5 performance** - Odia, English, Mathematics, EVS  
✅ **Grade 8 performance** - Odia, English, Mathematics, Science, Social Science  
✅ **Average marks** displayed as "8.5 / 15"  
✅ **Percentages** displayed as "(56.7%)"  
✅ **"No data"** shown for schools without assessment data  

**Note:** Filters, sorting, pagination, and school detail views will be added in future steps.

## Next Steps

- Add filters (search, block, management, location)
- Add sorting functionality
- Add pagination
- Build school detail view with LO breakdown
- Add visualizations

