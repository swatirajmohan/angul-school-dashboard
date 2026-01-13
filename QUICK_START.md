# Quick Start Guide 🚀

## ✅ Your Excel Files Are Ready!

Great news! I can see all 4 Excel files are already in your `data-source` folder:
- ✅ Schools list
- ✅ Answer keys  
- ✅ Grade 5 responses
- ✅ Grade 8 responses

## Next Step: Configure Paths

### Create the `.env` file

1. **In your project folder** (`angulpilotdashboard`), create a new file named `.env`

2. **Copy and paste these 4 lines** into it:

```
ANGUL_SCHOOLS_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version_  List of schools in Anugul.xlsx
ANGUL_KEYS_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version_ Angul_Item LOs and Answer Keys.xlsx
ANGUL_GRADE5_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version_ Grade 5 Day 1 & 2.xlsx
ANGUL_GRADE8_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version_ Grade 8 Day 1 & 2.xlsx
```

3. **Save** the file

## Run the Processing

Open Terminal and run:

```bash
cd /Users/swatirajmohan/Desktop/angulpilotdashboard
npm run preprocess
```

## What Happens Next

The program will:
1. Read all 4 Excel files ⏱️ (~5 seconds)
2. Score all student responses ⏱️ (~10-20 seconds)
3. Generate 3 data files ⏱️ (~2 seconds)

**Total time:** About 20-30 seconds

## Success! ✅

You'll see:
```
✅ STEP 4 COMPLETE: schoolLoBreakdown.json generated successfully!
=== ALL PREPROCESSING STEPS COMPLETE ===
```

## Verify Outputs

Check that these files exist in `public/data/`:
- `schools.json` - ✅ School master list
- `itemKeys.json` - ✅ Answer key mappings
- `schoolAggregates.json` - ✅ School performance data
- `schoolLoBreakdown.json` - ✅ LO-wise breakdown

---

## 🎉 Now View the Dashboard!

After data processing is complete, run:

```bash
npm run dev
```

Then open your browser to: **http://localhost:5173/**

You'll see the **Anugul School Assessment Dashboard** with all 1,446 schools displayed in a table!

### What You'll See:
- ✅ All schools with their UDISE and Block
- ✅ Grade 5 subject averages (Odia, English, Math, EVS)
- ✅ Grade 8 subject averages (Odia, English, Math, Science, Social Science)
- ✅ Performance shown as "8.5 / 15 (56.7%)"
- ✅ "View School Report" button (detail view coming soon!)

**To stop the dashboard:** Press `Ctrl+C` in the terminal.

---

## Need Help?

### If you see: "Setup Required: Excel File Paths Not Configured"
→ You haven't created the `.env` file yet. See step 1 above.

### If you see: "File Not Found"
→ Check the file paths in your `.env` file match the actual file locations.

### Dashboard shows "Loading..." forever
→ Make sure you've run `npm run preprocess` first to generate the data files.

### Other issues?
→ Check `README.md` for detailed troubleshooting.

---

**You're all set!** Data processing and dashboard are both ready. 🚀

