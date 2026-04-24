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

export const registerUser = async (email: string, password: string, role: UserRole) => {
  console.log('registerUser called with:', email, role);
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Firebase Auth user created:', userCred.user.uid);
    
    const userData: UserData = { email, role, createdAt: new Date() };
    await setDoc(doc(db, 'users', userCred.user.uid), userData);
    console.log('User role saved to Firestore');
    return userCred.user;
  } catch (error) {
    console.error('registerUser error:', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  console.log('loginUser called with:', email);
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('Login successful, uid:', userCred.user.uid);
    return userCred.user;
  } catch (error) {
    console.error('loginUser error:', error);
    throw error;
  }
};

export const logoutUser = () => signOut(auth);

export const getCurrentUserRole = async (uid: string): Promise<UserRole | null> => {
  console.log('Fetching role for uid:', uid);
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserData;
      console.log('Role found in Firestore:', data.role);
      return data.role;
    } else {
      console.warn('No user document found in Firestore for uid:', uid);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
};

export const onAuthStateChange = (callback: (user: User | null, role: UserRole | null) => void) => {
  console.log('Setting up onAuthStateChanged listener');
  return onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed. User:', user?.uid || 'null');
    if (user) {
      const role = await getCurrentUserRole(user.uid);
      console.log('Calling callback with user and role:', role);
      callback(user, role);
    } else {
      console.log('Calling callback with null (logged out)');
      callback(null, null);
    }
  });
};