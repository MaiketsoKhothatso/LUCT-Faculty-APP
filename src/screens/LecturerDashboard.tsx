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
  createReport,
  fetchAttendanceByClass,
  fetchLecturerClasses,
  fetchRatings,
  fetchReportsByAuthor,
  fetchStudentsForClass,
  fetchUserProfile,
  saveAttendanceRecord,
} from '../services/firestore';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../styles/theme';
import {
  type AttendanceRecord,
  type AttendanceStatus,
  type ClassItem,
  type Report,
  type UserProfile,
} from '../types';

export default function LecturerDashboard() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportContent, setNewReportContent] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, AttendanceStatus>>({});
  const [averageClassRating, setAverageClassRating] = useState(0);

  const filteredClasses = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return classes;
    return classes.filter((classItem) =>
      `${classItem.courseName} ${classItem.time}`.toLowerCase().includes(normalized)
    );
  }, [classes, searchTerm]);

  const averageAttendance = useMemo(() => {
    if (!attendanceRecords.length) return 0;
    const presentLike = attendanceRecords.filter((record) => record.status !== 'absent').length;
    return Math.round((presentLike / attendanceRecords.length) * 100);
  }, [attendanceRecords]);

  const loadData = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userProfile = await fetchUserProfile(currentUser.uid);
      if (!userProfile) {
        Alert.alert('Profile Missing', 'Your lecturer profile could not be found.');
        setLoading(false);
        return;
      }

      const lecturerClasses = await fetchLecturerClasses(userProfile);
      const reportsData = await fetchReportsByAuthor(userProfile.id);
      const ratings = await fetchRatings();
      const classAttendance = selectedClass
        ? await fetchAttendanceByClass(selectedClass.id, attendanceDate)
        : lecturerClasses.length
          ? await fetchAttendanceByClass(lecturerClasses[0].id, attendanceDate)
          : [];

      const ratingValues = ratings.filter((rating) =>
        lecturerClasses.some((classItem) => classItem.courseId === rating.courseId || classItem.id === rating.courseId)
      );

      const ratingAverage = ratingValues.length
        ? Number(
            (
              ratingValues.reduce((sum, rating) => sum + rating.rating, 0) / ratingValues.length
            ).toFixed(1)
          )
        : 0;

      setProfile(userProfile);
      setClasses(lecturerClasses);
      setReports(reportsData);
      setAttendanceRecords(classAttendance);
      setAverageClassRating(ratingAverage);
    } catch (error) {
      console.error('Lecturer dashboard load failed:', error);
      Alert.alert('Loading Error', 'Could not load the lecturer dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [attendanceDate, selectedClass]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedClass) return;

    const loadAttendanceContext = async () => {
      try {
        const [studentsForClass, savedAttendance] = await Promise.all([
          fetchStudentsForClass(selectedClass),
          fetchAttendanceByClass(selectedClass.id, attendanceDate),
        ]);
        setStudents(studentsForClass);
        setAttendanceRecords(savedAttendance);
        setAttendanceStatus(
          studentsForClass.reduce<Record<string, AttendanceStatus>>((acc, student) => {
            const existing = savedAttendance.find((record) => record.studentId === student.id);
            acc[student.id] = existing?.status ?? 'present';
            return acc;
          }, {})
        );
      } catch (error) {
        console.error('Attendance context load failed:', error);
        Alert.alert('Attendance Error', 'Could not load class attendance data.');
      }
    };

    loadAttendanceContext();
  }, [attendanceDate, selectedClass]);

  const exportToExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        filteredClasses.map((classItem) => ({
          Course: classItem.courseName,
          Time: classItem.time,
          Students: classItem.studentCount,
        }))
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Classes');
      XLSX.writeFile(workbook, 'lecturer_classes.xlsx');
    } catch (error) {
      console.error('Lecturer export failed:', error);
      Alert.alert('Export Error', 'This export is not available on this device.');
    }
  };

  const handleAddReport = async () => {
    if (!profile || !newReportTitle.trim()) {
      Alert.alert('Missing Report Data', 'Please enter a report title before submitting.');
      return;
    }

    try {
      await createReport({
        title: newReportTitle.trim(),
        content: newReportContent.trim(),
        status: 'pending',
        author: profile.name,
        authorEmail: profile.email,
        authorId: profile.id,
        authorRole: 'lecturer',
      });
      Alert.alert('Report Sent', 'Your report was submitted successfully.');
      setNewReportTitle('');
      setNewReportContent('');
      setReportModalVisible(false);
      await loadData();
    } catch {
      Alert.alert('Report Error', 'Could not submit this report right now.');
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass || !profile) return;

    try {
      await Promise.all(
        students.map((student) =>
          saveAttendanceRecord({
            classId: selectedClass.id,
            courseId: selectedClass.courseId ?? selectedClass.id,
            courseName: selectedClass.courseName,
            date: attendanceDate,
            markedBy: profile.id,
            status: attendanceStatus[student.id] ?? 'present',
            studentId: student.id,
            studentName: student.name,
          })
        )
      );
      Alert.alert('Attendance Saved', 'Attendance has been updated for this class.');
      setAttendanceModalVisible(false);
      await loadData();
    } catch {
      Alert.alert('Attendance Error', 'Could not save attendance for this class.');
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading lecturer dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Lecturer Workspace</Text>
            <Text style={styles.name}>{profile?.name ?? 'Lecturer'}</Text>
            <Text style={styles.subtitle}>{profile?.email ?? ''}</Text>
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
            placeholder="Search your classes"
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
            <MaterialCommunityIcons name="school-outline" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{classes.length}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="calendar-check-outline" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>{averageAttendance}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="star-outline" size={24} color={COLORS.warning} />
            <Text style={styles.statNumber}>{averageClassRating || '-'}</Text>
            <Text style={styles.statLabel}>Avg rating</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => {
              const firstClass = classes[0];
              if (!firstClass) {
                Alert.alert('No Classes', 'Create or assign classes before taking attendance.');
                return;
              }
              setSelectedClass(firstClass);
              setAttendanceModalVisible(true);
            }}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Take Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => setReportModalVisible(true)}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={20} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Submit Report</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>My Classes</Text>
        {filteredClasses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No classes assigned yet</Text>
            <Text style={styles.emptyCopy}>Once courses are assigned to you, they will appear here.</Text>
          </View>
        ) : (
          <View style={[styles.cardGrid, compact && styles.cardGridCompact]}>
            {filteredClasses.map((classItem) => (
              <View key={classItem.id} style={[styles.classCard, compact && styles.classCardCompact]}>
                <Text style={styles.classTitle}>{classItem.courseName}</Text>
                <Text style={styles.classMeta}>{classItem.time}</Text>
                <Text style={styles.classMeta}>{classItem.studentCount} students</Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    setSelectedClass(classItem);
                    setAttendanceModalVisible(true);
                  }}>
                  <Text style={styles.primaryButtonText}>Open Attendance</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>My Reports</Text>
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No reports submitted yet</Text>
            <Text style={styles.emptyCopy}>Use the report action above to send your first lecturer report.</Text>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportStatus}>{report.status ?? 'pending'}</Text>
              </View>
              <Text style={styles.reportCopy}>{report.content || 'No extra details supplied.'}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Lecturer Report</Text>
            <TextInput
              style={styles.input}
              placeholder="Report title"
              placeholderTextColor={COLORS.textLight}
              value={newReportTitle}
              onChangeText={setNewReportTitle}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              placeholder="Report details"
              placeholderTextColor={COLORS.textLight}
              value={newReportContent}
              onChangeText={setNewReportContent}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleAddReport}>
                <Text style={styles.primaryButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={attendanceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: compact ? '90%' : '82%' }]}>
            <Text style={styles.modalTitle}>Class Attendance</Text>
            <Text style={styles.modalSubtitle}>{selectedClass?.courseName ?? 'Select a class'}</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textLight}
              value={attendanceDate}
              onChangeText={setAttendanceDate}
            />
            <ScrollView>
              {students.map((student) => (
                <View key={student.id} style={styles.attendanceRow}>
                  <View style={styles.attendanceCopy}>
                    <Text style={styles.attendanceName}>{student.name}</Text>
                    <Text style={styles.attendanceEmail}>{student.email}</Text>
                  </View>
                  <View style={styles.statusGroup}>
                    {(['present', 'late', 'absent'] as AttendanceStatus[]).map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusButton,
                          attendanceStatus[student.id] === status && styles.statusButtonActive,
                        ]}
                        onPress={() => setAttendanceStatus((current) => ({ ...current, [student.id]: status }))}>
                        <Text
                          style={[
                            styles.statusButtonText,
                            attendanceStatus[student.id] === status && styles.statusButtonTextActive,
                          ]}>
                          {status[0].toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setAttendanceModalVisible(false)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveAttendance}>
                <Text style={styles.primaryButtonText}>Save</Text>
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
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.xl },
  quickAction: {
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  quickActionText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  emptyState: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.card,
    padding: SPACING.xl,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyCopy: { fontSize: 14, color: COLORS.textLight },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.xl },
  cardGridCompact: { flexDirection: 'column' },
  classCard: {
    width: '48%',
    minWidth: 280,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  classCardCompact: { width: '100%', minWidth: 0 },
  classTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  classMeta: { fontSize: 14, color: COLORS.textLight },
  primaryButton: {
    minHeight: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  reportCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  reportTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  reportStatus: { color: COLORS.primary, fontWeight: '600', textTransform: 'capitalize' },
  reportCopy: { fontSize: 14, color: COLORS.textLight, lineHeight: 20 },
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
  textArea: { minHeight: 110, textAlignVertical: 'top', paddingVertical: SPACING.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: SPACING.md },
  cancelText: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },
  attendanceRow: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  attendanceCopy: { gap: 2 },
  attendanceName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  attendanceEmail: { fontSize: 13, color: COLORS.textLight },
  statusGroup: { flexDirection: 'row', gap: SPACING.sm },
  statusButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusButtonText: { color: COLORS.textLight, fontWeight: '700' },
  statusButtonTextActive: { color: '#fff' },
});
