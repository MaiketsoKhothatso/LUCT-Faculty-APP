import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert, Modal, Platform, RefreshControl, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as XLSX from 'xlsx';
import LoadingSpinner from '../components/LoadingSpinner';
import { auth, db } from '../config/firebase';
import { logoutUser } from '../services/auth';
import { fetchAllClasses, fetchAllCourses, fetchAllReports } from '../services/firestore';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../styles/theme';
import { ClassItem, Course, Report } from '../types';

interface Student {
  id: string;
  name: string;
  email: string;
}

export default function LecturerDashboard() {
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportContent, setNewReportContent] = useState('');

  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, 'present' | 'absent' | 'late'>>({});

  const loadData = async () => {
    try {
      const [classesData, reportsData, coursesData] = await Promise.all([
        fetchAllClasses(),
        fetchAllReports(),
        fetchAllCourses(),
      ]);
      const currentUid = auth.currentUser?.uid;
      const lecturerClasses = currentUid
        ? classesData.filter(c => (c as any).lecturerId === currentUid)
        : classesData;
      setAllClasses(lecturerClasses);
      setFilteredClasses(lecturerClasses);
      setReports(reportsData.filter(r => r.authorRole === 'lecturer'));
      setCourses(coursesData);
    } catch {
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    setFilteredClasses(
      searchTerm.trim() === ''
        ? allClasses
        : allClasses.filter(c => c.courseName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, allClasses]);

  const handleAddReport = async () => {
    if (!newReportTitle.trim()) {
      Alert.alert('Error', 'Title required');
      return;
    }
    try {
      await addDoc(collection(db, 'reports'), {
        title: newReportTitle,
        content: newReportContent,
        status: 'pending',
        author: auth.currentUser?.email || 'Lecturer',
        authorRole: 'lecturer',
        createdAt: new Date(),
      });
      Alert.alert('Success', 'Report submitted');
      setReportModalVisible(false);
      setNewReportTitle('');
      setNewReportContent('');
      loadData();
    } catch {
      Alert.alert('Error', 'Could not submit report');
    }
  };

  const loadStudentsForClass = async (classId: string) => {
    const mockStudents: Student[] = [
      { id: '1', name: 'John Doe', email: 'john@student.luct.ac.ls' },
      { id: '2', name: 'Jane Smith', email: 'jane@student.luct.ac.ls' },
      { id: '3', name: 'Michael Brown', email: 'michael@student.luct.ac.ls' },
    ];
    setStudents(mockStudents);
    const initialStatus: Record<string, 'present' | 'absent' | 'late'> = {};
    mockStudents.forEach(s => { initialStatus[s.id] = 'present'; });
    setAttendanceStatus(initialStatus);
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass) return;
    try {
      const batch = [];
      for (const studentId in attendanceStatus) {
        batch.push(addDoc(collection(db, 'attendance'), {
          classId: selectedClass.id,
          courseName: selectedClass.courseName,
          studentId,
          date: attendanceDate.toISOString().split('T')[0],
          status: attendanceStatus[studentId],
          markedBy: auth.currentUser?.uid,
          createdAt: new Date(),
        }));
      }
      await Promise.all(batch);
      Alert.alert('Success', 'Attendance saved');
      setAttendanceModalVisible(false);
      setSelectedClass(null);
    } catch {
      Alert.alert('Error', 'Could not save attendance');
    }
  };

  const exportToExcel = (data: ClassItem[]) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data.map(c => ({ Course: c.courseName, Time: c.time, Students: c.studentCount })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Classes');
      XLSX.writeFile(wb, 'my_classes.xlsx');
    } catch {
      Alert.alert('Export Failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.name}>Lecturer</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => exportToExcel(filteredClasses)} style={styles.iconButton}>
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
        <TextInput style={styles.searchInput} placeholder="Search classes..." value={searchTerm} onChangeText={setSearchTerm} />
        {searchTerm !== '' && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="school" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{allClasses.length}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="account-group" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>{allClasses.reduce((s, c) => s + c.studentCount, 0)}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="file-document" size={24} color={COLORS.danger} />
            <Text style={styles.statNumber}>{reports.length}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (allClasses[0]) {
                setSelectedClass(allClasses[0]);
                loadStudentsForClass(allClasses[0].id);
                setAttendanceModalVisible(true);
              }
            }}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={22} color={COLORS.primary} />
            <Text style={styles.actionText}>Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setReportModalVisible(true)}>
            <MaterialCommunityIcons name="note-plus" size={22} color={COLORS.primary} />
            <Text style={styles.actionText}>New Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="chart-bar" size={22} color={COLORS.primary} />
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Classes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Classes</Text>
          <TouchableOpacity onPress={() => exportToExcel(filteredClasses)}>
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>
        {filteredClasses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="book-remove" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No classes</Text>
          </View>
        ) : (
          filteredClasses.map(cls => (
            <View key={cls.id} style={styles.classCard}>
              <View style={styles.classTime}>
                <Text style={styles.timeText}>{cls.time}</Text>
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{cls.courseName}</Text>
                <Text style={styles.classDetails}>{cls.studentCount} Students</Text>
              </View>
              <TouchableOpacity
                style={styles.actionChip}
                onPress={() => {
                  setSelectedClass(cls);
                  loadStudentsForClass(cls.id);
                  setAttendanceModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="account-check" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Monitoring */}
        <Text style={styles.sectionTitle}>Monitoring</Text>
        <View style={styles.monitoringCard}>
          <View style={styles.monitoringRow}>
            <View style={styles.monitoringItem}>
              <Text style={styles.monitoringValue}>82%</Text>
              <Text style={styles.monitoringLabel}>Avg Attendance</Text>
            </View>
            <View style={styles.monitoringItem}>
              <Text style={styles.monitoringValue}>4.3</Text>
              <Text style={styles.monitoringLabel}>Avg Rating</Text>
            </View>
            <View style={styles.monitoringItem}>
              <Text style={styles.monitoringValue}>{reports.filter(r => r.status === 'pending').length}</Text>
              <Text style={styles.monitoringLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Reports */}
        <Text style={styles.sectionTitle}>My Reports</Text>
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No reports</Text>
          </View>
        ) : (
          reports.map(r => (
            <TouchableOpacity key={r.id} style={styles.reportItem}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color={COLORS.primary} />
              <View style={styles.reportContent}>
                <Text style={styles.reportTitle}>{r.title}</Text>
                <Text style={styles.reportMeta}>{r.status}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* New Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Report</Text>
            <TextInput style={styles.modalInput} placeholder="Title" value={newReportTitle} onChangeText={setNewReportTitle} />
            <TextInput style={[styles.modalInput, { minHeight: 80 }]} placeholder="Content" multiline value={newReportContent} onChangeText={setNewReportContent} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleAddReport}>
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Attendance Modal */}
      <Modal visible={attendanceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Take Attendance</Text>
            <Text style={styles.modalLabel}>Class: {selectedClass?.courseName}</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
              <Text>{attendanceDate.toDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={attendanceDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setAttendanceDate(date);
                }}
              />
            )}
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={() => {
                const newStatus = { ...attendanceStatus };
                Object.keys(newStatus).forEach(k => (newStatus[k] = 'present'));
                setAttendanceStatus(newStatus);
              }}
            >
              <Text style={{ color: COLORS.primary }}>Mark All Present</Text>
            </TouchableOpacity>
            <ScrollView style={{ maxHeight: 300 }}>
              {students.map(student => (
                <View key={student.id} style={styles.studentRow}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <View style={styles.attendanceActions}>
                    {(['present', 'absent', 'late'] as const).map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusButton, attendanceStatus[student.id] === s && styles.statusActive]}
                        onPress={() => setAttendanceStatus({ ...attendanceStatus, [student.id]: s })}
                      >
                        <Text style={attendanceStatus[student.id] === s ? styles.statusTextActive : styles.statusText}>
                          {s[0].toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setAttendanceModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSaveAttendance}>
                <Text style={styles.submitText}>Save</Text>
              </TouchableOpacity>
            </View>
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
  actionButton: { alignItems: 'center', backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, width: 100, ...SHADOWS.sm },
  actionText: { fontSize: 12, color: COLORS.text, marginTop: SPACING.xs },
  classCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  classTime: { backgroundColor: COLORS.primary+'10', padding: 10, borderRadius: BORDER_RADIUS.md, marginRight: SPACING.md },
  timeText: { fontWeight: '600', color: COLORS.primary },
  classInfo: { flex: 1 },
  className: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  classDetails: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  actionChip: { marginLeft: SPACING.sm },
  monitoringCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.xl, ...SHADOWS.sm },
  monitoringRow: { flexDirection: 'row', justifyContent: 'space-around' },
  monitoringItem: { alignItems: 'center' },
  monitoringValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  monitoringLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  reportItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  reportContent: { flex: 1, marginLeft: SPACING.md },
  reportTitle: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  reportMeta: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, color: COLORS.textLight, marginTop: SPACING.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { backgroundColor: '#fff', borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.lg },
  modalLabel: { fontSize: 14, color: COLORS.textLight, marginBottom: SPACING.md },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: SPACING.sm },
  cancelText: { color: COLORS.textLight, marginRight: SPACING.lg, paddingVertical: SPACING.sm },
  submitButton: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: 20 },
  submitText: { color: '#fff', fontWeight: '600' },
  dateButton: { padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.md },
  markAllButton: { alignSelf: 'flex-end', marginBottom: SPACING.md },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  studentName: { fontSize: 15, color: COLORS.text },
  attendanceActions: { flexDirection: 'row', gap: SPACING.sm },
  statusButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  statusActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusText: { color: COLORS.textLight, fontWeight: '600' },
  statusTextActive: { color: '#fff', fontWeight: '600' },
});