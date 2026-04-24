import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as XLSX from 'xlsx';
import LoadingSpinner from '../components/LoadingSpinner';
import { auth, db } from '../config/firebase';
import { logoutUser } from '../services/auth';
import { fetchAllCourses } from '../services/firestore';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../styles/theme';
import { Course } from '../types';

interface AttendanceRecord {
  id?: string;
  courseId: string;
  courseName: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}

export default function StudentDashboard() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');

  const loadData = async () => {
    try {
      const data = await fetchAllCourses();
      setAllCourses(data);
      setFilteredCourses(data);
    } catch {
      Alert.alert('Error', 'Could not load courses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAttendance = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, 'attendance'),
        where('studentId', '==', auth.currentUser.uid),
        where('date', '==', selectedDate)
      );
      const snapshot = await getDocs(q);
      const records: AttendanceRecord[] = [];
      snapshot.forEach(docSnap => records.push({ id: docSnap.id, ...docSnap.data() } as AttendanceRecord));
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setFilteredCourses(
      searchTerm.trim() === ''
        ? allCourses
        : allCourses.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, allCourses]);

  const exportToExcel = (data: Course[]) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data.map(c => ({ Code: c.code, Name: c.name, Lecturer: c.lecturer })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Courses');
      XLSX.writeFile(wb, 'my_courses.xlsx');
    } catch {
      Alert.alert('Export Failed');
    }
  };

  const handleMarkAttendance = async (courseId: string, courseName: string, status: 'present' | 'absent' | 'late') => {
    if (!auth.currentUser) return;
    try {
      const existing = attendanceRecords.find(r => r.courseId === courseId);
      if (existing?.id) {
        await updateDoc(doc(db, 'attendance', existing.id), { status });
      } else {
        await addDoc(collection(db, 'attendance'), {
          studentId: auth.currentUser.uid,
          courseId,
          courseName,
          date: selectedDate,
          status,
          createdAt: new Date(),
        });
      }
      loadAttendance();
    } catch {
      Alert.alert('Error', 'Could not update attendance');
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedCourse || ratingValue === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    try {
      await addDoc(collection(db, 'ratings'), {
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        studentId: auth.currentUser?.uid,
        rating: ratingValue,
        feedback: ratingFeedback,
        createdAt: new Date(),
      });
      Alert.alert('Success', 'Rating submitted');
      setRatingModalVisible(false);
      setSelectedCourse(null);
      setRatingValue(0);
      setRatingFeedback('');
    } catch {
      Alert.alert('Error', 'Could not submit rating');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>Student</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => exportToExcel(filteredCourses)} style={styles.iconButton}>
            <MaterialCommunityIcons name="microsoft-excel" size={22} color={COLORS.success} />
            <Text style={{ fontSize: 10, color: COLORS.success }}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logoutUser} style={styles.iconButton}>
            <MaterialCommunityIcons name="logout" size={22} color={COLORS.danger} />
            <Text style={{ fontSize: 10, color: COLORS.danger }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor={COLORS.textLight}
        />
        {searchTerm !== '' && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="book-open-variant" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{allCourses.length}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="calendar-check" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>85%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="star" size={24} color={COLORS.warning} />
            <Text style={styles.statNumber}>4.2</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => { loadAttendance(); setAttendanceModalVisible(true); }}>
            <MaterialCommunityIcons name="calendar-check" size={22} color={COLORS.primary} />
            <Text style={styles.actionText}>Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="chart-line" size={22} color={COLORS.primary} />
            <Text style={styles.actionText}>Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setRatingModalVisible(true)}>
            <MaterialCommunityIcons name="star" size={22} color={COLORS.primary} />
            <Text style={styles.actionText}>Rate Course</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="account" size={22} color={COLORS.primary} />
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Courses</Text>
          <TouchableOpacity onPress={() => exportToExcel(filteredCourses)}>
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>
        {filteredCourses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="book-remove" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No courses found</Text>
          </View>
        ) : (
          filteredCourses.map(course => (
            <View key={course.id} style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <Text style={styles.courseCode}>{course.code || 'N/A'}</Text>
                <View style={styles.attendanceBadge}>
                  <Text style={styles.attendanceText}>85%</Text>
                </View>
              </View>
              <Text style={styles.courseName}>{course.name}</Text>
              <View style={styles.courseFooter}>
                <View style={styles.lecturerInfo}>
                  <MaterialCommunityIcons name="account-tie" size={14} color={COLORS.textLight} />
                  <Text style={styles.lecturerName}>{course.lecturer || 'TBA'}</Text>
                </View>
                <TouchableOpacity style={styles.viewButton} onPress={() => { setSelectedCourse(course); setRatingModalVisible(true); }}>
                  <Text style={styles.viewButtonText}>Rate</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Attendance Modal */}
      <Modal visible={attendanceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mark Attendance</Text>
            <Text style={styles.modalLabel}>Date: {selectedDate}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {allCourses.map(course => {
                const record = attendanceRecords.find(r => r.courseId === course.id);
                const status = record?.status || 'absent';
                return (
                  <View key={course.id} style={styles.attendanceRow}>
                    <Text style={styles.attendanceCourse}>{course.name}</Text>
                    <View style={styles.attendanceActions}>
                      <TouchableOpacity
                        style={[styles.statusButton, status === 'present' && styles.statusActive]}
                        onPress={() => handleMarkAttendance(course.id, course.name, 'present')}
                      >
                        <Text style={status === 'present' ? styles.statusTextActive : styles.statusText}>P</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusButton, status === 'absent' && styles.statusActive]}
                        onPress={() => handleMarkAttendance(course.id, course.name, 'absent')}
                      >
                        <Text style={status === 'absent' ? styles.statusTextActive : styles.statusText}>A</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusButton, status === 'late' && styles.statusActive]}
                        onPress={() => handleMarkAttendance(course.id, course.name, 'late')}
                      >
                        <Text style={status === 'late' ? styles.statusTextActive : styles.statusText}>L</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setAttendanceModalVisible(false)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={ratingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Course</Text>
            {!selectedCourse ? (
              <ScrollView style={{ maxHeight: 300 }}>
                {allCourses.map(course => (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.courseSelectItem}
                    onPress={() => setSelectedCourse(course)}
                  >
                    <Text style={styles.courseSelectText}>{course.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <>
                <Text style={styles.selectedCourse}>{selectedCourse.name}</Text>
                <View style={styles.starContainer}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                      <MaterialCommunityIcons
                        name={star <= ratingValue ? 'star' : 'star-outline'}
                        size={36}
                        color={COLORS.warning}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.modalInput, { minHeight: 80 }]}
                  placeholder="Feedback (optional)"
                  multiline
                  value={ratingFeedback}
                  onChangeText={setRatingFeedback}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => { setRatingModalVisible(false); setSelectedCourse(null); }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitButton} onPress={handleSubmitRating}>
                    <Text style={styles.submitText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg },
  greeting: { fontSize: 15, color: COLORS.textLight },
  name: { fontSize: 24, fontWeight: '600', color: COLORS.text },
  headerActions: { flexDirection: 'row' },
  iconButton: { padding: SPACING.sm, marginLeft: SPACING.xs },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: SPACING.xs, marginLeft: SPACING.sm, color: COLORS.text },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xl },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginHorizontal: SPACING.xs, backgroundColor: COLORS.card, ...SHADOWS.sm },
  statNumber: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: SPACING.xs },
  statLabel: { fontSize: 12, color: COLORS.textLight },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  exportText: { color: COLORS.primary, fontWeight: '500' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.xl },
  actionButton: { alignItems: 'center', backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, width: 72, ...SHADOWS.sm },
  actionText: { fontSize: 11, color: COLORS.text, marginTop: SPACING.xs },
  courseCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  courseCode: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  attendanceBadge: { backgroundColor: COLORS.success + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  attendanceText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  courseName: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.md },
  courseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lecturerInfo: { flexDirection: 'row', alignItems: 'center' },
  lecturerName: { fontSize: 13, color: COLORS.textLight, marginLeft: 4 },
  viewButton: { backgroundColor: COLORS.primary + '10', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 20 },
  viewButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, color: COLORS.textLight, marginTop: SPACING.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { backgroundColor: '#fff', borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.lg, color: COLORS.text },
  modalLabel: { fontSize: 14, color: COLORS.textLight, marginBottom: SPACING.md },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: SPACING.sm },
  cancelText: { color: COLORS.textLight, marginRight: SPACING.lg, paddingVertical: SPACING.sm },
  submitButton: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: 20 },
  submitText: { color: '#fff', fontWeight: '600' },
  attendanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  attendanceCourse: { fontSize: 15, color: COLORS.text, flex: 1 },
  attendanceActions: { flexDirection: 'row', gap: SPACING.sm },
  statusButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  statusActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusText: { color: COLORS.textLight, fontWeight: '600' },
  statusTextActive: { color: '#fff', fontWeight: '600' },
  starContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: SPACING.lg },
  selectedCourse: { fontSize: 16, fontWeight: '600', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.md },
  courseSelectItem: { padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  courseSelectText: { fontSize: 16, color: COLORS.text },
});