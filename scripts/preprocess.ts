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
    'ANGUL_GRADE8_XLSX_PATH',
    'ANGUL_QUESTION_LEVEL_XLSX_PATH'
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
    { name: 'Grade 8 Student Responses', path: process.env.ANGUL_GRADE8_XLSX_PATH! },
    { name: 'Question Grade Levels', path: process.env.ANGUL_QUESTION_LEVEL_XLSX_PATH! }
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

/**
 * Normalize UDISE to consistent string format
 * Critical for joining across Excel sheets with mixed types
 */
function normalizeUdise(value: unknown): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle numbers: convert to string, truncate decimals
  if (typeof value === 'number') {
    return String(Math.trunc(value));
  }
  
  // Handle strings: trim and remove trailing .0
  let str = String(value).trim();
  
  // Remove trailing .0 if present
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  
  return str;
}

// Type definitions
interface SchoolRecord {
  udise: string;
  schoolName: string;
  block: string;
  management: string;
  location: string;
  schoolCategory: string;
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
  questionLevel: 'G-1' | 'G';
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
  attempts_G_1: number;
  correct_G_1: number;
  percent_G_1: number | null;
  attempts_G: number;
  correct_G: number;
  percent_G: number | null;
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

// Data Integrity Audit Types
enum SkipReason {
  MISSING_UDISE = 'MISSING_UDISE',
  UNKNOWN_SUBJECT = 'UNKNOWN_SUBJECT',
  UNKNOWN_DAY = 'UNKNOWN_DAY',
  EMPTY_RESPONSE = 'EMPTY_RESPONSE',
  NO_VALID_ANSWERS = 'NO_VALID_ANSWERS',
  LENGTH_MISMATCH = 'LENGTH_MISMATCH',
  INVALID_TOKENS_PRESENT = 'INVALID_TOKENS_PRESENT',
  SCHOOL_NOT_IN_MASTER = 'SCHOOL_NOT_IN_MASTER',
  OTHER = 'OTHER'
}

interface AuditRow {
  grade: number;
  inferredSubject: string | null;
  inferredDay: number | null;
  udise: string;
  rawResponseLength: number;
  countValidAnswers: number;
  status: 'scored' | 'skipped';
  skipReason: SkipReason | null;
}

interface DataIntegrityReport {
  summary: {
    grade5: {
      rowsRead: number;
      rowsScored: number;
      rowsSkipped: number;
      bySubject: Record<string, { rowsScored: number; rowsSkipped: number }>;
    };
    grade8: {
      rowsRead: number;
      rowsScored: number;
      rowsSkipped: number;
      bySubject: Record<string, { rowsScored: number; rowsSkipped: number }>;
    };
  };
  skipReasonCounts: {
    overall: Record<string, number>;
    grade5: Record<string, number>;
    grade8: Record<string, number>;
  };
  sampleSkippedRows: AuditRow[];
  responseExistsButNoAggregate: Array<{
    udise: string;
    block: string;
    schoolName: string;
    subject: string;
    grade: number;
    validCount: number;
    reason: string;
  }>;
}

// Header alias mapping for schools
const SCHOOL_HEADER_ALIASES: Record<string, string[]> = {
  udise: ["UDISE", "UDISE Code", "UDISE_CODE", "Udise", "Udise Code", "Udise_Code"],
  block: ["Block", "Block Name", "BLOCK", "Block_Name"],
  schoolName: ["School Name", "Name of School", "School", "SCHOOL NAME", "School_Name"],
  management: ["Management", "Management Type", "School Management", "mgmt"],
  location: ["Location", "School Location", "Rural/Urban", "Area", "School_Location"],
  schoolCategory: ["School Category", "School_Category", "Category", "SCHOOL CATEGORY", "Type"]
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
    const schoolCategoryRaw = rowObj[columnMap.schoolCategory];

    // Convert and clean - CRITICAL: Normalize UDISE for consistent joining
    const udise = normalizeUdise(udiseRaw);
    const schoolName = String(schoolNameRaw || '').trim();
    const block = String(blockRaw || '').trim();
    const management = String(managementRaw || '').trim();
    const location = String(locationRaw || '').trim();
    
    // Normalize school category: trim, collapse multiple spaces, default to "Unknown" if blank
    let schoolCategory = String(schoolCategoryRaw || '').trim();
    schoolCategory = schoolCategory.replace(/\s+/g, ' '); // Normalize multiple spaces to single space
    if (!schoolCategory) {
      schoolCategory = 'Unknown';
    }

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
      location,
      schoolCategory
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
    console.log(`   Category: ${school.schoolCategory}`);
  });

  console.log('\n=== STEP 1 COMPLETE ===\n');
}

/**
 * Process question grade levels from the new Excel file
 * Returns a lookup map: Grade|Day|Subject|QuestionNumber -> "G-1" or "G"
 */
function processQuestionGradeLevels(): Record<string, 'G-1' | 'G'> {
  console.log('\n=== STEP 1.5: Processing Question Grade Levels ===\n');

  const questionLevelPath = process.env.ANGUL_QUESTION_LEVEL_XLSX_PATH;
  if (!questionLevelPath) {
    throw new Error('ANGUL_QUESTION_LEVEL_XLSX_PATH not set in .env file.');
  }

  if (!fs.existsSync(questionLevelPath)) {
    throw new Error(`Question Grade Level Excel file not found at path: ${questionLevelPath}`);
  }

  console.log(`Reading Excel file from: ${questionLevelPath}`);

  // Read Excel file
  const workbook = XLSX.readFile(questionLevelPath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  console.log(`Reading sheet: ${firstSheetName}`);

  // Convert sheet to JSON
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  console.log(`Raw rows read from Excel: ${rawRows.length}`);

  if (rawRows.length < 2) {
    throw new Error('Question Grade Level Excel file must have at least 2 rows (header + data)');
  }

  // Row 1 is the header
  const headerRow = rawRows[0];
  const headers = headerRow.map((h: any) => String(h || '').trim());

  console.log(`Headers found: ${headers.join(', ')}`);

  // Map subjects to days (same as in processAnswerKeys)
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

  // Find required columns
  const gradeCol = findColumnName(headers, KEY_HEADER_ALIASES.grade);
  const subjectCol = findColumnName(headers, KEY_HEADER_ALIASES.subject);
  const questionNumberCol = findColumnName(headers, KEY_HEADER_ALIASES.questionNumber);
  const questionGradeLevelCol = findColumnName(headers, ['Question Grade level', 'Question Grade Level', 'Grade Level', 'QuestionGradeLevel']);

  if (!gradeCol || !subjectCol || !questionNumberCol || !questionGradeLevelCol) {
    throw new Error(
      `Required columns not found in Question Grade Level Excel.\n` +
      `Available headers: ${headers.join(', ')}\n` +
      `Looking for: Grade, Subject, Question Number, Question Grade level`
    );
  }

  console.log('\nColumn mapping successful:');
  console.log(`  grade → "${gradeCol}"`);
  console.log(`  subject → "${subjectCol}"`);
  console.log(`  questionNumber → "${questionNumberCol}"`);
  console.log(`  questionGradeLevel → "${questionGradeLevelCol}"`);

  // Build lookup map
  const questionLevelLookup: Record<string, 'G-1' | 'G'> = {};
  let processedCount = 0;
  let skippedCount = 0;
  let warningCount = 0;

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    
    // Create object from row using headers
    const rowObj: Record<string, any> = {};
    headers.forEach((header, index) => {
      rowObj[header] = row[index];
    });

    // Extract fields
    const gradeRaw = rowObj[gradeCol];
    const subjectRaw = rowObj[subjectCol];
    const questionNumberRaw = rowObj[questionNumberCol];
    const questionGradeLevelRaw = rowObj[questionGradeLevelCol];

    // Convert and clean
    const grade = Number(gradeRaw);
    const subject = String(subjectRaw || '').trim();
    const questionNumber = Number(questionNumberRaw);
    const questionGradeLevel = String(questionGradeLevelRaw || '').trim().toUpperCase();

    // Derive day from grade and subject
    const day = subjectToDayMap[String(grade)]?.[subject];

    // Skip invalid rows
    if (isNaN(grade) || !day || isNaN(questionNumber) || !subject) {
      skippedCount++;
      continue;
    }

    // Map grade level to G-1 or G
    let mappedLevel: 'G-1' | 'G';

    if (grade === 5) {
      if (questionGradeLevel === 'G4') {
        mappedLevel = 'G-1';
      } else if (questionGradeLevel === 'G5') {
        mappedLevel = 'G';
      } else {
        // Default to G and warn
        mappedLevel = 'G';
        if (questionGradeLevel) {
          console.warn(`Warning: Unexpected grade level "${questionGradeLevel}" for Grade ${grade}, Subject ${subject}, Q${questionNumber} (row ${i + 1}). Defaulting to "G".`);
          warningCount++;
        }
      }
    } else if (grade === 8) {
      if (questionGradeLevel === 'G7') {
        mappedLevel = 'G-1';
      } else if (questionGradeLevel === 'G8') {
        mappedLevel = 'G';
      } else {
        // Default to G and warn
        mappedLevel = 'G';
        if (questionGradeLevel) {
          console.warn(`Warning: Unexpected grade level "${questionGradeLevel}" for Grade ${grade}, Subject ${subject}, Q${questionNumber} (row ${i + 1}). Defaulting to "G".`);
          warningCount++;
        }
      }
    } else {
      skippedCount++;
      continue;
    }

    // Build key: Grade|Day|Subject|QuestionNumber
    const key = `${grade}|${day}|${subject}|${questionNumber}`;
    questionLevelLookup[key] = mappedLevel;
    processedCount++;
  }

  console.log(`\nProcessing complete:`);
  console.log(`  Valid question levels: ${processedCount}`);
  console.log(`  Skipped rows: ${skippedCount}`);
  if (warningCount > 0) {
    console.log(`  ⚠️  Warnings: ${warningCount} unexpected values (defaulted to "G")`);
  }

  console.log('\n=== STEP 1.5 COMPLETE ===\n');

  return questionLevelLookup;
}

/**
 * Read answer keys Excel and generate itemKeys.json
 */
function processAnswerKeys(questionLevelLookup: Record<string, 'G-1' | 'G'>): void {
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
    let loCode = String(loCodeRaw || '').trim();
    let loDescription = String(loDescriptionRaw || '').trim();
    const questionNumber = Number(questionNumberRaw);
    const answerKey = String(answerKeyRaw || '').trim().toUpperCase();

    // FIX: Map blank Grade 5 Odia LO to OD 407
    if (grade === 5 && subject === 'Odia' && (!loCode || !loDescription)) {
      loCode = 'OD 407';
      loDescription = 'Read other materials alongside your textbook (such as children literature, main news articles, magazines, posters, etc.) and gain an understanding of them.';
      console.log(`  Mapped blank Grade 5 Odia LO to OD 407 at row ${i + 1}`);
    }

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

    // Lookup question level
    const lookupKey = `${grade}|${day}|${subject}|${questionNumber}`;
    const questionLevel = questionLevelLookup[lookupKey] || 'G';
    
    if (!questionLevelLookup[lookupKey]) {
      console.warn(`Warning: No question level found for Grade ${grade}, Day ${day}, Subject ${subject}, Q${questionNumber}. Defaulting to "G".`);
    }

    allItems.push({
      grade,
      day,
      subject,
      loCode,
      loDescription,
      questionNumber,
      answerKey,
      position: 0,  // Will be assigned later
      questionLevel
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

  // Validate that all items have questionLevel
  let totalItems = 0;
  let itemsWithoutLevel = 0;
  for (const [key, items] of Object.entries(itemKeys)) {
    items.forEach(item => {
      totalItems++;
      if (!item.questionLevel) {
        itemsWithoutLevel++;
        console.error(`Error: Item missing questionLevel - Grade ${item.grade}, Day ${item.day}, ${item.subject}, Q${item.questionNumber}`);
      }
    });
  }

  if (itemsWithoutLevel > 0) {
    throw new Error(
      `${itemsWithoutLevel} out of ${totalItems} items are missing questionLevel field.\n` +
      `All items must have questionLevel ("G-1" or "G") assigned.`
    );
  }

  console.log(`\n✓ All ${totalItems} items have questionLevel field assigned`);

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
 * Parse and normalize response string, preserving question positions
 * Invalid tokens (x, *, blank, etc.) are converted to empty string placeholders
 */
function parseResponseTokens(responsesRaw: string): string[] {
  // Split by delimiter
  let tokens = responsesRaw.split('#');
  
  // Remove only trailing empty strings (from the end)
  while (tokens.length > 0 && tokens[tokens.length - 1].trim() === '') {
    tokens.pop();
  }
  
  // Normalize each token: A, B, C, D uppercase, everything else becomes empty string
  const normalized = tokens.map(token => {
    const trimmed = token.trim().toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(trimmed)) {
      return trimmed;
    }
    // Invalid token (x, *, blank, etc.) - keep position but mark as no valid response
    return '';
  });
  
  return normalized;
}

/**
 * Process student response files and generate schoolAggregates.json
 */
function processStudentResponses(): { auditRows: AuditRow[] } {
  console.log('\n=== STEP 3: Processing Student Responses ===\n');

  // Initialize audit collection
  const auditRows: AuditRow[] = [];
  
  // Track length warnings to avoid spam
  const lengthWarnings = new Set<string>();

  // Load itemKeys.json
  const itemKeysPath = path.join(__dirname, '..', 'public', 'data', 'itemKeys.json');
  if (!fs.existsSync(itemKeysPath)) {
    throw new Error(
      'itemKeys.json not found. Please run STEP 2 first to generate answer keys.'
    );
  }

  const itemKeys: ItemKeysOutput = JSON.parse(fs.readFileSync(itemKeysPath, 'utf-8'));

  // Map subjects to their days for tracking
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

  // Initialize aggregation storage
  const schoolData: Record<string, {
    grade5?: {
      students: Array<{ subjects: Record<string, { marks: number; total: number }>; day: number }>;
      day1Count: number;
      day2Count: number;
    };
    grade8?: {
      students: Array<{ subjects: Record<string, { marks: number; total: number }>; day: number }>;
      day1Count: number;
      day2Count: number;
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
        const udise = normalizeUdise(rowObj[grade5ColumnMap.udise]);
        const responsesRaw = String(rowObj[grade5ColumnMap.responses] || '').trim();

        // Parse responses preserving positions, normalizing invalid tokens
        const responses = parseResponseTokens(responsesRaw);
        const validAnswers = responses.filter(r => r !== '').length;

        // Validate
        if (!udise) {
          grade5RowsSkipped++;
          skipReasons['Missing UDISE'] = (skipReasons['Missing UDISE'] || 0) + 1;
          auditRows.push({
            grade: 5,
            inferredSubject: null,
            inferredDay: day || null,
            udise: udise || '(empty)',
            rawResponseLength: responses.length,
            countValidAnswers: validAnswers,
            status: 'skipped',
            skipReason: SkipReason.MISSING_UDISE
          });
          continue;
        }

        if (day !== 1 && day !== 2) {
          grade5RowsSkipped++;
          skipReasons['Invalid Day'] = (skipReasons['Invalid Day'] || 0) + 1;
          auditRows.push({
            grade: 5,
            inferredSubject: null,
            inferredDay: day || null,
            udise,
            rawResponseLength: responses.length,
            countValidAnswers: validAnswers,
            status: 'skipped',
            skipReason: SkipReason.UNKNOWN_DAY
          });
          continue;
        }

        const expectedLength = day === 1 ? 30 : 30;

        if (responses.length !== expectedLength) {
          grade5RowsSkipped++;
          skipReasons[`Invalid response length (expected ${expectedLength})`] = 
            (skipReasons[`Invalid response length (expected ${expectedLength})`] || 0) + 1;
          
          // Log warning once per unique case to avoid spam
          const warningKey = `G5_${udise}_${responses.length}`;
          if (!lengthWarnings.has(warningKey)) {
            console.warn(`  ⚠️  Grade 5 length mismatch: UDISE ${udise}, found ${responses.length} tokens, expected ${expectedLength}`);
            lengthWarnings.add(warningKey);
          }
          
          auditRows.push({
            grade: 5,
            inferredSubject: day === 1 ? 'Odia/EVS' : 'English/Mathematics',
            inferredDay: day,
            udise,
            rawResponseLength: responses.length,
            countValidAnswers: validAnswers,
            status: 'skipped',
            skipReason: SkipReason.LENGTH_MISMATCH
          });
          continue;
        }

        // Get keys for this day
        const keys = day === 1 ? itemKeys.grade5_day1 : itemKeys.grade5_day2;

        // Score by subject
        const subjectScores: Record<string, { correct: number; total: number }> = {};

        for (let pos = 0; pos < keys.length; pos++) {
          const key = keys[pos];
          const response = responses[pos]; // Already normalized to uppercase or empty string
          const subject = key.subject;

          if (!subjectScores[subject]) {
            subjectScores[subject] = { correct: 0, total: 0 };
          }

          // Count all positions (including invalid tokens) as attempts
          subjectScores[subject].total++;
          
          // Only count as correct if response is valid and matches answer key
          if (response !== '' && response === key.answerKey) {
            subjectScores[subject].correct++;
          }
        }

        // Store student data
        if (!schoolData[udise]) {
          schoolData[udise] = {};
        }
        if (!schoolData[udise].grade5) {
          schoolData[udise].grade5 = { students: [], day1Count: 0, day2Count: 0 };
        }

        const studentSubjects: Record<string, { marks: number; total: number }> = {};
        for (const [subject, scores] of Object.entries(subjectScores)) {
          studentSubjects[subject] = { marks: scores.correct, total: scores.total };
        }

        schoolData[udise].grade5!.students.push({ subjects: studentSubjects, day });
        
        // Track day-wise counts
        if (day === 1) {
          schoolData[udise].grade5!.day1Count++;
        } else if (day === 2) {
          schoolData[udise].grade5!.day2Count++;
        }
        
        // Audit: successful row
        auditRows.push({
          grade: 5,
          inferredSubject: Object.keys(subjectScores).join('/'),
          inferredDay: day,
          udise,
          rawResponseLength: responses.length,
          countValidAnswers: validAnswers,
          status: 'scored',
          skipReason: null
        });
        
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
        const udise = normalizeUdise(rowObj[grade8ColumnMap.udise]);
        const responsesRaw = String(rowObj[grade8ColumnMap.responses] || '').trim();

        // Parse responses preserving positions, normalizing invalid tokens
        const responses = parseResponseTokens(responsesRaw);
        const validAnswers = responses.filter(r => r !== '').length;

        // Validate
        if (!udise) {
          grade8RowsSkipped++;
          skipReasons['Missing UDISE'] = (skipReasons['Missing UDISE'] || 0) + 1;
          auditRows.push({
            grade: 8,
            inferredSubject: null,
            inferredDay: day || null,
            udise: udise || '(empty)',
            rawResponseLength: responses.length,
            countValidAnswers: validAnswers,
            status: 'skipped',
            skipReason: SkipReason.MISSING_UDISE
          });
          continue;
        }

        if (day !== 1 && day !== 2) {
          grade8RowsSkipped++;
          skipReasons['Invalid Day'] = (skipReasons['Invalid Day'] || 0) + 1;
          auditRows.push({
            grade: 8,
            inferredSubject: null,
            inferredDay: day || null,
            udise,
            rawResponseLength: responses.length,
            countValidAnswers: validAnswers,
            status: 'skipped',
            skipReason: SkipReason.UNKNOWN_DAY
          });
          continue;
        }

        const expectedLength = day === 1 ? 60 : 40;

        if (responses.length !== expectedLength) {
          grade8RowsSkipped++;
          skipReasons[`Invalid response length (expected ${expectedLength})`] = 
            (skipReasons[`Invalid response length (expected ${expectedLength})`] || 0) + 1;
          
          // Log warning once per unique case to avoid spam
          const warningKey = `G8_${udise}_${responses.length}`;
          if (!lengthWarnings.has(warningKey)) {
            console.warn(`  ⚠️  Grade 8 length mismatch: UDISE ${udise}, found ${responses.length} tokens, expected ${expectedLength}`);
            lengthWarnings.add(warningKey);
          }
          
          auditRows.push({
            grade: 8,
            inferredSubject: day === 1 ? 'Odia/English/Science' : 'Mathematics/Social Science',
            inferredDay: day,
            udise,
            rawResponseLength: responses.length,
            countValidAnswers: validAnswers,
            status: 'skipped',
            skipReason: SkipReason.LENGTH_MISMATCH
          });
          continue;
        }

        // Get keys for this day
        const keys = day === 1 ? itemKeys.grade8_day1 : itemKeys.grade8_day2;

        // Score by subject
        const subjectScores: Record<string, { correct: number; total: number }> = {};

        for (let pos = 0; pos < keys.length; pos++) {
          const key = keys[pos];
          const response = responses[pos]; // Already normalized to uppercase or empty string
          const subject = key.subject;

          if (!subjectScores[subject]) {
            subjectScores[subject] = { correct: 0, total: 0 };
          }

          // Count all positions (including invalid tokens) as attempts
          subjectScores[subject].total++;
          
          // Only count as correct if response is valid and matches answer key
          if (response !== '' && response === key.answerKey) {
            subjectScores[subject].correct++;
          }
        }

        // Store student data
        if (!schoolData[udise]) {
          schoolData[udise] = {};
        }
        if (!schoolData[udise].grade8) {
          schoolData[udise].grade8 = { students: [], day1Count: 0, day2Count: 0 };
        }

        const studentSubjects: Record<string, { marks: number; total: number }> = {};
        for (const [subject, scores] of Object.entries(subjectScores)) {
          studentSubjects[subject] = { marks: scores.correct, total: scores.total };
        }

        schoolData[udise].grade8!.students.push({ subjects: studentSubjects, day });
        
        // Track day-wise counts
        if (day === 1) {
          schoolData[udise].grade8!.day1Count++;
        } else if (day === 2) {
          schoolData[udise].grade8!.day2Count++;
        }
        
        // Audit: successful row
        auditRows.push({
          grade: 8,
          inferredSubject: Object.keys(subjectScores).join('/'),
          inferredDay: day,
          udise,
          rawResponseLength: responses.length,
          countValidAnswers: validAnswers,
          status: 'scored',
          skipReason: null
        });
        
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
          avgPercent: Math.round(avgPercent * 100) / 100,
          studentCount: studentCount
        };
      }

      // Overall average
      const subjectAvgs = Object.values(subjectAggregates).map(s => s.avgMarks);
      const overallAvgMarks = subjectAvgs.reduce((a, b) => a + b, 0) / subjectAvgs.length;
      const totalPossiblePerStudent = subjectAvgs.length * subjectTotalMarks[5];
      const overallPercent = (overallAvgMarks / subjectTotalMarks[5]) * 100;

      // Calculate unique student count (max of day1 and day2)
      const uniqueStudentCount = Math.max(data.grade5.day1Count, data.grade5.day2Count);

      aggregate.grade5 = {
        studentCount: students.length,
        day1StudentCount: data.grade5.day1Count,
        day2StudentCount: data.grade5.day2Count,
        uniqueStudentCount: uniqueStudentCount,
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
          avgPercent: Math.round(avgPercent * 100) / 100,
          studentCount: studentCount
        };
      }

      // Overall average
      const subjectAvgs = Object.values(subjectAggregates).map(s => s.avgMarks);
      const overallAvgMarks = subjectAvgs.reduce((a, b) => a + b, 0) / subjectAvgs.length;
      const overallPercent = (overallAvgMarks / subjectTotalMarks[8]) * 100;

      // Calculate unique student count (max of day1 and day2)
      const uniqueStudentCount = Math.max(data.grade8.day1Count, data.grade8.day2Count);

      aggregate.grade8 = {
        studentCount: students.length,
        day1StudentCount: data.grade8.day1Count,
        day2StudentCount: data.grade8.day2Count,
        uniqueStudentCount: uniqueStudentCount,
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

  // Sanity check: Load schools master and verify UDISE consistency
  const schoolsJsonPath = path.join(__dirname, '..', 'public', 'data', 'schools.json');
  const schoolsMaster: SchoolRecord[] = JSON.parse(fs.readFileSync(schoolsJsonPath, 'utf-8'));
  const schoolUdiseSet = new Set(schoolsMaster.map(s => s.udise));
  
  let missingInMaster = 0;
  for (const [udise, agg] of Object.entries(schoolAggregates)) {
    // Verify aggregate UDISE is a string
    if (typeof agg.udise !== 'string') {
      console.warn(`  ⚠️  Aggregate UDISE ${udise} is not a string: ${typeof agg.udise}`);
    }
    // Check if in school master
    if (!schoolUdiseSet.has(udise)) {
      missingInMaster++;
    }
  }
  
  console.log(`\nUDISE check: ${Object.keys(schoolAggregates).length} aggregates, ${missingInMaster} missing in school master`);

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
  
  return { auditRows };
}

/**
 * Generate data integrity audit report
 */
function generateDataIntegrityReport(auditRows: AuditRow[]): void {
  console.log('\n=== STEP 3.5: Generating Data Integrity Report ===\n');

  // Load schools and aggregates for cross-checking
  const schoolsPath = path.join(__dirname, '..', 'public', 'data', 'schools.json');
  const aggregatesPath = path.join(__dirname, '..', 'public', 'data', 'schoolAggregates.json');
  
  const schools: SchoolRecord[] = JSON.parse(fs.readFileSync(schoolsPath, 'utf-8'));
  const aggregates: Record<string, SchoolAggregate> = JSON.parse(fs.readFileSync(aggregatesPath, 'utf-8'));
  
  // Create a map for quick school lookup
  const schoolsMap = new Map<string, SchoolRecord>();
  schools.forEach(school => schoolsMap.set(school.udise, school));

  // Initialize report structure
  const report: DataIntegrityReport = {
    summary: {
      grade5: {
        rowsRead: 0,
        rowsScored: 0,
        rowsSkipped: 0,
        bySubject: {}
      },
      grade8: {
        rowsRead: 0,
        rowsScored: 0,
        rowsSkipped: 0,
        bySubject: {}
      }
    },
    skipReasonCounts: {
      overall: {},
      grade5: {},
      grade8: {}
    },
    sampleSkippedRows: [],
    responseExistsButNoAggregate: []
  };

  // Process audit rows
  const skippedRows: AuditRow[] = [];
  
  for (const row of auditRows) {
    const gradeSummary = row.grade === 5 ? report.summary.grade5 : report.summary.grade8;
    const gradeSkipReasons = row.grade === 5 ? report.skipReasonCounts.grade5 : report.skipReasonCounts.grade8;
    
    gradeSummary.rowsRead++;
    
    if (row.status === 'scored') {
      gradeSummary.rowsScored++;
      
      // Track by subject
      if (row.inferredSubject) {
        const subjects = row.inferredSubject.split('/');
        subjects.forEach(subject => {
          if (!gradeSummary.bySubject[subject]) {
            gradeSummary.bySubject[subject] = { rowsScored: 0, rowsSkipped: 0 };
          }
          gradeSummary.bySubject[subject].rowsScored++;
        });
      }
    } else {
      gradeSummary.rowsSkipped++;
      skippedRows.push(row);
      
      if (row.skipReason) {
        const reason = row.skipReason;
        report.skipReasonCounts.overall[reason] = (report.skipReasonCounts.overall[reason] || 0) + 1;
        gradeSkipReasons[reason] = (gradeSkipReasons[reason] || 0) + 1;
      }
      
      // Track by subject
      if (row.inferredSubject) {
        const subjects = row.inferredSubject.split('/');
        subjects.forEach(subject => {
          if (!gradeSummary.bySubject[subject]) {
            gradeSummary.bySubject[subject] = { rowsScored: 0, rowsSkipped: 0 };
          }
          gradeSummary.bySubject[subject].rowsSkipped++;
        });
      }
    }
  }

  // Sample skipped rows (top 50)
  report.sampleSkippedRows = skippedRows.slice(0, 50);

  // Find cases where response exists but no aggregate
  console.log('Analyzing response exists but no aggregate cases...');
  
  const responseExistsMap = new Map<string, { udise: string; grade: number; subjects: Set<string>; validCount: number }>();
  
  // Build map of UDISEs with valid responses
  for (const row of auditRows) {
    if (row.status === 'scored' && row.countValidAnswers > 0) {
      const key = `${row.udise}-${row.grade}`;
      if (!responseExistsMap.has(key)) {
        responseExistsMap.set(key, {
          udise: row.udise,
          grade: row.grade,
          subjects: new Set(),
          validCount: row.countValidAnswers
        });
      }
      if (row.inferredSubject) {
        row.inferredSubject.split('/').forEach(s => responseExistsMap.get(key)!.subjects.add(s));
      }
    }
  }

  // Check against aggregates
  const grade5Subjects = ['Odia', 'English', 'Mathematics', 'EVS'];
  const grade8Subjects = ['Odia', 'English', 'Mathematics', 'Science', 'Social Science'];
  
  for (const [key, data] of responseExistsMap.entries()) {
    const aggregate = aggregates[data.udise];
    const school = schoolsMap.get(data.udise);
    
    if (!aggregate) {
      // No aggregate at all for this UDISE
      report.responseExistsButNoAggregate.push({
        udise: data.udise,
        block: school?.block || 'Unknown',
        schoolName: school?.schoolName || 'Unknown',
        subject: Array.from(data.subjects).join('/'),
        grade: data.grade,
        validCount: data.validCount,
        reason: 'UDISE has responses but no aggregate entry'
      });
      continue;
    }
    
    // Check if specific grade is missing
    const gradeData = data.grade === 5 ? aggregate.grade5 : aggregate.grade8;
    if (!gradeData) {
      report.responseExistsButNoAggregate.push({
        udise: data.udise,
        block: school?.block || 'Unknown',
        schoolName: school?.schoolName || 'Unknown',
        subject: Array.from(data.subjects).join('/'),
        grade: data.grade,
        validCount: data.validCount,
        reason: `Grade ${data.grade} responses exist but no grade${data.grade} aggregate`
      });
      continue;
    }
    
    // Check specific subjects
    const expectedSubjects = data.grade === 5 ? grade5Subjects : grade8Subjects;
    for (const subject of expectedSubjects) {
      if (data.subjects.has(subject) && !gradeData.subjects[subject]) {
        report.responseExistsButNoAggregate.push({
          udise: data.udise,
          block: school?.block || 'Unknown',
          schoolName: school?.schoolName || 'Unknown',
          subject: subject,
          grade: data.grade,
          validCount: data.validCount,
          reason: `${subject} responses exist but no subject aggregate`
        });
      }
    }
  }

  // Limit to 50 examples
  report.responseExistsButNoAggregate = report.responseExistsButNoAggregate.slice(0, 50);

  // Write report
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  const outputPath = path.join(outputDir, 'dataIntegrityReport.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`Output written to: ${outputPath}`);
  console.log(`\nSummary:`);
  console.log(`  Grade 5: ${report.summary.grade5.rowsRead} rows read, ${report.summary.grade5.rowsScored} scored, ${report.summary.grade5.rowsSkipped} skipped`);
  console.log(`  Grade 8: ${report.summary.grade8.rowsRead} rows read, ${report.summary.grade8.rowsScored} scored, ${report.summary.grade8.rowsSkipped} skipped`);
  console.log(`  Response exists but no aggregate: ${report.responseExistsButNoAggregate.length} cases found`);
  console.log('\n✅ STEP 3.5 COMPLETE: Data integrity report generated!\n');
}

/**
 * Generate UDISE debug report for specific target UDISEs
 */
function generateUdiseDebug(): void {
  console.log('\n=== STEP 3.5b: Generating UDISE Debug Report ===\n');

  // Target UDISEs to debug
  const targetUdises = [
    '21150819202', '21150819101', '21150801401', '21150722601', '21150115001',
    '21150107802', '21150100402', '21150717501', '21150712001', '21150617501'
  ];

  // Load required data
  const schoolsPath = path.join(__dirname, '..', 'public', 'data', 'schools.json');
  const aggregatesPath = path.join(__dirname, '..', 'public', 'data', 'schoolAggregates.json');
  
  const schools: SchoolRecord[] = JSON.parse(fs.readFileSync(schoolsPath, 'utf-8'));
  const aggregates: Record<string, SchoolAggregate> = JSON.parse(fs.readFileSync(aggregatesPath, 'utf-8'));
  
  // Create school lookup
  const schoolsMap = new Map<string, SchoolRecord>();
  schools.forEach(school => schoolsMap.set(school.udise, school));

  // Track raw UDISE types from Excel sheets
  const udiseTypesG5 = new Map<string, string>();
  const udiseTypesG8 = new Map<string, string>();

  // Scan Grade 5 sheet for raw UDISE types
  const grade5Path = process.env.ANGUL_GRADE5_XLSX_PATH!;
  if (fs.existsSync(grade5Path)) {
    const workbook = XLSX.readFile(grade5Path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (rows.length >= 2) {
      const headers = rows[0].map((h: any) => String(h || '').trim());
      const columnMap: Record<string, string> = {};
      
      for (const [field, aliases] of Object.entries(STUDENT_HEADER_ALIASES)) {
        const col = findColumnName(headers, aliases);
        if (col) columnMap[field] = col;
      }

      if (columnMap.udise) {
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rowObj: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowObj[header] = row[index];
          });
          
          const rawUdise = rowObj[columnMap.udise];
          const normalizedUdise = normalizeUdise(rawUdise);
          if (targetUdises.includes(normalizedUdise)) {
            udiseTypesG5.set(normalizedUdise, typeof rawUdise);
            break; // Found one instance, that's enough
          }
        }
      }
    }
  }

  // Scan Grade 8 sheet for raw UDISE types
  const grade8Path = process.env.ANGUL_GRADE8_XLSX_PATH!;
  if (fs.existsSync(grade8Path)) {
    const workbook = XLSX.readFile(grade8Path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (rows.length >= 2) {
      const headers = rows[0].map((h: any) => String(h || '').trim());
      const columnMap: Record<string, string> = {};
      
      for (const [field, aliases] of Object.entries(STUDENT_HEADER_ALIASES)) {
        const col = findColumnName(headers, aliases);
        if (col) columnMap[field] = col;
      }

      if (columnMap.udise) {
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rowObj: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowObj[header] = row[index];
          });
          
          const rawUdise = rowObj[columnMap.udise];
          const normalizedUdise = normalizeUdise(rawUdise);
          if (targetUdises.includes(normalizedUdise)) {
            udiseTypesG8.set(normalizedUdise, typeof rawUdise);
            break; // Found one instance, that's enough
          }
        }
      }
    }
  }

  // Build debug report
  const debugReport: any[] = [];

  for (const udise of targetUdises) {
    const debugEntry: any = {
      udise,
      existsInSchoolsMaster: schoolsMap.has(udise),
      rawTypeInG5Sheet: udiseTypesG5.get(udise) || 'not found',
      rawTypeInG8Sheet: udiseTypesG8.get(udise) || 'not found',
      grade5: {
        subjects: {},
        totalStudentCount: 0
      },
      grade8: {
        subjects: {},
        totalStudentCount: 0
      }
    };

    const aggregate = aggregates[udise];
    if (aggregate) {
      if (aggregate.grade5) {
        debugEntry.grade5.totalStudentCount = aggregate.grade5.studentCount;
        for (const [subject, data] of Object.entries(aggregate.grade5.subjects)) {
          debugEntry.grade5.subjects[subject] = {
            studentCount: data.studentCount,
            avgPercent: data.avgPercent
          };
        }
      }
      if (aggregate.grade8) {
        debugEntry.grade8.totalStudentCount = aggregate.grade8.studentCount;
        for (const [subject, data] of Object.entries(aggregate.grade8.subjects)) {
          debugEntry.grade8.subjects[subject] = {
            studentCount: data.studentCount,
            avgPercent: data.avgPercent
          };
        }
      }
    }

    debugReport.push(debugEntry);
  }

  // Write debug output
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  const outputPath = path.join(outputDir, 'udiseDebug.json');
  fs.writeFileSync(outputPath, JSON.stringify(debugReport, null, 2), 'utf-8');

  console.log(`Output written to: ${outputPath}`);
  console.log(`Debug generated for ${targetUdises.length} UDISEs`);
  
  const withAggregates = debugReport.filter(d => 
    Object.keys(d.grade5.subjects).length > 0 || Object.keys(d.grade8.subjects).length > 0
  ).length;
  console.log(`  UDISEs with aggregate data: ${withAggregates}`);
  
  console.log('\n✅ STEP 3.5b COMPLETE: UDISE debug report generated!\n');
}

/**
 * Generate UDISE-specific diagnostics for debugging "No data" issues
 */
function generateUdiseDiagnostics(): void {
  console.log('\n=== STEP 3.6: Generating UDISE Diagnostics ===\n');

  // UDISEs to diagnose
  const targetUdises = [
    '21150819202',
    '21150819101',
    '21150801401',
    '21150722601',
    '21150115001',
    '21150107802',
    '21150100402',
    '21150717501'
  ];

  // Load required data
  const schoolsPath = path.join(__dirname, '..', 'public', 'data', 'schools.json');
  const aggregatesPath = path.join(__dirname, '..', 'public', 'data', 'schoolAggregates.json');
  const itemKeysPath = path.join(__dirname, '..', 'public', 'data', 'itemKeys.json');
  
  const schools: SchoolRecord[] = JSON.parse(fs.readFileSync(schoolsPath, 'utf-8'));
  const aggregates: Record<string, SchoolAggregate> = JSON.parse(fs.readFileSync(aggregatesPath, 'utf-8'));
  const itemKeys: ItemKeysOutput = JSON.parse(fs.readFileSync(itemKeysPath, 'utf-8'));
  
  // Create school lookup map
  const schoolsMap = new Map<string, SchoolRecord>();
  schools.forEach(school => schoolsMap.set(school.udise.trim(), school));

  // Expected subjects
  const grade5Subjects = ['Odia', 'English', 'Mathematics', 'EVS'];
  const grade8Subjects = ['Odia', 'English', 'Mathematics', 'Science', 'Social Science'];

  // Process each target UDISE
  const diagnostics: any[] = [];

  for (const targetUdise of targetUdises) {
    console.log(`Diagnosing UDISE: ${targetUdise}`);
    
    const diag: any = {
      udise: targetUdise,
      inSchoolsJson: schoolsMap.has(targetUdise),
      schoolMeta: null,
      grade5: {
        rawRowsFound: 0,
        inferredBreakdown: {},
        aggregatesPresent: {}
      },
      grade8: {
        rawRowsFound: 0,
        inferredBreakdown: {},
        aggregatesPresent: {}
      },
      notes: []
    };

    // Get school metadata
    if (schoolsMap.has(targetUdise)) {
      const school = schoolsMap.get(targetUdise)!;
      diag.schoolMeta = {
        name: school.schoolName,
        block: school.block,
        management: school.management,
        location: school.location,
        category: school.schoolCategory
      };
    } else {
      diag.notes.push('UDISE not found in schools.json');
    }

    // Check aggregates
    const aggregate = aggregates[targetUdise];
    
    // Initialize aggregatesPresent for all expected subjects
    grade5Subjects.forEach(subject => {
      diag.grade5.aggregatesPresent[subject] = !!(aggregate?.grade5?.subjects[subject]);
    });
    grade8Subjects.forEach(subject => {
      diag.grade8.aggregatesPresent[subject] = !!(aggregate?.grade8?.subjects[subject]);
    });

    // Scan Grade 5 responses
    const grade5Path = process.env.ANGUL_GRADE5_XLSX_PATH!;
    if (fs.existsSync(grade5Path)) {
      const grade5Workbook = XLSX.readFile(grade5Path);
      const grade5Sheet = grade5Workbook.Sheets[grade5Workbook.SheetNames[0]];
      const grade5Rows = XLSX.utils.sheet_to_json(grade5Sheet, { header: 1 }) as any[][];
      
      if (grade5Rows.length >= 2) {
        const headers = grade5Rows[0].map((h: any) => String(h || '').trim());
        const columnMap: Record<string, string> = {};
        
        for (const [field, aliases] of Object.entries(STUDENT_HEADER_ALIASES)) {
          const col = findColumnName(headers, aliases);
          if (col) columnMap[field] = col;
        }

        if (columnMap.grade && columnMap.day && columnMap.udise && columnMap.responses) {
          for (let i = 1; i < grade5Rows.length; i++) {
            const row = grade5Rows[i];
            const rowObj: Record<string, any> = {};
            headers.forEach((header, index) => {
              rowObj[header] = row[index];
            });

            const udise = normalizeUdise(rowObj[columnMap.udise]);
            if (udise === targetUdise) {
              diag.grade5.rawRowsFound++;
              
              const day = Number(rowObj[columnMap.day]);
              const responsesRaw = String(rowObj[columnMap.responses] || '').trim();
              const responses = responsesRaw.split('#').filter((r: string) => r !== '');
              
              // Infer subjects based on day (same logic as processStudentResponses)
              let inferredSubjects: string[] = [];
              if (day === 1) {
                inferredSubjects = ['Odia', 'EVS'];
              } else if (day === 2) {
                inferredSubjects = ['English', 'Mathematics'];
              } else {
                diag.notes.push(`Grade 5 row found with invalid day: ${day}`);
              }

              const breakdownKey = `Day${day}_${inferredSubjects.join('/')}`;
              diag.grade5.inferredBreakdown[breakdownKey] = 
                (diag.grade5.inferredBreakdown[breakdownKey] || 0) + 1;

              // Check response length
              const expectedLength = 30;
              if (responses.length !== expectedLength) {
                diag.notes.push(`Grade 5 Day${day}: response length ${responses.length}, expected ${expectedLength}`);
              }
            }
          }
        }
      }
    }

    // Scan Grade 8 responses
    const grade8Path = process.env.ANGUL_GRADE8_XLSX_PATH!;
    if (fs.existsSync(grade8Path)) {
      const grade8Workbook = XLSX.readFile(grade8Path);
      const grade8Sheet = grade8Workbook.Sheets[grade8Workbook.SheetNames[0]];
      const grade8Rows = XLSX.utils.sheet_to_json(grade8Sheet, { header: 1 }) as any[][];
      
      if (grade8Rows.length >= 2) {
        const headers = grade8Rows[0].map((h: any) => String(h || '').trim());
        const columnMap: Record<string, string> = {};
        
        for (const [field, aliases] of Object.entries(STUDENT_HEADER_ALIASES)) {
          const col = findColumnName(headers, aliases);
          if (col) columnMap[field] = col;
        }

        if (columnMap.grade && columnMap.day && columnMap.udise && columnMap.responses) {
          for (let i = 1; i < grade8Rows.length; i++) {
            const row = grade8Rows[i];
            const rowObj: Record<string, any> = {};
            headers.forEach((header, index) => {
              rowObj[header] = row[index];
            });

            const udise = normalizeUdise(rowObj[columnMap.udise]);
            if (udise === targetUdise) {
              diag.grade8.rawRowsFound++;
              
              const day = Number(rowObj[columnMap.day]);
              const responsesRaw = String(rowObj[columnMap.responses] || '').trim();
              const responses = responsesRaw.split('#').filter((r: string) => r !== '');
              
              // Infer subjects based on day (same logic as processStudentResponses)
              let inferredSubjects: string[] = [];
              if (day === 1) {
                inferredSubjects = ['Odia', 'English', 'Science'];
              } else if (day === 2) {
                inferredSubjects = ['Mathematics', 'Social Science'];
              } else {
                diag.notes.push(`Grade 8 row found with invalid day: ${day}`);
              }

              const breakdownKey = `Day${day}_${inferredSubjects.join('/')}`;
              diag.grade8.inferredBreakdown[breakdownKey] = 
                (diag.grade8.inferredBreakdown[breakdownKey] || 0) + 1;

              // Check response length
              const expectedLength = day === 1 ? 60 : 40;
              if (responses.length !== expectedLength) {
                diag.notes.push(`Grade 8 Day${day}: response length ${responses.length}, expected ${expectedLength}`);
              }
            }
          }
        }
      }
    }

    // Analyze discrepancies
    if (diag.grade5.rawRowsFound > 0 && !aggregate?.grade5) {
      diag.notes.push('Grade 5 raw rows exist but no grade5 aggregate object');
    }
    if (diag.grade8.rawRowsFound > 0 && !aggregate?.grade8) {
      diag.notes.push('Grade 8 raw rows exist but no grade8 aggregate object');
    }

    // Check for subject-level mismatches
    if (diag.grade5.rawRowsFound > 0 && aggregate?.grade5) {
      grade5Subjects.forEach(subject => {
        if (!diag.grade5.aggregatesPresent[subject]) {
          diag.notes.push(`Grade 5 ${subject}: rows exist but subject aggregate missing`);
        }
      });
    }
    if (diag.grade8.rawRowsFound > 0 && aggregate?.grade8) {
      grade8Subjects.forEach(subject => {
        if (!diag.grade8.aggregatesPresent[subject]) {
          diag.notes.push(`Grade 8 ${subject}: rows exist but subject aggregate missing`);
        }
      });
    }

    diagnostics.push(diag);
  }

  // Write output
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  const outputPath = path.join(outputDir, 'udiseDiagnostics.json');
  fs.writeFileSync(outputPath, JSON.stringify(diagnostics, null, 2), 'utf-8');

  console.log(`Output written to: ${outputPath}`);
  console.log(`\nDiagnostics generated for ${targetUdises.length} UDISEs`);
  
  const withRawRows = diagnostics.filter(d => d.grade5.rawRowsFound > 0 || d.grade8.rawRowsFound > 0).length;
  console.log(`  UDISEs with raw response rows: ${withRawRows}`);
  
  const withIssues = diagnostics.filter(d => d.notes.length > 0).length;
  console.log(`  UDISEs with anomalies noted: ${withIssues}`);
  
  console.log('\n✅ STEP 3.6 COMPLETE: UDISE diagnostics generated!\n');
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
  // Track: udise -> grade -> subject -> loCode -> { attempts, correct, attempts_G_1, correct_G_1, attempts_G, correct_G }
  const loData: Record<string, {
    grade5?: Record<string, Record<string, { 
      attempts: number; 
      correct: number;
      attempts_G_1: number;
      correct_G_1: number;
      attempts_G: number;
      correct_G: number;
    }>>;
    grade8?: Record<string, Record<string, { 
      attempts: number; 
      correct: number;
      attempts_G_1: number;
      correct_G_1: number;
      attempts_G: number;
      correct_G: number;
    }>>;
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
        const udise = normalizeUdise(rowObj[grade5ColumnMap.udise]);
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
            loData[udise].grade5[subject][loCode] = { 
              attempts: 0, 
              correct: 0,
              attempts_G_1: 0,
              correct_G_1: 0,
              attempts_G: 0,
              correct_G: 0
            };
          }

          // Track attempt and correctness
          loData[udise].grade5[subject][loCode].attempts++;
          const isCorrect = response === key.answerKey;
          if (isCorrect) {
            loData[udise].grade5[subject][loCode].correct++;
          }

          // Track by question level
          if (key.questionLevel === 'G-1') {
            loData[udise].grade5[subject][loCode].attempts_G_1++;
            if (isCorrect) {
              loData[udise].grade5[subject][loCode].correct_G_1++;
            }
          } else { // 'G'
            loData[udise].grade5[subject][loCode].attempts_G++;
            if (isCorrect) {
              loData[udise].grade5[subject][loCode].correct_G++;
            }
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
        const udise = normalizeUdise(rowObj[grade8ColumnMap.udise]);
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
            loData[udise].grade8[subject][loCode] = { 
              attempts: 0, 
              correct: 0,
              attempts_G_1: 0,
              correct_G_1: 0,
              attempts_G: 0,
              correct_G: 0
            };
          }

          // Track attempt and correctness
          loData[udise].grade8[subject][loCode].attempts++;
          const isCorrect = response === key.answerKey;
          if (isCorrect) {
            loData[udise].grade8[subject][loCode].correct++;
          }

          // Track by question level
          if (key.questionLevel === 'G-1') {
            loData[udise].grade8[subject][loCode].attempts_G_1++;
            if (isCorrect) {
              loData[udise].grade8[subject][loCode].correct_G_1++;
            }
          } else { // 'G'
            loData[udise].grade8[subject][loCode].attempts_G++;
            if (isCorrect) {
              loData[udise].grade8[subject][loCode].correct_G++;
            }
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

          const percent_G_1 = stats.attempts_G_1 > 0
            ? Math.round((stats.correct_G_1 / stats.attempts_G_1) * 1000) / 10
            : null;

          const percent_G = stats.attempts_G > 0
            ? Math.round((stats.correct_G / stats.attempts_G) * 1000) / 10
            : null;

          if (stats.attempts === 0) {
            zeroAttemptWarnings++;
          }

          loRecords.push({
            loCode,
            loDescription: metadata.loDescription,
            itemCount: metadata.itemCount,
            attempts: stats.attempts,
            correct: stats.correct,
            percent,
            attempts_G_1: stats.attempts_G_1,
            correct_G_1: stats.correct_G_1,
            percent_G_1,
            attempts_G: stats.attempts_G,
            correct_G: stats.correct_G,
            percent_G
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

          const percent_G_1 = stats.attempts_G_1 > 0
            ? Math.round((stats.correct_G_1 / stats.attempts_G_1) * 1000) / 10
            : null;

          const percent_G = stats.attempts_G > 0
            ? Math.round((stats.correct_G / stats.attempts_G) * 1000) / 10
            : null;

          if (stats.attempts === 0) {
            zeroAttemptWarnings++;
          }

          loRecords.push({
            loCode,
            loDescription: metadata.loDescription,
            itemCount: metadata.itemCount,
            attempts: stats.attempts,
            correct: stats.correct,
            percent,
            attempts_G_1: stats.attempts_G_1,
            correct_G_1: stats.correct_G_1,
            percent_G_1,
            attempts_G: stats.attempts_G,
            correct_G: stats.correct_G,
            percent_G
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
}

/**
 * Generate data version file with timestamp and counts
 */
function generateDataVersion(): void {
  console.log('=== STEP 5: Generating Data Version ===\n');

  const outputDir = path.join(__dirname, '..', 'public', 'data');
  
  // Load generated files to get counts
  const schoolsPath = path.join(outputDir, 'schools.json');
  const aggregatesPath = path.join(outputDir, 'schoolAggregates.json');
  const loBreakdownPath = path.join(outputDir, 'schoolLoBreakdown.json');

  const schools: SchoolRecord[] = JSON.parse(fs.readFileSync(schoolsPath, 'utf-8'));
  const aggregates: Record<string, SchoolAggregate> = JSON.parse(fs.readFileSync(aggregatesPath, 'utf-8'));
  const loBreakdown: SchoolLoBreakdown = JSON.parse(fs.readFileSync(loBreakdownPath, 'utf-8'));

  // Count total LO records
  let loRecordCount = 0;
  for (const schoolData of Object.values(loBreakdown)) {
    if (schoolData.grade5) {
      for (const los of Object.values(schoolData.grade5)) {
        loRecordCount += los.length;
      }
    }
    if (schoolData.grade8) {
      for (const los of Object.values(schoolData.grade8)) {
        loRecordCount += los.length;
      }
    }
  }

  const timestamp = new Date().toISOString();
  
  const versionData = {
    generatedAt: timestamp,
    schools: schools.length,
    aggregates: Object.keys(aggregates).length,
    loRecords: loRecordCount
  };

  // Write version file
  const versionPath = path.join(outputDir, 'dataVersion.json');
  fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2), 'utf-8');

  console.log(`Output written to: ${versionPath}`);
  console.log(`\nDATA VERSION: ${timestamp}, schools=${versionData.schools}, aggregates=${versionData.aggregates}, loRecords=${versionData.loRecords}`);
  console.log('\n✅ STEP 5 COMPLETE: Data version generated!\n');
  console.log('=== ALL PREPROCESSING STEPS COMPLETE ===\n');
  
  console.log('📋 VERIFICATION INSTRUCTIONS:');
  console.log('   1. Run: npm run preprocess');
  console.log('   2. Hard refresh your browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)');
  console.log('   3. Check public/data/dataVersion.json timestamp matches the log above');
  console.log('   4. If timestamps match, your data is fresh and up-to-date!\n');
}

// Run the preprocessing
try {
  processSchoolsMaster();
  const questionLevelLookup = processQuestionGradeLevels();
  processAnswerKeys(questionLevelLookup);
  const { auditRows } = processStudentResponses();
  generateDataIntegrityReport(auditRows);
  generateUdiseDebug();
  generateUdiseDiagnostics();
  processLoBreakdown();
  generateDataVersion();
} catch (error) {
  console.error('\n❌ ERROR:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

