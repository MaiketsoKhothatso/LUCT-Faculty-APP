import { addDoc, collection, FirestoreError, getDocs, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ClassItem, Course, Report } from '../types';

const handleError = (operation: string, error: unknown): never => {
  if (error instanceof FirestoreError) {
    console.error(`Firestore ${operation} failed: [${error.code}] ${error.message}`);
  } else {
    console.error(`Unknown error during ${operation}:`, error);
  }
  throw error; 
};

{/* COURSES */}
export const fetchAllCourses = async (): Promise<Course[]> => {
  try {
    const q = query(collection(db, 'courses'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Course, 'id'>)
    }));
  } catch (error) {
    handleError('fetchAllCourses', error);
    return []; 
  }
};

export const addNewCourse = async (course: Omit<Course, 'id'>) => {
  try {
    return await addDoc(collection(db, 'courses'), course);
  } catch (error) {
    handleError('addNewCourse', error);
    throw error;
  }
};

{/* CLASSES */}
export const fetchAllClasses = async (): Promise<ClassItem[]> => {
  try {
    const q = query(collection(db, 'classes'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<ClassItem, 'id'>)
    }));
  } catch (error) {
    handleError('fetchAllClasses', error);
    return [];
  }
};

{/* REPORTS */}
export const fetchAllReports = async (): Promise<Report[]> => {
  try {
    const q = query(collection(db, 'reports'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Report, 'id'>)
    }));
  } catch (error) {
    handleError('fetchAllReports', error);
    return [];
  }
};