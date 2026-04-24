import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import LoadingSpinner from './src/components/LoadingSpinner';
import AuthScreen from './src/screens/AuthScreen';
import LecturerDashboard from './src/screens/LecturerDashboard';
import PLDashboard from './src/screens/PLDashboard';
import PRLDashboard from './src/screens/PRLDashboard';
import StudentDashboard from './src/screens/StudentDashboard';
import { onAuthStateChange } from './src/services/auth';
import { UserRole } from './src/types';

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('App mounted, subscribing to auth state');
    const unsubscribe = onAuthStateChange((currentUser, role) => {
      console.log('App.tsx received callback. User:', currentUser?.uid, 'Role:', role);
      setUser(currentUser);
      setUserRole(role);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  console.log('Render: loading =', loading, 'user =', !!user, 'role =', userRole);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            {userRole === 'student' && <Stack.Screen name="Student" component={StudentDashboard} />}
            {userRole === 'lecturer' && <Stack.Screen name="Lecturer" component={LecturerDashboard} />}
            {userRole === 'prl' && <Stack.Screen name="PRL" component={PRLDashboard} />}
            {userRole === 'pl' && <Stack.Screen name="PL" component={PLDashboard} />}
            {!userRole && (
              // Fallback if role is missing
              <Stack.Screen name="Student" component={StudentDashboard} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;