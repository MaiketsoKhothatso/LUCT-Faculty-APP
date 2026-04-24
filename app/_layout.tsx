import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../src/components/LoadingSpinner';
import { onAuthStateChange } from '../src/services/auth';
import { UserRole } from '../src/types';

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser, role) => {
      setUser(currentUser);
      setUserRole(role);
      setLoading(false);
    });
    return unsubscribe;
  }, []);


  useEffect(() => {
    if (loading) return;
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === undefined;

    if (!user && !inAuthGroup) {
      
      router.replace('/');
    } else if (user && inAuthGroup) {
      
      switch (userRole) {
        case 'student':
          router.replace('/student');
          break;
        case 'lecturer':
          router.replace('/lecturer');
          break;
        case 'prl':
          router.replace('/prl');
          break;
        case 'pl':
          router.replace('/pl');
          break;
        default:
          router.replace('/student');
      }
    }
  }, [user, loading, userRole, navigationState?.key, segments]);

  if (loading) return <LoadingSpinner />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="student" />
      <Stack.Screen name="lecturer" />
      <Stack.Screen name="prl" />
      <Stack.Screen name="pl" />
    </Stack>
  );
}