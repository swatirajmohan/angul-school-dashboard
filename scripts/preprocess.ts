/**
 * Anugul Schools Preprocessing Script
 * 
 * This script reads Excel files and generates clean JSON outputs for the dashboard.
 * 
 * SETUP:
 * 1. Copy .env.example to .env
 * 2. Set ANGUL_SCHOOLS_XLSX_PATH to the absolute path of your schools Excel file
 *    Example: ANGUL_SCHOOLS_XLSX_PATH=/Users/yourname/Desktop/Cursor Version:  List of schools in Anugul.xlsx
 * 3. Set ANGUL_KEYS_XLSX_PATH to the absolute path of your answer keys Excel file
 *    Example: ANGUL_KEYS_XLSX_PATH=/Users/yourname/Desktop/Cursor Version: Angul_Item LOs and Answer Keys.xlsx
 * 4. Run: npm run preprocess
 */

import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate that all required environment variables are set
 * If not, print a friendly message and exit
 */
function validateEnvironmentVariables(): void {
  const requiredVars = [
    'ANGUL_SCHOOLS_XLSX_PATH',
    'ANGUL_KEYS_XLSX_PATH',
    'ANGUL_GRADE5_XLSX_PATH',
    'ANGUL_GRADE8_XLSX_PATH'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  SETUP REQUIRED: Excel File Paths Not Configured');
    console.log('='.repeat(70));
    console.log('\nThe preprocessing script needs to know where your Excel files are located.');
    console.log('\n📝 Please follow these steps:\n');
    console.log('1. Create a file named ".env" in your project folder');
    console.log('   (The same folder where package.json is located)');
    console.log('\n2. Copy and paste the following lines into the .env file:\n');
    console.log('-'.repeat(70));
    console.log('ANGUL_SCHOOLS_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version:  List of schools in Anugul.xlsx');
    console.log('ANGUL_KEYS_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version: Angul_Item LOs and Answer Keys.xlsx');
    console.log('ANGUL_GRADE5_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version: Grade 5 Day 1 & 2.xlsx');
    console.log('ANGUL_GRADE8_XLSX_PATH=/Users/swatirajmohan/Desktop/angulpilotdashboard/data-source/Cursor Version: Grade 8 Day 1 & 2.xlsx');
    console.log('-'.repeat(70));
    console.log('\n3. If your Excel files are in a different location, update the paths accordingly');
    console.log('   Make sure to use the complete file path with correct spaces and special characters\n');
    console.log('4. Save the .env file and run "npm run preprocess" again\n');
    console.log('='.repeat(70) + '\n');
    process.exit(0);
  }
}

/**
 * Validate that all required files exist at the specified paths
 */
function validateFileExistence(): void {
  const filePaths = [
    { name: 'Schools Master', path: process.env.ANGUL_SCHOOLS_XLSX_PATH! },
    { name: 'Answer Keys', path: process.env.ANGUL_KEYS_XLSX_PATH! },
    { name: 'Grade 5 Student Responses', path: process.env.ANGUL_GRADE5_XLSX_PATH! },
    { name: 'Grade 8 Student Responses', path: process.env.ANGUL_GRADE8_XLSX_PATH! }
  ];

  let hasError = false;

  for (const file of filePaths) {
    if (!fs.existsSync(file.path)) {
      if (!hasError) {
        console.log('\n' + '='.repeat(70));
        console.log('❌ FILE NOT FOUND');
        console.log('='.repeat(70));
        hasError = true;
      }
      console.log(`\n📁 ${file.name} file not found at:`);
      console.log(`   ${file.path}`);
      console.log('\n   Please check:');
      console.log('   - The file exists at this location');
      console.log('   - The file name is spelled correctly (including spaces)');
      console.log('   - The path in your .env file is correct\n');
    }
  }

  if (hasError) {
    console.log('='.repeat(70) + '\n');
    process.exit(0);
  }
}

// Validate environment before doing anything else
validateEnvironmentVariables();
validateFileExistence();

// Type definitions
interface SchoolRecord {
  udise: string;
  schoolName: string;
  block: string;
  management: string;
  location: string;
}

interface ItemKey {
  grade: number;
  day: number;
  subject: string;
  loCode: string;
  loDescription: string;
  questionNumber: number;
  answerKey: string;
  position: number;
}

interface ItemKeysOutput {
  grade5_day1: ItemKey[];
  grade5_day2: ItemKey[];
  grade8_day1: ItemKey[];
  grade8_day2: ItemKey[];
}

interface SubjectAggregate {
  avgMarks: number;
  totalMarks: number;
  avgPercent: number;
}

interface GradeAggregate {
  studentCount: number;
  subjects: Record<string, SubjectAggregate>;
  overallAvgMarks: number;
  overallPercent: number;
}

interface SchoolAggregate {
  udise: string;
  grade5?: GradeAggregate;
  grade8?: GradeAggregate;
}

interface LORecord {
  loCode: string;
  loDescription: string;
  itemCount: number;
  attempts: number;
  correct: number;
  percent: number;
}

interface SchoolLoBreakdown {
  [udise: string]: {
    grade5?: {
      [subject: string]: LORecord[];
    };
    grade8?: {
      [subject: string]: LORecord[];
    };
  };
}

// Header alias mapping for schools
const SCHOOL_HEADER_ALIASES: Record<string, string[]> = {
  udise: ["UDISE", "UDISE Code", "UDISE_CODE", "Udise", "Udise Code", "Udise_Code"],
  block: ["Block", "Block Name", "BLOCK", "Block_Name"],
  schoolName: ["School Name", "Name of School", "School", "SCHOOL NAME", "School_Name"],
  management: ["Management", "Management Type", "School Management", "mgmt"],
  location: ["Location", "School Location", "Rural/Urban", "Area", "School_Location"]
};

// Header alias mapping for answer keys
const KEY_HEADER_ALIASES: Record<string, string[]> = {
  grade: ["Grade", "GRADE", "Class"],
  day: ["Day", "DAY", "Assessment Day"],
  subject: ["Subject", "SUBJECT", "Subject Name"],
  loCode: ["LO Code", "LO_Code", "LO CODE", "Learning Outcome Code", "LOCode"],
  loDescription: ["LO Description", "LO_Description", "LO DESC", "Learning Outcome Description", "LO"],
  questionNumber: ["Question Number", "Question No", "Question No.", "Qn No", "Q No", "QNo", "Question_Number"],
  answerKey: ["Answer Key", "Answer", "Correct Answer", "Key", "ANSWER KEY"]
};

// Header alias mapping for student responses
const STUDENT_HEADER_ALIASES: Record<string, string[]> = {
  grade: ["Grade", "GRADE", "Class"],
  day: ["Day", "DAY", "Assessment Day"],
  udise: ["UDISE", "UDISE Code", "UDISE_CODE", "Udise", "Udise Code", "Udise_Code"],
  block: ["Block", "Block Name", "BLOCK", "Block_Name"],
  responses: ["Student Responses", "Responses", "Response", "Student Response", "RESPONSES", "Answer String", "Answers"]
};

// Subject order configuration for each grade and day
const SUBJECT_ORDER: Record<string, string[]> = {
  'grade5_day1': ['Odia', 'EVS'],
  'grade5_day2': ['English', 'Mathematics'],
  'grade8_day1': ['Odia', 'English', 'Science'],
  'grade8_day2': ['Mathematics', 'Social Science']
};

// Expected question counts
const EXPECTED_COUNTS: Record<string, number> = {
  'grade5_day1': 30,  // 15 Odia + 15 EVS
  'grade5_day2': 30,  // 15 English + 15 Mathematics
  'grade8_day1': 60,  // 20 Odia + 20 English + 20 Science
  'grade8_day2': 40   // 20 Mathematics + 20 Social Science
};

/**
 * Find the actual column name from Excel headers using aliases
 */
function findColumnName(headers: string[], aliases: string[]): string | null {
  for (const alias of aliases) {
    const found = headers.find(h => h && h.trim() === alias);
    if (found) return found;
  }
  return null;
}

/**
 * Read schools master Excel and generate schools.json
 */
function processSchoolsMaster(): void {
  console.log('\n=== STEP 1: Processing Schools Master ===\n');

  // Check environment variable
  const schoolsPath = process.env.ANGUL_SCHOOLS_XLSX_PATH;
  if (!schoolsPath) {
    throw new Error(
      'ANGUL_SCHOOLS_XLSX_PATH not set in .env file.\n' +
      'Please copy .env.example to .env and set the path to your schools Excel file.'
    );
  }

  // Check file exists
  if (!fs.existsSync(schoolsPath)) {
    throw new Error(
      `Schools Excel file not found at path: ${schoolsPath}\n` +
      'Please verify the ANGUL_SCHOOLS_XLSX_PATH in your .env file.'
    );
  }

  console.log(`Reading Excel file from: ${schoolsPath}`);

  // Read Excel file
  const workbook = XLSX.readFile(schoolsPath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  console.log(`Reading sheet: ${firstSheetName}`);

  // Convert sheet to JSON with header option to get raw rows
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

  console.log(`Raw rows read from Excel: ${rawRows.length}`);

  if (rawRows.length < 2) {
    throw new Error('Excel file must have at least 2 rows (header + data)');
  }

  // Find the first non-empty row as header (skip empty rows)
  let headerRowIndex = 0;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const hasContent = row.some((cell: any) => cell && String(cell).trim() !== '');
    if (hasContent) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = rawRows[headerRowIndex];
  const headers = headerRow.map((h: any) => String(h || '').trim());
  const dataStartIndex = headerRowIndex + 1;

  console.log(`Headers found: ${headers.join(', ')}`);

  // Map internal field names to actual Excel column names
  const columnMap: Record<string, string> = {};
  const missingFields: string[] = [];

  for (const [internalField, aliases] of Object.entries(SCHOOL_HEADER_ALIASES)) {
    const columnName = findColumnName(headers, aliases);
    if (columnName) {
      columnMap[internalField] = columnName;
    } else {
      missingFields.push(internalField);
    }
  }

  // Fail if required fields are missing
  if (missingFields.length > 0) {
    throw new Error(
      `Required fields not found in Excel headers: ${missingFields.join(', ')}\n` +
      `Available headers: ${headers.join(', ')}\n` +
      `Expected one of these aliases for each field:\n` +
      missingFields.map(f => `  ${f}: ${SCHOOL_HEADER_ALIASES[f].join(', ')}`).join('\n')
    );
  }

  console.log('\nColumn mapping successful:');
  for (const [field, column] of Object.entries(columnMap)) {
    console.log(`  ${field} → "${column}"`);
  }

  // Process data rows (starting from after header row)
  const schools: SchoolRecord[] = [];
  let skippedCount = 0;

  for (let i = dataStartIndex; i < rawRows.length; i++) {
    const row = rawRows[i];
    
    // Create object from row using headers
    const rowObj: Record<string, any> = {};
    headers.forEach((header, index) => {
      rowObj[header] = row[index];
    });

    // Extract fields using column map
    const udiseRaw = rowObj[columnMap.udise];
    const schoolNameRaw = rowObj[columnMap.schoolName];
    const blockRaw = rowObj[columnMap.block];
    const managementRaw = rowObj[columnMap.management];
    const locationRaw = rowObj[columnMap.location];

    // Convert and clean
    const udise = String(udiseRaw || '').trim();
    const schoolName = String(schoolNameRaw || '').trim();
    const block = String(blockRaw || '').trim();
    const management = String(managementRaw || '').trim();
    const location = String(locationRaw || '').trim();

    // Skip rows missing critical fields
    if (!udise || !schoolName) {
      skippedCount++;
      continue;
    }

    schools.push({
      udise,
      schoolName,
      block,
      management,
      location
    });
  }

  console.log(`\nProcessing complete:`);
  console.log(`  Valid schools: ${schools.length}`);
  console.log(`  Skipped rows (missing udise or schoolName): ${skippedCount}`);

  // Ensure output directory exists
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`\nCreated output directory: ${outputDir}`);
  }

  // Write schools.json
  const outputPath = path.join(outputDir, 'schools.json');
  fs.writeFileSync(outputPath, JSON.stringify(schools, null, 2), 'utf-8');

  console.log(`\nOutput written to: ${outputPath}`);

  // Display first 5 schools as sample
  console.log('\nSample records (first 5):');
  schools.slice(0, 5).forEach((school, index) => {
    console.log(`\n${index + 1}. ${school.schoolName}`);
    console.log(`   UDISE: ${school.udise}`);
    console.log(`   Block: ${school.block}`);
    console.log(`   Management: ${school.management}`);
    console.log(`   Location: ${school.location}`);
  });

  console.log('\n=== STEP 1 COMPLETE ===\n');
}

/**
 * Read answer keys Excel and generate itemKeys.json
 */
function processAnswerKeys(): void {
  console.log('\n=== STEP 2: Processing Answer Keys ===\n');

  // Check environment variable
  const keysPath = process.env.ANGUL_KEYS_XLSX_PATH;
  if (!keysPath) {
    throw new Error(
      'ANGUL_KEYS_XLSX_PATH not set in .env file.\n' +
      'Please set the path to your answer keys Excel file in .env'
    );
  }

  // Check file exists
  if (!fs.existsSync(keysPath)) {
    throw new Error(
      `Answer keys Excel file not found at path: ${keysPath}\n` +
      'Please verify the ANGUL_KEYS_XLSX_PATH in your .env file.'
    );
  }

  console.log(`Reading Excel file from: ${keysPath}`);

  // Read Excel file
  const workbook = XLSX.readFile(keysPath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  console.log(`Reading sheet: ${firstSheetName}`);

  // Convert sheet to JSON with header option to get raw rows
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  console.log(`Raw rows read from Excel: ${rawRows.length}`);

  if (rawRows.length < 2) {
    throw new Error('Answer keys Excel file must have at least 2 rows (header + data)');
  }

  // Row 1 is the header (index 0)
  const headerRow = rawRows[0];
  const headers = headerRow.map((h: any) => String(h || '').trim());

  console.log(`Headers found: ${headers.join(', ')}`);

  // Map internal field names to actual Excel column names
  // Note: "day" is optional - we'll derive it from grade + subject
  const columnMap: Record<string, string> = {};
  const missingFields: string[] = [];
  const requiredFields = ['grade', 'subject', 'loCode', 'loDescription', 'questionNumber', 'answerKey'];

  for (const [internalField, aliases] of Object.entries(KEY_HEADER_ALIASES)) {
    const columnName = findColumnName(headers, aliases);
    if (columnName) {
      columnMap[internalField] = columnName;
    } else if (requiredFields.includes(internalField)) {
      missingFields.push(internalField);
    }
  }

  // Fail if required fields are missing
  if (missingFields.length > 0) {
    throw new Error(
      `Required fields not found in Excel headers: ${missingFields.join(', ')}\n` +
      `Available headers: ${headers.join(', ')}\n` +
      `Expected one of these aliases for each field:\n` +
      missingFields.map(f => `  ${f}: ${KEY_HEADER_ALIASES[f].join(', ')}`).join('\n')
    );
  }

  // Map subjects to days
  const subjectToDayMap: Record<string, Record<string, number>> = {
    '5': {
      'Odia': 1,
      'EVS': 1,
      'English': 2,
      'Mathematics': 2
    },
    '8': {
      'Odia': 1,
      'English': 1,
      'Science': 1,
      'Mathematics': 2,
      'Social Science': 2
    }
  };

  console.log('\nColumn mapping successful:');
  for (const [field, column] of Object.entries(columnMap)) {
    console.log(`  ${field} → "${column}"`);
  }

  // Process data rows (starting from row 2, index 1)
  const allItems: ItemKey[] = [];
  let skippedCount = 0;

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    
    // Create object from row using headers
    const rowObj: Record<string, any> = {};
    headers.forEach((header, index) => {
      rowObj[header] = row[index];
    });

    // Extract fields using column map
    const gradeRaw = rowObj[columnMap.grade];
    const subjectRaw = rowObj[columnMap.subject];
    const loCodeRaw = rowObj[columnMap.loCode];
    const loDescriptionRaw = rowObj[columnMap.loDescription];
    const questionNumberRaw = rowObj[columnMap.questionNumber];
    const answerKeyRaw = rowObj[columnMap.answerKey];

    // Convert and clean
    const grade = Number(gradeRaw);
    const subject = String(subjectRaw || '').trim();
    const loCode = String(loCodeRaw || '').trim();
    const loDescription = String(loDescriptionRaw || '').trim();
    const questionNumber = Number(questionNumberRaw);
    const answerKey = String(answerKeyRaw || '').trim().toUpperCase();

    // Derive day from grade and subject
    const day = subjectToDayMap[String(grade)]?.[subject];

    // Skip rows with invalid data
    if (isNaN(grade) || !day || isNaN(questionNumber) || !subject || !answerKey) {
      if (!day && subject) {
        console.warn(`Warning: Unknown subject "${subject}" for grade ${grade} at row ${i + 1}`);
      }
      skippedCount++;
      continue;
    }

    // Validate answer key is A, B, C, or D
    if (!['A', 'B', 'C', 'D'].includes(answerKey)) {
      console.warn(`Warning: Invalid answer key "${answerKey}" at row ${i + 1}, skipping`);
      skippedCount++;
      continue;
    }

    allItems.push({
      grade,
      day,
      subject,
      loCode,
      loDescription,
      questionNumber,
      answerKey,
      position: 0  // Will be assigned later
    });
  }

  console.log(`\nProcessing complete:`);
  console.log(`  Valid items: ${allItems.length}`);
  console.log(`  Skipped rows: ${skippedCount}`);

  // Build ordered arrays for each grade and day
  const itemKeys: ItemKeysOutput = {
    grade5_day1: [],
    grade5_day2: [],
    grade8_day1: [],
    grade8_day2: []
  };

  // Process each grade/day combination
  for (const [key, subjectOrder] of Object.entries(SUBJECT_ORDER)) {
    const [gradeStr, dayStr] = key.split('_');
    const grade = parseInt(gradeStr.replace('grade', ''));
    const day = parseInt(dayStr.replace('day', ''));

    console.log(`\nBuilding ${key}:`);

    // Filter items for this grade and day
    const filteredItems = allItems.filter(item => item.grade === grade && item.day === day);
    console.log(`  Found ${filteredItems.length} items for Grade ${grade}, Day ${day}`);

    // Build ordered array by subject order
    const orderedItems: ItemKey[] = [];
    let position = 1;

    for (const subjectName of subjectOrder) {
      // Get items for this subject
      const subjectItems = filteredItems.filter(item => 
        item.subject.toLowerCase() === subjectName.toLowerCase()
      );

      // Sort by question number
      subjectItems.sort((a, b) => a.questionNumber - b.questionNumber);

      console.log(`  ${subjectName}: ${subjectItems.length} items`);

      // Assign positions and add to ordered array
      for (const item of subjectItems) {
        orderedItems.push({
          ...item,
          position
        });
        position++;
      }
    }

    // Validate count
    const expectedCount = EXPECTED_COUNTS[key];
    if (orderedItems.length !== expectedCount) {
      throw new Error(
        `Item count mismatch for ${key}!\n` +
        `Expected: ${expectedCount}, Got: ${orderedItems.length}\n` +
        `This means the answer key file is incomplete or has incorrect data.`
      );
    }

    console.log(`  ✓ Total items: ${orderedItems.length} (matches expected ${expectedCount})`);

    // Assign to output
    itemKeys[key as keyof ItemKeysOutput] = orderedItems;
  }

  // Ensure output directory exists
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write itemKeys.json
  const outputPath = path.join(outputDir, 'itemKeys.json');
  fs.writeFileSync(outputPath, JSON.stringify(itemKeys, null, 2), 'utf-8');

  console.log(`\nOutput written to: ${outputPath}`);

  // Display first 3 items of each array as sample
  console.log('\nSample items (first 3 of each grade/day):');
  for (const [key, items] of Object.entries(itemKeys)) {
    console.log(`\n${key.toUpperCase()}:`);
    items.slice(0, 3).forEach((item) => {
      console.log(`  Position ${item.position}: Grade ${item.grade}, Day ${item.day}, ${item.subject}, Q${item.questionNumber} → ${item.answerKey}`);
      console.log(`    LO: ${item.loCode} - ${item.loDescription}`);
    });
  }

  console.log('\n=== STEP 2 COMPLETE ===\n');
}

/**
 * Process student response files and generate schoolAggregates.json
 */
function processStudentResponses(): void {
  console.log('\n=== STEP 3: Processing Student Responses ===\n');

  // Load itemKeys.json
  const itemKeysPath = path.join(__dirname, '..', 'public', 'data', 'itemKeys.json');
  if (!fs.existsSync(itemKeysPath)) {
    throw new Error(
      'itemKeys.json not found. Please run STEP 2 first to generate answer keys.'
    );
  }

  const itemKeys: ItemKeysOutput = JSON.parse(fs.readFileSync(itemKeysPath, 'utf-8'));

  // Initialize aggregation storage
  const schoolData: Record<string, {
    grade5?: {
      students: Array<{ subjects: Record<string, { marks: number; total: number }> }>;
    };
    grade8?: {
      students: Array<{ subjects: Record<string, { marks: number; total: number }> }>;
    };
  }> = {};

  let grade5RowsProcessed = 0;
  let grade5RowsSkipped = 0;
  let grade8RowsProcessed = 0;
  let grade8RowsSkipped = 0;
  const skipReasons: Record<string, number> = {};

  // Process Grade 5
  console.log('Processing Grade 5 student responses...');
  const grade5Path = process.env.ANGUL_GRADE5_XLSX_PATH!;
  const grade5Workbook = XLSX.readFile(grade5Path);
  const grade5Sheet = grade5Workbook.Sheets[grade5Workbook.SheetNames[0]];
  const grade5Rows = XLSX.utils.sheet_to_json(grade5Sheet, { header: 1 }) as any[][];

  if (grade5Rows.length < 2) {
    console.warn('Grade 5 file has insufficient rows, skipping');
  } else {
    const grade5Headers = grade5Rows[0].map((h: any) => String(h || '').trim());
    const grade5ColumnMap: Record<string, string> = {};

    for (const [field, aliases] of Object.entries(STUDENT_HEADER_ALIASES)) {
      const col = findColumnName(grade5Headers, aliases);
      if (col) grade5ColumnMap[field] = col;
    }

    // Check required fields
    const requiredFields = ['grade', 'day', 'udise', 'responses'];
    const missingFields = requiredFields.filter(f => !grade5ColumnMap[f]);
    
    if (missingFields.length > 0) {
      console.warn(`Grade 5 file missing required columns: ${missingFields.join(', ')}`);
      console.warn('Available headers:', grade5Headers.join(', '));
    } else {
      for (let i = 1; i < grade5Rows.length; i++) {
        const row = grade5Rows[i];
        const rowObj: Record<string, any> = {};
        grade5Headers.forEach((header, index) => {
          rowObj[header] = row[index];
        });

        const grade = Number(rowObj[grade5ColumnMap.grade]);
        const day = Number(rowObj[grade5ColumnMap.day]);
        const udise = String(rowObj[grade5ColumnMap.udise] || '').trim();
        const responsesRaw = String(rowObj[grade5ColumnMap.responses] || '').trim();

        // Validate
        if (!udise) {
          grade5RowsSkipped++;
          skipReasons['Missing UDISE'] = (skipReasons['Missing UDISE'] || 0) + 1;
          continue;
        }

        if (day !== 1 && day !== 2) {
          grade5RowsSkipped++;
          skipReasons['Invalid Day'] = (skipReasons['Invalid Day'] || 0) + 1;
          continue;
        }

        // Split responses and filter out empty strings (handles trailing #)
        const responses = responsesRaw.split('#').filter(r => r !== '');
        const expectedLength = day === 1 ? 30 : 30;

        if (responses.length !== expectedLength) {
          grade5RowsSkipped++;
          skipReasons[`Invalid response length (expected ${expectedLength})`] = 
            (skipReasons[`Invalid response length (expected ${expectedLength})`] || 0) + 1;
          continue;
        }

        // Get keys for this day
        const keys = day === 1 ? itemKeys.grade5_day1 : itemKeys.grade5_day2;

        // Score by subject
        const subjectScores: Record<string, { correct: number; total: number }> = {};

        for (let pos = 0; pos < keys.length; pos++) {
          const key = keys[pos];
          const response = responses[pos].trim().toUpperCase();
          const subject = key.subject;

          if (!subjectScores[subject]) {
            subjectScores[subject] = { correct: 0, total: 0 };
          }

          subjectScores[subject].total++;
          if (response === key.answerKey) {
            subjectScores[subject].correct++;
          }
        }

        // Store student data
        if (!schoolData[udise]) {
          schoolData[udise] = {};
        }
        if (!schoolData[udise].grade5) {
          schoolData[udise].grade5 = { students: [] };
        }

        const studentSubjects: Record<string, { marks: number; total: number }> = {};
        for (const [subject, scores] of Object.entries(subjectScores)) {
          studentSubjects[subject] = { marks: scores.correct, total: scores.total };
        }

        schoolData[udise].grade5!.students.push({ subjects: studentSubjects });
        grade5RowsProcessed++;
      }
    }
  }

  console.log(`Grade 5: ${grade5RowsProcessed} students processed, ${grade5RowsSkipped} skipped`);

  // Process Grade 8
  console.log('\nProcessing Grade 8 student responses...');
  const grade8Path = process.env.ANGUL_GRADE8_XLSX_PATH!;
  const grade8Workbook = XLSX.readFile(grade8Path);
  const grade8Sheet = grade8Workbook.Sheets[grade8Workbook.SheetNames[0]];
  const grade8Rows = XLSX.utils.sheet_to_json(grade8Sheet, { header: 1 }) as any[][];

  if (grade8Rows.length < 2) {
    console.warn('Grade 8 file has insufficient rows, skipping');
  } else {
    const grade8Headers = grade8Rows[0].map((h: any) => String(h || '').trim());
    const grade8ColumnMap: Record<string, string> = {};

    for (const [field, aliases] of Object.entries(STUDENT_HEADER_ALIASES)) {
      const col = findColumnName(grade8Headers, aliases);
      if (col) grade8ColumnMap[field] = col;
    }

    // Check required fields
    const requiredFields = ['grade', 'day', 'udise', 'responses'];
    const missingFields = requiredFields.filter(f => !grade8ColumnMap[f]);
    
    if (missingFields.length > 0) {
      console.warn(`Grade 8 file missing required columns: ${missingFields.join(', ')}`);
      console.warn('Available headers:', grade8Headers.join(', '));
    } else {
      for (let i = 1; i < grade8Rows.length; i++) {
        const row = grade8Rows[i];
        const rowObj: Record<string, any> = {};
        grade8Headers.forEach((header, index) => {
          rowObj[header] = row[index];
        });

        const grade = Number(rowObj[grade8ColumnMap.grade]);
        const day = Number(rowObj[grade8ColumnMap.day]);
        const udise = String(rowObj[grade8ColumnMap.udise] || '').trim();
        const responsesRaw = String(rowObj[grade8ColumnMap.responses] || '').trim();

        // Validate
        if (!udise) {
          grade8RowsSkipped++;
          skipReasons['Missing UDISE'] = (skipReasons['Missing UDISE'] || 0) + 1;
          continue;
        }

        if (day !== 1 && day !== 2) {
          grade8RowsSkipped++;
          skipReasons['Invalid Day'] = (skipReasons['Invalid Day'] || 0) + 1;
          continue;
        }

        // Split responses and filter out empty strings (handles trailing #)
        const responses = responsesRaw.split('#').filter(r => r !== '');
        const expectedLength = day === 1 ? 60 : 40;

        if (responses.length !== expectedLength) {
          grade8RowsSkipped++;
          skipReasons[`Invalid response length (expected ${expectedLength})`] = 
            (skipReasons[`Invalid response length (expected ${expectedLength})`] || 0) + 1;
          continue;
        }

        // Get keys for this day
        const keys = day === 1 ? itemKeys.grade8_day1 : itemKeys.grade8_day2;

        // Score by subject
        const subjectScores: Record<string, { correct: number; total: number }> = {};

        for (let pos = 0; pos < keys.length; pos++) {
          const key = keys[pos];
          const response = responses[pos].trim().toUpperCase();
          const subject = key.subject;

          if (!subjectScores[subject]) {
            subjectScores[subject] = { correct: 0, total: 0 };
          }

          subjectScores[subject].total++;
          if (response === key.answerKey) {
            subjectScores[subject].correct++;
          }
        }

        // Store student data
        if (!schoolData[udise]) {
          schoolData[udise] = {};
        }
        if (!schoolData[udise].grade8) {
          schoolData[udise].grade8 = { students: [] };
        }

        const studentSubjects: Record<string, { marks: number; total: number }> = {};
        for (const [subject, scores] of Object.entries(subjectScores)) {
          studentSubjects[subject] = { marks: scores.correct, total: scores.total };
        }

        schoolData[udise].grade8!.students.push({ subjects: studentSubjects });
        grade8RowsProcessed++;
      }
    }
  }

  console.log(`Grade 8: ${grade8RowsProcessed} students processed, ${grade8RowsSkipped} skipped`);

  if (Object.keys(skipReasons).length > 0) {
    console.log('\nSkip reasons:');
    for (const [reason, count] of Object.entries(skipReasons)) {
      console.log(`  ${reason}: ${count}`);
    }
  }

  // Aggregate to school level
  const schoolAggregates: Record<string, SchoolAggregate> = {};
  const subjectTotalMarks: Record<number, number> = { 5: 15, 8: 20 };

  for (const [udise, data] of Object.entries(schoolData)) {
    const aggregate: SchoolAggregate = { udise };

    // Grade 5
    if (data.grade5 && data.grade5.students.length > 0) {
      const students = data.grade5.students;
      const subjectAggregates: Record<string, SubjectAggregate> = {};
      const allSubjects = new Set<string>();

      // Collect all subjects
      students.forEach(s => Object.keys(s.subjects).forEach(sub => allSubjects.add(sub)));

      // Aggregate per subject
      for (const subject of allSubjects) {
        let totalMarks = 0;
        let studentCount = 0;

        students.forEach(s => {
          if (s.subjects[subject]) {
            totalMarks += s.subjects[subject].marks;
            studentCount++;
          }
        });

        const avgMarks = totalMarks / studentCount;
        const avgPercent = (avgMarks / subjectTotalMarks[5]) * 100;

        subjectAggregates[subject] = {
          avgMarks: Math.round(avgMarks * 100) / 100,
          totalMarks: subjectTotalMarks[5],
          avgPercent: Math.round(avgPercent * 100) / 100
        };
      }

      // Overall average
      const subjectAvgs = Object.values(subjectAggregates).map(s => s.avgMarks);
      const overallAvgMarks = subjectAvgs.reduce((a, b) => a + b, 0) / subjectAvgs.length;
      const totalPossiblePerStudent = subjectAvgs.length * subjectTotalMarks[5];
      const overallPercent = (overallAvgMarks / subjectTotalMarks[5]) * 100;

      aggregate.grade5 = {
        studentCount: students.length,
        subjects: subjectAggregates,
        overallAvgMarks: Math.round(overallAvgMarks * 100) / 100,
        overallPercent: Math.round(overallPercent * 100) / 100
      };
    }

    // Grade 8
    if (data.grade8 && data.grade8.students.length > 0) {
      const students = data.grade8.students;
      const subjectAggregates: Record<string, SubjectAggregate> = {};
      const allSubjects = new Set<string>();

      // Collect all subjects
      students.forEach(s => Object.keys(s.subjects).forEach(sub => allSubjects.add(sub)));

      // Aggregate per subject
      for (const subject of allSubjects) {
        let totalMarks = 0;
        let studentCount = 0;

        students.forEach(s => {
          if (s.subjects[subject]) {
            totalMarks += s.subjects[subject].marks;
            studentCount++;
          }
        });

        const avgMarks = totalMarks / studentCount;
        const avgPercent = (avgMarks / subjectTotalMarks[8]) * 100;

        subjectAggregates[subject] = {
          avgMarks: Math.round(avgMarks * 100) / 100,
          totalMarks: subjectTotalMarks[8],
          avgPercent: Math.round(avgPercent * 100) / 100
        };
      }

      // Overall average
      const subjectAvgs = Object.values(subjectAggregates).map(s => s.avgMarks);
      const overallAvgMarks = subjectAvgs.reduce((a, b) => a + b, 0) / subjectAvgs.length;
      const overallPercent = (overallAvgMarks / subjectTotalMarks[8]) * 100;

      aggregate.grade8 = {
        studentCount: students.length,
        subjects: subjectAggregates,
        overallAvgMarks: Math.round(overallAvgMarks * 100) / 100,
        overallPercent: Math.round(overallPercent * 100) / 100
      };
    }

    schoolAggregates[udise] = aggregate;
  }

  // Count schools with data
  const schoolsWithGrade5 = Object.values(schoolAggregates).filter(s => s.grade5).length;
  const schoolsWithGrade8 = Object.values(schoolAggregates).filter(s => s.grade8).length;

  console.log(`\n✓ Schools with Grade 5 data: ${schoolsWithGrade5}`);
  console.log(`✓ Schools with Grade 8 data: ${schoolsWithGrade8}`);

  // Write output
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'schoolAggregates.json');
  fs.writeFileSync(outputPath, JSON.stringify(schoolAggregates, null, 2), 'utf-8');

  console.log(`\nOutput written to: ${outputPath}`);

  // Display sample for 2 schools
  console.log('\nSample school aggregates (first 2 schools):');
  const sampleSchools = Object.values(schoolAggregates).slice(0, 2);
  sampleSchools.forEach((school, idx) => {
    console.log(`\n${idx + 1}. UDISE: ${school.udise}`);
    if (school.grade5) {
      console.log(`   Grade 5: ${school.grade5.studentCount} students`);
      console.log(`   Overall: ${school.grade5.overallAvgMarks} marks, ${school.grade5.overallPercent}%`);
      console.log(`   Subjects:`, Object.keys(school.grade5.subjects).join(', '));
    }
    if (school.grade8) {
      console.log(`   Grade 8: ${school.grade8.studentCount} students`);
      console.log(`   Overall: ${school.grade8.overallAvgMarks} marks, ${school.grade8.overallPercent}%`);
      console.log(`   Subjects:`, Object.keys(school.grade8.subjects).join(', '));
    }
  });

  console.log('\n✅ STEP 3 COMPLETE: schoolAggregates.json generated successfully!\n');
}

/**
 * Process student responses and generate LO-wise breakdown
 */
function processLoBreakdown(): void {
  console.log('\n=== STEP 4: Processing LO-wise Breakdown ===\n');

  // Load itemKeys.json
  const itemKeysPath = path.join(__dirname, '..', 'public', 'data', 'itemKeys.json');
  if (!fs.existsSync(itemKeysPath)) {
    throw new Error(
      'itemKeys.json not found. Please run STEP 2 first to generate answer keys.'
    );
  }

  const itemKeys: ItemKeysOutput = JSON.parse(fs.readFileSync(itemKeysPath, 'utf-8'));

  // Build LO metadata from itemKeys
  // Map: grade_day_subject_loCode -> { loDescription, itemCount }
  const loMetadata: Record<string, { loDescription: string; itemCount: number }> = {};

  for (const [key, items] of Object.entries(itemKeys)) {
    const [gradeStr, dayStr] = key.split('_');
    const grade = gradeStr.replace('grade', '');
    
    for (const item of items) {
      const loKey = `${grade}_${item.subject}_${item.loCode}`;
      if (!loMetadata[loKey]) {
        loMetadata[loKey] = {
          loDescription: item.loDescription,
          itemCount: 0
        };
      }
      loMetadata[loKey].itemCount++;
    }
  }

  // Initialize LO tracking structure
  // Track: udise -> grade -> subject -> loCode -> { attempts, correct }
  const loData: Record<string, {
    grade5?: Record<string, Record<string, { attempts: number; correct: number }>>;
    grade8?: Record<string, Record<string, { attempts: number; correct: number }>>;
  }> = {};

  let grade5RowsProcessed = 0;
  let grade8RowsProcessed = 0;

  // Process Grade 5
  console.log('Processing Grade 5 student responses for LO breakdown...');
  const grade5Path = process.env.ANGUL_GRADE5_XLSX_PATH!;
  const grade5Workbook = XLSX.readFile(grade5Path);
  const grade5Sheet = grade5Workbook.Sheets[grade5Workbook.SheetNames[0]];
  const grade5Rows = XLSX.utils.sheet_to_json(grade5Sheet, { header: 1 }) as any[][];

  if (grade5Rows.length >= 2) {
    const grade5Headers = grade5Rows[0].map((h: any) => String(h || '').trim());
    const grade5ColumnMap: Record<string, string> = {};

    for (const [field, aliases] of Object.entries(STUDENT_HEADER_ALIASES)) {
      const col = findColumnName(grade5Headers, aliases);
      if (col) grade5ColumnMap[field] = col;
    }

    const requiredFields = ['day', 'udise', 'responses'];
    const hasAllFields = requiredFields.every(f => grade5ColumnMap[f]);

    if (hasAllFields) {
      for (let i = 1; i < grade5Rows.length; i++) {
        const row = grade5Rows[i];
        const rowObj: Record<string, any> = {};
        grade5Headers.forEach((header, index) => {
          rowObj[header] = row[index];
        });

        const day = Number(rowObj[grade5ColumnMap.day]);
        const udise = String(rowObj[grade5ColumnMap.udise] || '').trim();
        const responsesRaw = String(rowObj[grade5ColumnMap.responses] || '').trim();

        if (!udise || (day !== 1 && day !== 2)) continue;

        const responses = responsesRaw.split('#').filter(r => r !== '');
        const expectedLength = day === 1 ? 30 : 30;

        if (responses.length !== expectedLength) continue;

        // Get keys for this day
        const keys = day === 1 ? itemKeys.grade5_day1 : itemKeys.grade5_day2;

        // Track LO-wise performance
        for (let pos = 0; pos < keys.length; pos++) {
          const key = keys[pos];
          const response = responses[pos].trim().toUpperCase();
          const subject = key.subject;
          const loCode = key.loCode;

          // Initialize structure
          if (!loData[udise]) {
            loData[udise] = {};
          }
          if (!loData[udise].grade5) {
            loData[udise].grade5 = {};
          }
          if (!loData[udise].grade5[subject]) {
            loData[udise].grade5[subject] = {};
          }
          if (!loData[udise].grade5[subject][loCode]) {
            loData[udise].grade5[subject][loCode] = { attempts: 0, correct: 0 };
          }

          // Track attempt and correctness
          loData[udise].grade5[subject][loCode].attempts++;
          if (response === key.answerKey) {
            loData[udise].grade5[subject][loCode].correct++;
          }
        }

        grade5RowsProcessed++;
      }
    }
  }

  console.log(`Grade 5: ${grade5RowsProcessed} students processed for LO breakdown`);

  // Process Grade 8
  console.log('\nProcessing Grade 8 student responses for LO breakdown...');
  const grade8Path = process.env.ANGUL_GRADE8_XLSX_PATH!;
  const grade8Workbook = XLSX.readFile(grade8Path);
  const grade8Sheet = grade8Workbook.Sheets[grade8Workbook.SheetNames[0]];
  const grade8Rows = XLSX.utils.sheet_to_json(grade8Sheet, { header: 1 }) as any[][];

  if (grade8Rows.length >= 2) {
    const grade8Headers = grade8Rows[0].map((h: any) => String(h || '').trim());
    const grade8ColumnMap: Record<string, string> = {};

    for (const [field, aliases] of Object.entries(STUDENT_HEADER_ALIASES)) {
      const col = findColumnName(grade8Headers, aliases);
      if (col) grade8ColumnMap[field] = col;
    }

    const requiredFields = ['day', 'udise', 'responses'];
    const hasAllFields = requiredFields.every(f => grade8ColumnMap[f]);

    if (hasAllFields) {
      for (let i = 1; i < grade8Rows.length; i++) {
        const row = grade8Rows[i];
        const rowObj: Record<string, any> = {};
        grade8Headers.forEach((header, index) => {
          rowObj[header] = row[index];
        });

        const day = Number(rowObj[grade8ColumnMap.day]);
        const udise = String(rowObj[grade8ColumnMap.udise] || '').trim();
        const responsesRaw = String(rowObj[grade8ColumnMap.responses] || '').trim();

        if (!udise || (day !== 1 && day !== 2)) continue;

        const responses = responsesRaw.split('#').filter(r => r !== '');
        const expectedLength = day === 1 ? 60 : 40;

        if (responses.length !== expectedLength) continue;

        // Get keys for this day
        const keys = day === 1 ? itemKeys.grade8_day1 : itemKeys.grade8_day2;

        // Track LO-wise performance
        for (let pos = 0; pos < keys.length; pos++) {
          const key = keys[pos];
          const response = responses[pos].trim().toUpperCase();
          const subject = key.subject;
          const loCode = key.loCode;

          // Initialize structure
          if (!loData[udise]) {
            loData[udise] = {};
          }
          if (!loData[udise].grade8) {
            loData[udise].grade8 = {};
          }
          if (!loData[udise].grade8[subject]) {
            loData[udise].grade8[subject] = {};
          }
          if (!loData[udise].grade8[subject][loCode]) {
            loData[udise].grade8[subject][loCode] = { attempts: 0, correct: 0 };
          }

          // Track attempt and correctness
          loData[udise].grade8[subject][loCode].attempts++;
          if (response === key.answerKey) {
            loData[udise].grade8[subject][loCode].correct++;
          }
        }

        grade8RowsProcessed++;
      }
    }
  }

  console.log(`Grade 8: ${grade8RowsProcessed} students processed for LO breakdown`);

  // Build final output structure
  const schoolLoBreakdown: SchoolLoBreakdown = {};
  let totalLoRecords = 0;
  let zeroAttemptWarnings = 0;

  for (const [udise, gradeData] of Object.entries(loData)) {
    schoolLoBreakdown[udise] = {};

    // Process Grade 5
    if (gradeData.grade5) {
      schoolLoBreakdown[udise].grade5 = {};
      
      for (const [subject, loCodes] of Object.entries(gradeData.grade5)) {
        const loRecords: LORecord[] = [];

        for (const [loCode, stats] of Object.entries(loCodes)) {
          const loKey = `5_${subject}_${loCode}`;
          const metadata = loMetadata[loKey];

          if (!metadata) {
            console.warn(`Warning: No metadata found for ${loKey}`);
            continue;
          }

          const percent = stats.attempts > 0 
            ? Math.round((stats.correct / stats.attempts) * 1000) / 10
            : 0;

          if (stats.attempts === 0) {
            zeroAttemptWarnings++;
          }

          loRecords.push({
            loCode,
            loDescription: metadata.loDescription,
            itemCount: metadata.itemCount,
            attempts: stats.attempts,
            correct: stats.correct,
            percent
          });

          totalLoRecords++;
        }

        schoolLoBreakdown[udise].grade5![subject] = loRecords;
      }
    }

    // Process Grade 8
    if (gradeData.grade8) {
      schoolLoBreakdown[udise].grade8 = {};
      
      for (const [subject, loCodes] of Object.entries(gradeData.grade8)) {
        const loRecords: LORecord[] = [];

        for (const [loCode, stats] of Object.entries(loCodes)) {
          const loKey = `8_${subject}_${loCode}`;
          const metadata = loMetadata[loKey];

          if (!metadata) {
            console.warn(`Warning: No metadata found for ${loKey}`);
            continue;
          }

          const percent = stats.attempts > 0 
            ? Math.round((stats.correct / stats.attempts) * 1000) / 10
            : 0;

          if (stats.attempts === 0) {
            zeroAttemptWarnings++;
          }

          loRecords.push({
            loCode,
            loDescription: metadata.loDescription,
            itemCount: metadata.itemCount,
            attempts: stats.attempts,
            correct: stats.correct,
            percent
          });

          totalLoRecords++;
        }

        schoolLoBreakdown[udise].grade8![subject] = loRecords;
      }
    }
  }

  // Count schools with LO data
  const schoolsWithGrade5Lo = Object.values(schoolLoBreakdown).filter(s => s.grade5).length;
  const schoolsWithGrade8Lo = Object.values(schoolLoBreakdown).filter(s => s.grade8).length;

  console.log(`\n✓ Schools with Grade 5 LO data: ${schoolsWithGrade5Lo}`);
  console.log(`✓ Schools with Grade 8 LO data: ${schoolsWithGrade8Lo}`);
  console.log(`✓ Total LO records generated: ${totalLoRecords}`);

  if (zeroAttemptWarnings > 0) {
    console.log(`\n⚠️  Warning: ${zeroAttemptWarnings} LO records have zero attempts (should be rare)`);
  }

  // Write output
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'schoolLoBreakdown.json');
  fs.writeFileSync(outputPath, JSON.stringify(schoolLoBreakdown, null, 2), 'utf-8');

  console.log(`\nOutput written to: ${outputPath}`);

  // Display sample for one school
  console.log('\nSample LO breakdown (first school):');
  const sampleSchool = Object.entries(schoolLoBreakdown)[0];
  if (sampleSchool) {
    const [udise, data] = sampleSchool;
    console.log(`\nUDISE: ${udise}`);
    
    if (data.grade5) {
      console.log('  Grade 5:');
      const subjects = Object.keys(data.grade5);
      console.log(`    Subjects: ${subjects.join(', ')}`);
      const firstSubject = subjects[0];
      const los = data.grade5[firstSubject];
      console.log(`    ${firstSubject} - ${los.length} LOs:`);
      los.slice(0, 3).forEach(lo => {
        console.log(`      ${lo.loCode}: ${lo.percent}% (${lo.correct}/${lo.attempts} correct, ${lo.itemCount} items)`);
      });
    }
    
    if (data.grade8) {
      console.log('  Grade 8:');
      const subjects = Object.keys(data.grade8);
      console.log(`    Subjects: ${subjects.join(', ')}`);
      const firstSubject = subjects[0];
      const los = data.grade8[firstSubject];
      console.log(`    ${firstSubject} - ${los.length} LOs:`);
      los.slice(0, 3).forEach(lo => {
        console.log(`      ${lo.loCode}: ${lo.percent}% (${lo.correct}/${lo.attempts} correct, ${lo.itemCount} items)`);
      });
    }
  }

  console.log('\n✅ STEP 4 COMPLETE: schoolLoBreakdown.json generated successfully!\n');
  console.log('=== ALL PREPROCESSING STEPS COMPLETE ===\n');
}

// Run the preprocessing
try {
  processSchoolsMaster();
  processAnswerKeys();
  processStudentResponses();
  processLoBreakdown();
} catch (error) {
  console.error('\n❌ ERROR:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

