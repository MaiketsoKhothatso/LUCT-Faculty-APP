import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { loginUser, registerUser } from '../services/auth';
import { COLORS } from '../styles/theme';
import { UserRole } from '../types';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await loginUser(email, password);
      } else {
        await registerUser(email, password, role);
      }
    } catch (error: any) {
  console.error('Auth error:', error);
  let message = 'Authentication failed. Please try again.';
  
  if (error.code === 'auth/email-already-in-use') {
    message = 'This email is already registered. Please log in instead.';
  } else if (error.code === 'auth/invalid-email') {
    message = 'Please enter a valid email address.';
  } else if (error.code === 'auth/weak-password') {
    message = 'Password should be at least 6 characters.';
  } else if (error.code === 'auth/user-not-found') {
    message = 'No account found with this email.';
  } else if (error.code === 'auth/wrong-password') {
    message = 'Incorrect password. Please try again.';
  }
  
  Alert.alert('Authentication Error', message);
    } finally {
      setLoading(false);
    } };  

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="school" size={48} color={COLORS.primary} />
            <Text style={styles.title}>LUCT</Text>
          </View>
          <Text style={styles.subtitle}>Faculty Portal</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>Select Role:</Text>
              <View style={styles.roleButtons}>
                {(['student', 'lecturer', 'prl', 'pl'] as UserRole[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleButton, role === r && styles.roleButtonActive]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.roleButtonText, role === r && styles.roleButtonTextActive]}>
                      {r.toUpperCase()}
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

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchTextBold}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, marginLeft: 12 },
  subtitle: { fontSize: 18, color: COLORS.textLight },
  form: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, height: 56, borderWidth: 1, borderColor: COLORS.border },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: COLORS.text },
  roleContainer: { marginBottom: 20 },
  roleLabel: { fontSize: 14, fontWeight: '500', color: COLORS.textLight, marginBottom: 8 },
  roleButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  roleButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  roleButtonTextActive: { color: '#fff' },
  authButton: { backgroundColor: COLORS.primary, borderRadius: 12, height: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  authButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switchText: { textAlign: 'center', color: COLORS.textLight },
  switchTextBold: { color: COLORS.primary, fontWeight: '600' },
});