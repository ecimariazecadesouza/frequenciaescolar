export enum EnrollmentStatus {
  ACTIVE = 'Cursando',
  DROPOUT = 'Evasão',
  TRANSFERRED = 'Transferência',
  OTHER = 'Outro'
}

export interface Student {
  id: string;
  name: string;
  status: EnrollmentStatus;
  classId?: string; // Link to ClassGroup ID
}

export interface ClassGroup {
  id: string;
  name: string;
}

export enum AttendanceStatus {
  PRESENT = 'P',
  ABSENT = 'F',
  EXCUSED = 'J', // Justificada
  UNDEFINED = '-',
}

export interface Subject {
  id: string;
  name: string;
}

// Map Date String (YYYY-MM-DD) -> Array of Statuses (for multiple lessons per day)
export interface AttendanceRecord {
  [date: string]: AttendanceStatus[];
}

// Map Subject ID -> (Map Student ID -> AttendanceRecord)
export interface ClassAttendance {
  [subjectId: string]: {
    [studentId: string]: AttendanceRecord;
  };
}

export interface StudentStats {
  totalLessons: number;
  present: number;
  absent: number;
  excused: number;
  percentage: number;
}

export interface BimesterConfig {
  id: number;
  name: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}