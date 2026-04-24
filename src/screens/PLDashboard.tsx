import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert, Modal, RefreshControl, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as XLSX from 'xlsx';
import LoadingSpinner from '../components/LoadingSpinner';
import { db } from '../config/firebase';
import { logoutUser } from '../services/auth';
import {
  fetchAllClasses,
  fetchAllCourses,
  fetchAllReports,
} from '../services/firestore';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../styles/theme';
import { ClassItem, Course, Report } from '../types';

interface Lecturer {
  id: string;
  name: string;
  email: string;
}

export default function PLDashboard() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({ name: '', code: '', lecturer: '' });

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLecturerId, setSelectedLecturerId] = useState('');

  const loadData = async () => {
    try {
      const [coursesData, reportsData, classesData] = await Promise.all([
        fetchAllCourses(),
        fetchAllReports(),
        fetchAllClasses(),
      ]);
      setAllCourses(coursesData);
      setFilteredCourses(coursesData);
      setReports(reportsData);
      setAllClasses(classesData);

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'lecturer'));
      const snapshot = await getDocs(q);
      const lecList: Lecturer[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        lecList.push({ id: doc.id, name: data.name || data.email, email: data.email });
      });
      setLecturers(lecList);
    } catch {
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
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
      XLSX.writeFile(wb, 'program_courses.xlsx');
    } catch { Alert.alert('Export Failed'); }
  };

  const handleSaveCourse = async () => {
    if (!courseForm.name || !courseForm.code) {
      Alert.alert('Error', 'Name and code required');
      return;
    }
    try {
      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), courseForm);
        Alert.alert('Success', 'Course updated');
      } else {
        await addDoc(collection(db, 'courses'), { ...courseForm, program: 'FICT', stream: 'FICT' });
        Alert.alert('Success', 'Course added');
      }
      setCourseModalVisible(false);
      setEditingCourse(null);
      setCourseForm({ name: '', code: '', lecturer: '' });
      loadData();
    } catch { Alert.alert('Error', 'Could not save course'); }
  };

  const handleDeleteCourse = async (course: Course) => {
    Alert.alert('Confirm', `Delete ${course.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, 'courses', course.id));
          loadData();
        }
      },
    ]);
  };

  const handleAssignLecturer = async () => {
    if (!selectedCourse || !selectedLecturerId) return;
    const lecturer = lecturers.find(l => l.id === selectedLecturerId);
    await updateDoc(doc(db, 'courses', selectedCourse.id), { lecturer: lecturer?.name });
    Alert.alert('Success', `Assigned ${lecturer?.name} to ${selectedCourse.name}`);
    setAssignModalVisible(false);
    loadData();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Program Leader</Text>
          <Text style={styles.name}>FICT Program</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => exportToExcel(filteredCourses)} style={styles.iconButton}>
            <MaterialCommunityIcons name="microsoft-excel" size={22} color={COLORS.success} />
            <Text style={{ fontSize: 12, color: COLORS.success, marginLeft: 4 }}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logoutUser} style={styles.iconButton}>
            <MaterialCommunityIcons name="logout" size={22} color={COLORS.danger} />
            <Text style={{ fontSize: 12, color: COLORS.danger, marginLeft: 4 }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
        <TextInput style={styles.searchInput} placeholder="Search courses..." value={searchTerm} onChangeText={setSearchTerm} />
        {searchTerm !== '' && <TouchableOpacity onPress={() => setSearchTerm('')}><MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textLight} /></TouchableOpacity>}
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><MaterialCommunityIcons name="book-multiple" size={24} color={COLORS.primary} /><Text style={styles.statNumber}>{allCourses.length}</Text><Text style={styles.statLabel}>Courses</Text></View>
          <View style={styles.statCard}><MaterialCommunityIcons name="account-tie" size={24} color={COLORS.success} /><Text style={styles.statNumber}>{lecturers.length}</Text><Text style={styles.statLabel}>Lecturers</Text></View>
          <View style={styles.statCard}><MaterialCommunityIcons name="file-chart" size={24} color={COLORS.danger} /><Text style={styles.statNumber}>{reports.length}</Text><Text style={styles.statLabel}>Reports</Text></View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => { setEditingCourse(null); setCourseForm({ name: '', code: '', lecturer: '' }); setCourseModalVisible(true); }}>
          <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add New Course</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Program Courses</Text>
          <TouchableOpacity onPress={() => exportToExcel(filteredCourses)}><Text style={styles.exportText}>Export</Text></TouchableOpacity>
        </View>
        {filteredCourses.map(course => (
          <View key={course.id} style={styles.courseCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseName}>{course.name} ({course.code})</Text>
              <Text style={styles.courseLecturer}>{course.lecturer || 'Not assigned'}</Text>
            </View>
            <View style={styles.courseActions}>
              <TouchableOpacity onPress={() => { setEditingCourse(course); setCourseForm({ name: course.name, code: course.code || '', lecturer: course.lecturer || '' }); setCourseModalVisible(true); }}>
                <MaterialCommunityIcons name="pencil" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteCourse(course)}>
                <MaterialCommunityIcons name="delete" size={20} color={COLORS.danger} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.assignButton} onPress={() => { setSelectedCourse(course); setAssignModalVisible(true); }}>
                <Text style={styles.assignButtonText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Program Classes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {allClasses.map(cls => (
            <View key={cls.id} style={styles.classChip}>
              <Text style={styles.classChipCourse}>{cls.courseName}</Text>
              <Text style={styles.classChipTime}>{cls.time}</Text>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Reports from PRLs</Text>
        {reports.slice(0, 5).map(r => (
          <TouchableOpacity key={r.id} style={styles.reportItem}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color={COLORS.primary} />
            <View style={styles.reportContent}><Text style={styles.reportTitle}>{r.title}</Text><Text style={styles.reportMeta}>{r.author} • {r.status}</Text></View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Course Modal */}
      <Modal visible={courseModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingCourse ? 'Edit Course' : 'Add Course'}</Text>
            <TextInput style={styles.modalInput} placeholder="Course Name" value={courseForm.name} onChangeText={t => setCourseForm({ ...courseForm, name: t })} />
            <TextInput style={styles.modalInput} placeholder="Course Code" value={courseForm.code} onChangeText={t => setCourseForm({ ...courseForm, code: t })} />
            <TextInput style={styles.modalInput} placeholder="Lecturer (optional)" value={courseForm.lecturer} onChangeText={t => setCourseForm({ ...courseForm, lecturer: t })} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSaveCourse}><Text style={styles.submitText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Lecturer Modal */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Lecturer</Text>
            <Text style={styles.modalLabel}>Course: {selectedCourse?.name}</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {lecturers.map(lec => (
                <TouchableOpacity key={lec.id} style={[styles.lecturerItem, selectedLecturerId === lec.id && styles.lecturerItemActive]} onPress={() => setSelectedLecturerId(lec.id)}>
                  <Text>{lec.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleAssignLecturer}><Text style={styles.submitText}>Assign</Text></TouchableOpacity>
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
  addButton: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl },
  addButtonText: { color: '#fff', fontWeight: '600', marginLeft: SPACING.sm },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.md, marginTop: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  exportText: { color: COLORS.primary, fontWeight: '500' },
  courseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  courseName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  courseLecturer: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  courseActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  assignButton: { backgroundColor: COLORS.primary+'10', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 20 },
  assignButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 12 },
  horizontalScroll: { marginBottom: SPACING.xl },
  classChip: { backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginRight: SPACING.md, width: 140, ...SHADOWS.sm },
  classChipCourse: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  classChipTime: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  reportItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  reportContent: { flex: 1, marginLeft: SPACING.md },
  reportTitle: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  reportMeta: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { backgroundColor: '#fff', borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.lg },
  modalLabel: { fontSize: 14, color: COLORS.textLight, marginBottom: SPACING.md },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: SPACING.sm },
  cancelText: { color: COLORS.textLight, marginRight: SPACING.lg, paddingVertical: SPACING.sm },
  submitButton: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: 20 },
  submitText: { color: '#fff', fontWeight: '600' },
  lecturerItem: { padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  lecturerItemActive: { backgroundColor: COLORS.primary+'10' },
});