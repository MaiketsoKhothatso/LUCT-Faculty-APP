import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../src/components/LoadingSpinner';
import { getDefaultRouteForRole, onAuthStateChange } from '../src/services/auth';
import { UserRole } from '../src/types';

export default function RootLayout() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser, role) => {
      setUserId(currentUser?.uid ?? null);
      setUserRole(role);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!navigationState?.key) return;

    const currentRoute = segments[0] ? String(segments[0]) : '';
    const inAuthRoute = currentRoute === '';
    const expectedRoute = userRole ? getDefaultRouteForRole(userRole).slice(1) : null;

    if (!userId && !inAuthRoute) {
      router.replace('/');
      return;
    }

    if (userId && expectedRoute && currentRoute !== expectedRoute) {
      router.replace(getDefaultRouteForRole(userRole));
    }
  }, [loading, navigationState?.key, router, segments, userId, userRole]);

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
