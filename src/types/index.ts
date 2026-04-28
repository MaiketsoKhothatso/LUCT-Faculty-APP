export type UserRole = 'student' | 'lecturer' | 'prl' | 'pl';
export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface UserData {
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date | string;
  classIds?: string[];
  courseIds?: string[];
  lecturerId?: string;
  program?: string;
  stream?: string;
}

export interface Course {
  id: string;
  name: string;
  code?: string;
  lecturer?: string;
  lecturerEmail?: string;
  lecturerId?: string;
  program?: string;
  stream?: string;
}

export interface ClassItem {
  id: string;
  courseId?: string;
  courseName: string;
  time: string;
  studentCount: number;
  lecturerEmail?: string;
  lecturerName?: string;
  lecturerId?: string;
  program?: string;
  stream?: string;
  studentIds?: string[];
}

export interface Report {
  id: string;
  title: string;
  content?: string;
  status?: 'pending' | 'reviewed' | 'approved';
  author?: string;
  authorId?: string;
  authorEmail?: string;
  authorRole?: UserRole;
  createdAt?: Date | string;
}

export interface UserProfile extends UserData {
  id: string;
}

export interface AttendanceRecord {
  id: string;
  classId?: string;
  courseId?: string;
  courseName: string;
  date: string;
  markedBy?: string;
  status: AttendanceStatus;
  studentId: string;
  studentName?: string;
  createdAt?: Date | string;
}

export interface RatingRecord {
  id: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName?: string;
  rating: number;
  feedback?: string;
  createdAt?: Date | string;
}

export type RootStackParamList = {
  Home: undefined;
};
