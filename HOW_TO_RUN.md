# How to Run the Anugul School Assessment Dashboard

## Quick Start (3 Steps)

### 1️⃣ Generate Data (First Time Only)

Open Terminal and run:

```bash
cd /Users/swatirajmohan/Desktop/angulpilotdashboard
npm run preprocess
```

**What happens:** Processes all Excel files and generates 4 JSON files (~30-40 seconds)

**You'll see:**
```
=== STEP 1: Processing Schools Master ===
=== STEP 2: Processing Answer Keys ===
=== STEP 3: Processing Student Responses ===
=== STEP 4: Processing LO-wise Breakdown ===
✅ STEP 4 COMPLETE: schoolLoBreakdown.json generated successfully!
=== ALL PREPROCESSING STEPS COMPLETE ===
```

---

### 2️⃣ Start the Dashboard

```bash
npm run dev
```

**You'll see:**
```
VITE v5.0.11  ready in 234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### 3️⃣ Open in Browser

Go to: **http://localhost:5173/**

🎉 You should see the dashboard with all 1,446 schools!

---

## What You'll See

### Dashboard Features (Current):
✅ **Complete school list** - All 1,446 schools from Anugul district  
✅ **School information** - Name, UDISE, Block  
✅ **Grade 5 performance** - Odia, English, Mathematics, EVS  
✅ **Grade 8 performance** - Odia, English, Mathematics, Science, Social Science  
✅ **Clear display** - Shows "8.5 / 15 (56.7%)" format  
✅ **Data safety** - Shows "No data" for missing subjects  
✅ **Professional design** - Clean table with sticky headers  

### Coming Soon:
⏳ Search by school name or UDISE  
⏳ Filter by Block, Management, Location  
⏳ Sort by any column  
⏳ Pagination  
⏳ School detail view with LO breakdown  

---

## Console Logs

Check your browser console (F12) to see:
```
Total schools loaded: 1446
Schools with Grade 5 data: 1234
Schools with Grade 8 data: 1189
```

---

## To Stop the Dashboard

Press `Ctrl+C` in the terminal where `npm run dev` is running.

---

## Troubleshooting

### "Failed to load data files"
**Problem:** JSON files don't exist  
**Solution:** Run `npm run preprocess` first

### "Cannot GET /data/schools.json"
**Problem:** Vite server not finding files  
**Solution:** Make sure files are in `public/data/` not `src/data/`

### Dashboard is blank
**Problem:** Check browser console for errors  
**Solution:** Open DevTools (F12) and check Console tab

### Port 5173 already in use
**Problem:** Another Vite server is running  
**Solution:** Stop other server or use `npm run dev -- --port 5174`

---

## File Structure

```
angulpilotdashboard/
├── public/
│   └── data/                    # Data files (auto-generated)
│       ├── schools.json
│       ├── itemKeys.json
│       ├── schoolAggregates.json
│       └── schoolLoBreakdown.json
├── src/
│   ├── pages/
│   │   └── Dashboard.tsx        # Main dashboard page
│   ├── styles/
│   │   └── Dashboard.css        # Dashboard styles
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # React entry point
│   ├── types.ts                 # TypeScript types
│   └── index.css                # Global styles
├── scripts/
│   └── preprocess.ts            # Data preprocessing
├── data-source/                 # Your Excel files
├── .env                         # Configuration
└── package.json                 # Dependencies
```

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run preprocess` | Process Excel files → Generate JSON |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

---

**Need more help?** Check `README.md` or `QUICK_START.md` for detailed instructions.

