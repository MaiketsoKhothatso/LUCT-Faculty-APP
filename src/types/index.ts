export type UserRole = 'student' | 'lecturer' | 'prl' | 'pl';

export interface UserData {
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface Course {
  id: string;
  name: string;
  code?: string;
  lecturer?: string;
  program?: string;
  stream?: string; 
}

export interface ClassItem {
  id: string;
  courseName: string;
  time: string;
  studentCount: number;
  lecturerId?: string;
}

export interface Report {
  id: string;
  title: string;
  content?: string;
  status?: 'pending' | 'reviewed' | 'approved';
  author?: string;
  authorRole?: UserRole;
  createdAt?: Date;
}

export type RootStackParamList = {
  Home: undefined;
};