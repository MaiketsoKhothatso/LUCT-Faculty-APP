import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
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
  assignLecturerToCourse,
  deleteCourseById,
  fetchAllClasses,
  fetchAllCourses,
  fetchAllReports,
  fetchUserProfile,
  fetchUsersByRole,
  saveCourse,
} from '../services/firestore';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../styles/theme';
import { type ClassItem, type Course, type Report, type UserProfile } from '../types';

const EMPTY_FORM = { name: '', code: '', lecturer: '', program: '', stream: '' };

export default function PLDashboard() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [lecturers, setLecturers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
  const [courseForm, setCourseForm] = useState(EMPTY_FORM);

  const filteredCourses = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) =>
      `${course.name} ${course.code ?? ''} ${course.lecturer ?? ''}`.toLowerCase().includes(normalized)
    );
  }, [courses, searchTerm]);

  const loadData = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const [userProfile, courseData, classData, reportData, lecturerData] = await Promise.all([
        fetchUserProfile(currentUser.uid),
        fetchAllCourses(),
        fetchAllClasses(),
        fetchAllReports(),
        fetchUsersByRole('lecturer'),
      ]);
      setProfile(userProfile);
      setCourses(courseData);
      setClasses(classData);
      setReports(reportData.filter((report) => report.authorRole !== 'student'));
      setLecturers(lecturerData);
    } catch (error) {
      console.error('PL dashboard load failed:', error);
      Alert.alert('Loading Error', 'Could not load the program leader dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const exportToExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        filteredCourses.map((course) => ({
          Code: course.code ?? '',
          Name: course.name,
          Lecturer: course.lecturer ?? '',
          Program: course.program ?? '',
          Stream: course.stream ?? '',
        }))
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses');
      XLSX.writeFile(workbook, 'program_courses.xlsx');
    } catch (error) {
      console.error('PL export failed:', error);
      Alert.alert('Export Error', 'This export is not available on this device.');
    }
  };

  const openCourseModal = (course?: Course) => {
    setEditingCourse(course ?? null);
    setCourseForm(
      course
        ? {
            name: course.name,
            code: course.code ?? '',
            lecturer: course.lecturer ?? '',
            program: course.program ?? '',
            stream: course.stream ?? '',
          }
        : EMPTY_FORM
    );
    setCourseModalVisible(true);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.name.trim() || !courseForm.code.trim()) {
      Alert.alert('Missing Course Data', 'Course name and code are required.');
      return;
    }

    try {
      await saveCourse(
        {
          name: courseForm.name.trim(),
          code: courseForm.code.trim(),
          lecturer: courseForm.lecturer.trim() || undefined,
          program: courseForm.program.trim() || undefined,
          stream: courseForm.stream.trim() || undefined,
        },
        editingCourse?.id
      );
      setCourseModalVisible(false);
      setEditingCourse(null);
      setCourseForm(EMPTY_FORM);
      await loadData();
    } catch {
      Alert.alert('Course Error', 'Could not save this course right now.');
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    try {
      await deleteCourseById(course.id);
      await loadData();
    } catch {
      Alert.alert('Delete Error', `Could not delete ${course.name}.`);
    }
  };

  const handleAssignLecturer = async () => {
    if (!selectedCourse || !selectedLecturerId) {
      Alert.alert('Selection Required', 'Choose a lecturer before assigning.');
      return;
    }

    const lecturer = lecturers.find((item) => item.id === selectedLecturerId);
    if (!lecturer) {
      Alert.alert('Lecturer Missing', 'That lecturer could not be found.');
      return;
    }

    try {
      await assignLecturerToCourse(selectedCourse, lecturer);
      setAssignModalVisible(false);
      setSelectedCourse(null);
      setSelectedLecturerId('');
      await loadData();
    } catch {
      Alert.alert('Assignment Error', 'Could not assign this lecturer.');
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading program leader dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Program Leader</Text>
            <Text style={styles.name}>{profile?.name ?? 'Program Lead'}</Text>
            <Text style={styles.subtitle}>{profile?.program ?? 'Program oversight'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={exportToExcel}>
              <MaterialCommunityIcons name="microsoft-excel" size={20} color={COLORS.success} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={logoutUser}>
              <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search program courses"
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
            <MaterialCommunityIcons name="book-multiple-outline" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{courses.length}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="account-tie-outline" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>{lecturers.length}</Text>
            <Text style={styles.statLabel}>Lecturers</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="file-document-multiple-outline" size={24} color={COLORS.warning} />
            <Text style={styles.statNumber}>{reports.length}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => openCourseModal()}>
          <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Course</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Program Courses</Text>
        <View style={[styles.courseGrid, compact && styles.courseGridCompact]}>
          {filteredCourses.map((course) => (
            <View key={course.id} style={[styles.courseCard, compact && styles.courseCardCompact]}>
              <Text style={styles.courseTitle}>
                {course.name} {course.code ? `(${course.code})` : ''}
              </Text>
              <Text style={styles.courseMeta}>{course.lecturer ?? 'Not assigned'}</Text>
              <Text style={styles.courseMeta}>
                {[course.program, course.stream].filter(Boolean).join(' • ') || 'Program not set'}
              </Text>
              <View style={styles.courseActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => openCourseModal(course)}>
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setSelectedCourse(course);
                    setAssignModalVisible(true);
                  }}>
                  <Text style={styles.secondaryButtonText}>Assign</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerButton} onPress={() => handleDeleteCourse(course)}>
                  <Text style={styles.dangerButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Program Classes</Text>
        <View style={styles.classList}>
          {classes.map((classItem) => (
            <View key={classItem.id} style={styles.classRow}>
              <Text style={styles.classTitle}>{classItem.courseName}</Text>
              <Text style={styles.classMeta}>{classItem.time}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={courseModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingCourse ? 'Edit Course' : 'Add Course'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Course name"
              placeholderTextColor={COLORS.textLight}
              value={courseForm.name}
              onChangeText={(value) => setCourseForm((current) => ({ ...current, name: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Course code"
              placeholderTextColor={COLORS.textLight}
              value={courseForm.code}
              onChangeText={(value) => setCourseForm((current) => ({ ...current, code: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Lecturer label"
              placeholderTextColor={COLORS.textLight}
              value={courseForm.lecturer}
              onChangeText={(value) => setCourseForm((current) => ({ ...current, lecturer: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Program"
              placeholderTextColor={COLORS.textLight}
              value={courseForm.program}
              onChangeText={(value) => setCourseForm((current) => ({ ...current, program: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Stream"
              placeholderTextColor={COLORS.textLight}
              value={courseForm.stream}
              onChangeText={(value) => setCourseForm((current) => ({ ...current, stream: value }))}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveCourse}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Lecturer</Text>
            <Text style={styles.modalSubtitle}>{selectedCourse?.name ?? 'Select a course'}</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {lecturers.map((lecturer) => (
                <TouchableOpacity
                  key={lecturer.id}
                  style={[
                    styles.lecturerRow,
                    selectedLecturerId === lecturer.id && styles.lecturerRowActive,
                  ]}
                  onPress={() => setSelectedLecturerId(lecturer.id)}>
                  <Text style={styles.lecturerName}>{lecturer.name}</Text>
                  <Text style={styles.lecturerMeta}>{lecturer.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleAssignLecturer}>
                <Text style={styles.primaryButtonText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xl * 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, marginBottom: SPACING.lg },
  headerCopy: { flex: 1, gap: 4 },
  greeting: { fontSize: 14, color: COLORS.textLight },
  name: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  headerActions: { flexDirection: 'row', gap: SPACING.sm },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    ...SHADOWS.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: 15, color: COLORS.text },
  statsGrid: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
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
  addButton: {
    minHeight: 50,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  addButtonText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  courseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.xl },
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
  courseTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  courseMeta: { fontSize: 14, color: COLORS.textLight },
  courseActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  primaryButton: {
    minHeight: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    minHeight: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${COLORS.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: COLORS.primary, fontWeight: '700' },
  dangerButton: {
    minHeight: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${COLORS.danger}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: { color: COLORS.danger, fontWeight: '700' },
  classList: { gap: SPACING.md },
  classRow: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    gap: 4,
    ...SHADOWS.sm,
  },
  classTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  classMeta: { fontSize: 14, color: COLORS.textLight },
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
  input: {
    minHeight: 50,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: SPACING.md },
  cancelText: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },
  lecturerRow: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 4,
  },
  lecturerRowActive: {
    backgroundColor: `${COLORS.primary}08`,
  },
  lecturerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  lecturerMeta: { fontSize: 13, color: COLORS.textLight },
});
