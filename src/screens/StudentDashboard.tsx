import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import * as XLSX from 'xlsx';
import LoadingSpinner from '../components/LoadingSpinner';
import { auth } from '../config/firebase';
import { logoutUser } from '../services/auth';
import {
  createRating,
  fetchAllCourses,
  fetchAttendanceByStudent,
  fetchRatings,
  fetchUserProfile,
  saveAttendanceRecord,
} from '../services/firestore';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../styles/theme';
import { type AttendanceRecord, type AttendanceStatus, type Course, type UserProfile } from '../types';

export default function StudentDashboard() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [courseRatings, setCourseRatings] = useState<Record<string, number>>({});
  const selectedDate = new Date().toISOString().split('T')[0];

  const filteredCourses = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) =>
      `${course.name} ${course.code ?? ''} ${course.lecturer ?? ''}`.toLowerCase().includes(normalized)
    );
  }, [courses, searchTerm]);

  const attendanceRate = useMemo(() => {
    if (!attendance.length) return 0;
    const presentLike = attendance.filter((record) => record.status !== 'absent').length;
    return Math.round((presentLike / attendance.length) * 100);
  }, [attendance]);

  const averageRating = useMemo(() => {
    const values = Object.values(courseRatings);
    if (!values.length) return 0;
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
  }, [courseRatings]);

  const loadData = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const [userProfile, courseData, attendanceData, ratingData] = await Promise.all([
        fetchUserProfile(currentUser.uid),
        fetchAllCourses(),
        fetchAttendanceByStudent(currentUser.uid, selectedDate),
        fetchRatings(),
      ]);

      setProfile(userProfile);
      setCourses(courseData);
      setAttendance(attendanceData);

      const ratingsMap = ratingData.reduce<Record<string, number[]>>((acc, rating) => {
        if (!acc[rating.courseId]) acc[rating.courseId] = [];
        acc[rating.courseId].push(rating.rating);
        return acc;
      }, {});

      const nextRatings = Object.entries(ratingsMap).reduce<Record<string, number>>((acc, [courseId, values]) => {
        acc[courseId] = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
        return acc;
      }, {});

      setCourseRatings(nextRatings);
    } catch (error) {
      console.error('Student dashboard load failed:', error);
      Alert.alert('Loading Error', 'Could not load your student dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAttendanceSave = async (course: Course, status: AttendanceStatus) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      await saveAttendanceRecord({
        classId: course.id,
        courseId: course.id,
        courseName: course.name,
        date: selectedDate,
        markedBy: currentUser.uid,
        status,
        studentId: currentUser.uid,
        studentName: profile?.name,
      });
      await loadData();
    } catch {
      Alert.alert('Attendance Error', 'Could not update attendance for this course.');
    }
  };

  const handleSubmitRating = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !selectedCourse || ratingValue < 1) {
      Alert.alert('Missing Rating', 'Please choose a course and a star rating.');
      return;
    }

    try {
      await createRating({
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        studentId: currentUser.uid,
        studentName: profile?.name,
        rating: ratingValue,
        feedback: ratingFeedback.trim(),
      });
      Alert.alert('Success', 'Your rating has been submitted.');
      setRatingModalVisible(false);
      setSelectedCourse(null);
      setRatingValue(0);
      setRatingFeedback('');
      await loadData();
    } catch {
      Alert.alert('Rating Error', 'Could not submit your rating right now.');
    }
  };

  const exportToExcel = (data: Course[]) => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        data.map((course) => ({
          Code: course.code ?? '',
          Name: course.name,
          Lecturer: course.lecturer ?? '',
          Rating: courseRatings[course.id] ?? '',
        }))
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses');
      XLSX.writeFile(workbook, 'my_courses.xlsx');
    } catch (error) {
      console.error('Course export failed:', error);
      Alert.alert('Export Error', 'Course export is not available on this device.');
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading student dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.name}>{profile?.name ?? 'Student'}</Text>
            <Text style={styles.subtitle}>{profile?.email ?? 'student@luct.ac.ls'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => exportToExcel(filteredCourses)} style={styles.iconButton}>
              <MaterialCommunityIcons name="microsoft-excel" size={20} color={COLORS.success} />
            </TouchableOpacity>
            <TouchableOpacity onPress={logoutUser} style={styles.iconButton}>
              <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses, codes, or lecturers"
            placeholderTextColor={COLORS.textLight}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {!!searchTerm && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.statsGrid, compact && styles.statsGridCompact]}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="book-open-variant" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{courses.length}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="calendar-check" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>{attendanceRate}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="star-outline" size={24} color={COLORS.warning} />
            <Text style={styles.statNumber}>{averageRating || '-'}</Text>
            <Text style={styles.statLabel}>Avg rating</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Courses</Text>
          <TouchableOpacity onPress={() => exportToExcel(filteredCourses)}>
            <Text style={styles.sectionLink}>Export</Text>
          </TouchableOpacity>
        </View>

        {filteredCourses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="book-remove-outline" size={42} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No courses found</Text>
            <Text style={styles.emptyCopy}>Try a different search or refresh the dashboard.</Text>
          </View>
        ) : (
          <View style={[styles.courseGrid, compact && styles.courseGridCompact]}>
            {filteredCourses.map((course) => {
              const currentAttendance = attendance.find((record) => record.courseId === course.id);
              return (
                <View key={course.id} style={[styles.courseCard, compact && styles.courseCardCompact]}>
                  <View style={styles.courseHeader}>
                    <Text style={styles.courseCode}>{course.code ?? 'NO-CODE'}</Text>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingBadgeText}>
                        {courseRatings[course.id] ? `${courseRatings[course.id]} / 5` : 'No ratings'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseMeta}>{course.lecturer ?? 'Lecturer not assigned'}</Text>
                  <Text style={styles.courseMeta}>Today: {currentAttendance?.status ?? 'not marked'}</Text>
                  <View style={styles.courseActions}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => setAttendanceModalVisible(true)}>
                      <Text style={styles.secondaryButtonText}>Attendance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => {
                        setSelectedCourse(course);
                        setRatingModalVisible(true);
                      }}>
                      <Text style={styles.primaryButtonText}>Rate Course</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={attendanceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: compact ? '88%' : '78%' }]}>
            <Text style={styles.modalTitle}>Mark Attendance</Text>
            <Text style={styles.modalSubtitle}>Date: {selectedDate}</Text>
            <ScrollView>
              {courses.map((course) => {
                const currentAttendance = attendance.find((record) => record.courseId === course.id);
                return (
                  <View key={course.id} style={styles.modalRow}>
                    <View style={styles.modalRowCopy}>
                      <Text style={styles.modalRowTitle}>{course.name}</Text>
                      <Text style={styles.modalRowMeta}>{currentAttendance?.status ?? 'Not marked yet'}</Text>
                    </View>
                    <View style={styles.statusGroup}>
                      {(['present', 'late', 'absent'] as AttendanceStatus[]).map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusButton,
                            currentAttendance?.status === status && styles.statusButtonActive,
                          ]}
                          onPress={() => handleAttendanceSave(course, status)}>
                          <Text
                            style={[
                              styles.statusButtonText,
                              currentAttendance?.status === status && styles.statusButtonTextActive,
                            ]}>
                            {status[0].toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setAttendanceModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={ratingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Course</Text>
            {!selectedCourse ? (
              <ScrollView>
                {courses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.selectItem}
                    onPress={() => setSelectedCourse(course)}>
                    <Text style={styles.selectItemText}>{course.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <>
                <Text style={styles.selectedCourse}>{selectedCourse.name}</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                      <MaterialCommunityIcons
                        name={star <= ratingValue ? 'star' : 'star-outline'}
                        size={34}
                        color={COLORS.warning}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.feedbackInput}
                  multiline
                  value={ratingFeedback}
                  onChangeText={setRatingFeedback}
                  placeholder="Share optional feedback"
                  placeholderTextColor={COLORS.textLight}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setRatingModalVisible(false);
                      setSelectedCourse(null);
                      setRatingValue(0);
                      setRatingFeedback('');
                    }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleSubmitRating}>
                    <Text style={styles.primaryButtonText}>Submit</Text>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xl * 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  headerCopy: { flex: 1, gap: 4 },
  greeting: { fontSize: 14, color: COLORS.textLight },
  name: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  headerActions: { flexDirection: 'row', gap: SPACING.sm },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    ...SHADOWS.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    minHeight: 52,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: 15, color: COLORS.text },
  statsGrid: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  statsGridCompact: { flexDirection: 'column' },
  statCard: {
    flex: 1,
    minHeight: 120,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  statNumber: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textLight, textTransform: 'uppercase' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  sectionLink: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  emptyState: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyCopy: { fontSize: 14, textAlign: 'center', color: COLORS.textLight },
  courseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  courseGridCompact: { flexDirection: 'column' },
  courseCard: {
    width: '48%',
    minWidth: 280,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  courseCardCompact: { width: '100%', minWidth: 0 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  courseCode: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  ratingBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: `${COLORS.warning}15`,
  },
  ratingBadgeText: { fontSize: 12, color: COLORS.warning, fontWeight: '600' },
  courseName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  courseMeta: { fontSize: 14, color: COLORS.textLight },
  courseActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  primaryButton: {
    minHeight: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    minHeight: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: { color: COLORS.primary, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.card,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalSubtitle: { fontSize: 14, color: COLORS.textLight },
  modalRow: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  modalRowCopy: { gap: 4 },
  modalRowTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  modalRowMeta: { fontSize: 13, color: COLORS.textLight },
  statusGroup: { flexDirection: 'row', gap: SPACING.sm },
  statusButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusButtonText: { color: COLORS.textLight, fontWeight: '700' },
  statusButtonTextActive: { color: '#fff' },
  modalCloseButton: {
    alignSelf: 'flex-end',
    minHeight: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
  },
  modalCloseButtonText: { color: '#fff', fontWeight: '700' },
  selectItem: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectItemText: { fontSize: 15, color: COLORS.text },
  selectedCourse: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm },
  feedbackInput: {
    minHeight: 100,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    textAlignVertical: 'top',
    color: COLORS.text,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: SPACING.md },
  cancelText: { color: COLORS.textLight, fontWeight: '600' },
});
