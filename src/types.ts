export interface User {
  id: number;
  uid?: string;
  name: string;
  email: string;
  username?: string;
  role: 'admin' | 'teacher' | 'student';
}

export interface Class {
  id: number;
  name: string;
  teacherId?: number;
  teacherName?: string;
  studentCount?: number;
}

export interface StudentWithAttendance {
  id: number;
  name: string;
  email: string;
  status: 'present' | 'absent' | 'late' | null;
}

export interface AttendanceRecord {
  id: number;
  date: string;
  status: 'present' | 'absent' | 'late';
  studentName: string;
  studentEmail: string;
  className: string;
  markedBy: string;
}

export interface DashboardStats {
  totalStudents?: number;
  totalTeachers?: number;
  totalClasses?: number;
  classesCount?: number;
  enrolledCount?: number;
  attendanceRate: number;
  recentLogs?: Array<{
    id: number;
    date: string;
    status: 'present' | 'absent' | 'late';
    studentName: string;
    className: string;
  }>;
  history?: Array<{
    id: number;
    date: string;
    status: 'present' | 'absent' | 'late';
    className: string;
  }>;
}
