// School master record
export interface School {
  udise: string;
  schoolName: string;
  block: string;
  management: string;
  location: string;
}

// Subject aggregate
export interface SubjectAggregate {
  avgMarks: number;
  totalMarks: number;
  avgPercent: number;
  studentCount: number;
}

// Grade aggregate
export interface GradeAggregate {
  studentCount: number;
  day1StudentCount: number;
  day2StudentCount: number;
  uniqueStudentCount: number;
  subjects: Record<string, SubjectAggregate>;
  overallAvgMarks: number;
  overallPercent: number;
}

// School aggregate
export interface SchoolAggregate {
  udise: string;
  grade5?: GradeAggregate;
  grade8?: GradeAggregate;
}

// Combined school data for display
export interface SchoolDisplayData extends School {
  grade5?: GradeAggregate;
  grade8?: GradeAggregate;
}

