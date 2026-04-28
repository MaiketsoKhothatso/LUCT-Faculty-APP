import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserData, UserRole } from '../types';

export const getDefaultRouteForRole = (role: UserRole | null) => {
  switch (role) {
    case 'lecturer':
      return '/lecturer';
    case 'prl':
      return '/prl';
    case 'pl':
      return '/pl';
    case 'student':
    default:
      return '/student';
  }
};

export const registerUser = async (
  email: string,
  password: string,
  role: UserRole,
  name: string
) => {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const userData: UserData = { email, name, role, createdAt: new Date().toISOString() };
    await setDoc(doc(db, 'users', userCred.user.uid), userData);
    return userCred.user;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    return userCred.user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = () => signOut(auth);

export const getCurrentUserRole = async (uid: string): Promise<UserRole | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserData;
      return data.role;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
};

export const onAuthStateChange = (callback: (user: User | null, role: UserRole | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const role = await getCurrentUserRole(user.uid);
      callback(user, role);
    } else {
      callback(null, null);
    }
  });
};
