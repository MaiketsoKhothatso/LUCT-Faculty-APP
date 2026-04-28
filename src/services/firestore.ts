import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  type AttendanceRecord,
  type AttendanceStatus,
  type ClassItem,
  type Course,
  type RatingRecord,
  type Report,
  type UserProfile,
  type UserRole,
} from '../types';

const usersCollection = collection(db, 'users');
const coursesCollection = collection(db, 'courses');
const classesCollection = collection(db, 'classes');
const reportsCollection = collection(db, 'reports');
const attendanceCollection = collection(db, 'attendance');
const ratingsCollection = collection(db, 'ratings');

const handleError = (operation: string, error: unknown): never => {
  console.error(`Firestore ${operation} failed:`, error);
  throw error;
};

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeDate = (value as { toDate: () => Date }).toDate();
    return maybeDate.toISOString();
  }
  return undefined;
};

const mapUser = (id: string, data: DocumentData): UserProfile => ({
  id,
  email: String(data.email ?? ''),
  name: String(data.name ?? data.email ?? 'Unknown User'),
  role: data.role as UserRole,
  createdAt: toIsoString(data.createdAt) ?? new Date().toISOString(),
  classIds: Array.isArray(data.classIds) ? data.classIds : undefined,
  courseIds: Array.isArray(data.courseIds) ? data.courseIds : undefined,
  lecturerId: typeof data.lecturerId === 'string' ? data.lecturerId : undefined,
  program: typeof data.program === 'string' ? data.program : undefined,
  stream: typeof data.stream === 'string' ? data.stream : undefined,
});

const mapCourse = (id: string, data: DocumentData): Course => ({
  id,
  name: String(data.name ?? 'Untitled Course'),
  code: typeof data.code === 'string' ? data.code : undefined,
  lecturer: typeof data.lecturer === 'string' ? data.lecturer : undefined,
  lecturerEmail: typeof data.lecturerEmail === 'string' ? data.lecturerEmail : undefined,
  lecturerId: typeof data.lecturerId === 'string' ? data.lecturerId : undefined,
  program: typeof data.program === 'string' ? data.program : undefined,
  stream: typeof data.stream === 'string' ? data.stream : undefined,
});

const mapClass = (id: string, data: DocumentData): ClassItem => ({
  id,
  courseId: typeof data.courseId === 'string' ? data.courseId : undefined,
  courseName: String(data.courseName ?? 'Untitled Class'),
  time: String(data.time ?? 'TBD'),
  studentCount: Number(data.studentCount ?? 0),
  lecturerId: typeof data.lecturerId === 'string' ? data.lecturerId : undefined,
  lecturerName: typeof data.lecturerName === 'string' ? data.lecturerName : undefined,
  lecturerEmail: typeof data.lecturerEmail === 'string' ? data.lecturerEmail : undefined,
  program: typeof data.program === 'string' ? data.program : undefined,
  stream: typeof data.stream === 'string' ? data.stream : undefined,
  studentIds: Array.isArray(data.studentIds) ? data.studentIds : undefined,
});

const mapReport = (id: string, data: DocumentData): Report => ({
  id,
  title: String(data.title ?? 'Untitled Report'),
  content: typeof data.content === 'string' ? data.content : undefined,
  status: data.status as Report['status'],
  author: typeof data.author === 'string' ? data.author : undefined,
  authorId: typeof data.authorId === 'string' ? data.authorId : undefined,
  authorEmail: typeof data.authorEmail === 'string' ? data.authorEmail : undefined,
  authorRole: data.authorRole as UserRole,
  createdAt: toIsoString(data.createdAt),
});

const mapAttendance = (id: string, data: DocumentData): AttendanceRecord => ({
  id,
  classId: typeof data.classId === 'string' ? data.classId : undefined,
  courseId: typeof data.courseId === 'string' ? data.courseId : undefined,
  courseName: String(data.courseName ?? 'Untitled Course'),
  date: String(data.date ?? ''),
  markedBy: typeof data.markedBy === 'string' ? data.markedBy : undefined,
  status: data.status as AttendanceStatus,
  studentId: String(data.studentId ?? ''),
  studentName: typeof data.studentName === 'string' ? data.studentName : undefined,
  createdAt: toIsoString(data.createdAt),
});

const mapRating = (id: string, data: DocumentData): RatingRecord => ({
  id,
  courseId: String(data.courseId ?? ''),
  courseName: String(data.courseName ?? 'Untitled Course'),
  studentId: String(data.studentId ?? ''),
  studentName: typeof data.studentName === 'string' ? data.studentName : undefined,
  rating: Number(data.rating ?? 0),
  feedback: typeof data.feedback === 'string' ? data.feedback : undefined,
  createdAt: toIsoString(data.createdAt),
});

const runCollectionQuery = async <T>(
  source: ReturnType<typeof collection>,
  mapper: (id: string, data: DocumentData) => T,
  constraints: QueryConstraint[] = []
) => {
  const snapshot = constraints.length ? await getDocs(query(source, ...constraints)) : await getDocs(source);
  return snapshot.docs.map((item) => mapper(item.id, item.data()));
};

export const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const snapshot = await getDoc(doc(db, 'users', uid));
    return snapshot.exists() ? mapUser(snapshot.id, snapshot.data()) : null;
  } catch (error) {
    return handleError('fetchUserProfile', error);
  }
};

export const fetchUsersByRole = async (role: UserRole): Promise<UserProfile[]> => {
  try {
    return await runCollectionQuery(usersCollection, mapUser, [where('role', '==', role)]);
  } catch (error) {
    return handleError('fetchUsersByRole', error);
  }
};

export const fetchAllCourses = async (): Promise<Course[]> => {
  try {
    return await runCollectionQuery(coursesCollection, mapCourse);
  } catch (error) {
    return handleError('fetchAllCourses', error);
  }
};

export const fetchAllClasses = async (): Promise<ClassItem[]> => {
  try {
    return await runCollectionQuery(classesCollection, mapClass);
  } catch (error) {
    return handleError('fetchAllClasses', error);
  }
};

export const fetchAllReports = async (): Promise<Report[]> => {
  try {
    return await runCollectionQuery(reportsCollection, mapReport);
  } catch (error) {
    return handleError('fetchAllReports', error);
  }
};

export const fetchReportsByAuthor = async (authorId: string): Promise<Report[]> => {
  try {
    return await runCollectionQuery(reportsCollection, mapReport, [where('authorId', '==', authorId)]);
  } catch (error) {
    return handleError('fetchReportsByAuthor', error);
  }
};

export const fetchAttendanceByStudent = async (
  studentId: string,
  date?: string
): Promise<AttendanceRecord[]> => {
  try {
    const constraints: QueryConstraint[] = [where('studentId', '==', studentId)];
    if (date) constraints.push(where('date', '==', date));
    return await runCollectionQuery(attendanceCollection, mapAttendance, constraints);
  } catch (error) {
    return handleError('fetchAttendanceByStudent', error);
  }
};

export const fetchAttendanceByClass = async (classId: string, date?: string): Promise<AttendanceRecord[]> => {
  try {
    const constraints: QueryConstraint[] = [where('classId', '==', classId)];
    if (date) constraints.push(where('date', '==', date));
    return await runCollectionQuery(attendanceCollection, mapAttendance, constraints);
  } catch (error) {
    return handleError('fetchAttendanceByClass', error);
  }
};

export const fetchRatings = async (courseId?: string): Promise<RatingRecord[]> => {
  try {
    const constraints = courseId ? [where('courseId', '==', courseId)] : [];
    return await runCollectionQuery(ratingsCollection, mapRating, constraints);
  } catch (error) {
    return handleError('fetchRatings', error);
  }
};

export const saveAttendanceRecord = async (payload: Omit<AttendanceRecord, 'id' | 'createdAt'>) => {
  try {
    const existing = await runCollectionQuery(attendanceCollection, mapAttendance, [
      where('studentId', '==', payload.studentId),
      where('classId', '==', payload.classId ?? ''),
      where('date', '==', payload.date),
    ]);

    if (existing[0]) {
      await updateDoc(doc(db, 'attendance', existing[0].id), {
        ...payload,
        createdAt: existing[0].createdAt ?? new Date().toISOString(),
      });
      return existing[0].id;
    }

    const created = await addDoc(attendanceCollection, {
      ...payload,
      createdAt: new Date().toISOString(),
    });
    return created.id;
  } catch (error) {
    return handleError('saveAttendanceRecord', error);
  }
};

export const createRating = async (payload: Omit<RatingRecord, 'id' | 'createdAt'>) => {
  try {
    return await addDoc(ratingsCollection, {
      ...payload,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleError('createRating', error);
  }
};

export const createReport = async (payload: Omit<Report, 'id' | 'createdAt'>) => {
  try {
    return await addDoc(reportsCollection, {
      ...payload,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleError('createReport', error);
  }
};

export const saveCourse = async (course: Omit<Course, 'id'>, courseId?: string) => {
  try {
    if (courseId) {
      await updateDoc(doc(db, 'courses', courseId), course);
      return courseId;
    }

    const created = await addDoc(coursesCollection, course);
    return created.id;
  } catch (error) {
    return handleError('saveCourse', error);
  }
};

export const deleteCourseById = async (courseId: string) => {
  try {
    await deleteDoc(doc(db, 'courses', courseId));
  } catch (error) {
    handleError('deleteCourseById', error);
  }
};

export const assignLecturerToCourse = async (course: Course, lecturer: UserProfile) => {
  try {
    await updateDoc(doc(db, 'courses', course.id), {
      lecturer: lecturer.name,
      lecturerEmail: lecturer.email,
      lecturerId: lecturer.id,
    });
  } catch (error) {
    handleError('assignLecturerToCourse', error);
  }
};

export const fetchLecturerClasses = async (lecturer: UserProfile): Promise<ClassItem[]> => {
  try {
    const classes = await fetchAllClasses();
    const courses = await fetchAllCourses();
    const courseIds = new Set(
      courses
        .filter((course) => course.lecturerId === lecturer.id || course.lecturerEmail === lecturer.email)
        .map((course) => course.id)
    );

    return classes.filter((classItem) => {
      if (classItem.lecturerId === lecturer.id) return true;
      if (classItem.lecturerEmail === lecturer.email) return true;
      if (classItem.courseId && courseIds.has(classItem.courseId)) return true;
      if (classItem.lecturerName && classItem.lecturerName === lecturer.name) return true;
      return false;
    });
  } catch (error) {
    return handleError('fetchLecturerClasses', error);
  }
};

export const fetchStudentsForClass = async (classItem: ClassItem): Promise<UserProfile[]> => {
  try {
    const students = await fetchUsersByRole('student');
    if (classItem.studentIds?.length) {
      return students.filter((student) => classItem.studentIds?.includes(student.id));
    }

    if (classItem.program || classItem.stream) {
      const scoped = students.filter((student) => {
        const programMatch = !classItem.program || student.program === classItem.program;
        const streamMatch = !classItem.stream || student.stream === classItem.stream;
        return programMatch && streamMatch;
      });

      if (scoped.length) return scoped;
    }

    return students;
  } catch (error) {
    return handleError('fetchStudentsForClass', error);
  }
};

export const syncUserProfile = async (user: UserProfile) => {
  try {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
  } catch (error) {
    handleError('syncUserProfile', error);
  }
};
