import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { loginUser, registerUser } from '../services/auth';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../styles/theme';
import { UserRole } from '../types';

const ROLES: UserRole[] = ['student', 'lecturer', 'prl', 'pl'];

const toFriendlyAuthMessage = (error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'No account was found with those credentials.';
    case 'auth/wrong-password':
      return 'The password is incorrect. Please try again.';
    default:
      return 'Authentication failed. Please try again.';
  }
};

export default function AuthScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 420;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim() || (!isLogin && !name.trim())) {
      Alert.alert('Missing Information', 'Please complete all required fields.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await loginUser(email.trim(), password);
      } else {
        await registerUser(email.trim(), password, role, name.trim());
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Authentication Error', toFriendlyAuthMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: isCompact ? SPACING.md : SPACING.lg },
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { maxWidth: 480, width: '100%' }]}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <MaterialCommunityIcons name="school-outline" size={54} color={COLORS.primary} />
                <View>
                  <Text style={styles.title}>LUCT</Text>
                  <Text style={styles.subtitle}>Faculty Portal</Text>
                </View>
              </View>
              <Text style={styles.caption}>
                Sign in with Firebase or create a role-based account for the faculty system.
              </Text>
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={20}
                  color={COLORS.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={COLORS.textLight}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={COLORS.textLight}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={COLORS.textLight}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((current) => !current)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View style={styles.roleSection}>
                <Text style={styles.roleLabel}>Account Role</Text>
                <View style={styles.roleButtons}>
                  {ROLES.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.roleButton, role === item && styles.roleButtonActive]}
                      onPress={() => setRole(item)}>
                      <Text
                        style={[
                          styles.roleButtonText,
                          role === item && styles.roleButtonTextActive,
                        ]}>
                        {item.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.authButton} onPress={handleAuth} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.authButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin((current) => !current)}>
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.switchTextAccent}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  header: {
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textLight,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  roleSection: {
    marginBottom: SPACING.lg,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  roleButton: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  authButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.md,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  switchText: {
    textAlign: 'center',
    color: COLORS.textLight,
  },
  switchTextAccent: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
