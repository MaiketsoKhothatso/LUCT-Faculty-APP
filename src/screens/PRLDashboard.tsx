import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import * as XLSX from 'xlsx';
import LoadingSpinner from '../components/LoadingSpinner';
import { logoutUser } from '../services/auth';
import { fetchAllClasses, fetchAllCourses, fetchAllReports } from '../services/firestore';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../styles/theme';
import { ClassItem, Course, Report } from '../types';

export default function PRLDashboard() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [lectures, setLectures] = useState<Record<string, any[]>>({});

  const loadData = async () => {
    try {
      const [c, r, cls] = await Promise.all([fetchAllCourses(), fetchAllReports(), fetchAllClasses()]);
      setAllCourses(c); setFilteredCourses(c); setReports(r); setAllClasses(cls);
      const mockLectures: Record<string, any[]> = {};
      c.forEach(course => {
        mockLectures[course.id] = [
          { day: 'Monday', time: '10:00 AM', location: 'Room 101' },
          { day: 'Wednesday', time: '2:00 PM', location: 'Lab 3' },
        ];
      });
      setLectures(mockLectures);
    } catch { Alert.alert('Error', 'Failed to load data.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    setFilteredCourses(
      searchTerm.trim() === '' ? allCourses : allCourses.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, allCourses]);

  const exportToExcel = (data: Course[]) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data.map(c => ({ Code: c.code, Name: c.name, Lecturer: c.lecturer })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Courses');
      XLSX.writeFile(wb, 'stream_courses.xlsx');
    } catch { Alert.alert('Export Failed'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Principal Lecturer</Text>
          <Text style={styles.name}>FICT Stream</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => exportToExcel(filteredCourses)} style={styles.iconButton}>
            <MaterialCommunityIcons name="microsoft-excel" size={22} color={COLORS.success} />
            <Text style={{color: COLORS.success, fontSize: 12}}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logoutUser} style={styles.iconButton}>
            <MaterialCommunityIcons name="logout" size={22} color={COLORS.danger} />
            <Text style={{color: COLORS.danger, fontSize: 12}}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
        <TextInput style={styles.searchInput} placeholder="Search courses..." value={searchTerm} onChangeText={setSearchTerm} />
        {searchTerm !== '' && <TouchableOpacity onPress={() => setSearchTerm('')}><MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textLight} /></TouchableOpacity>}
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        {/* Monitoring */}
        <View style={styles.monitoringCard}>
          <Text style={styles.monitoringTitle}>Stream Monitoring</Text>
          <View style={styles.monitoringRow}>
            <View style={styles.monitoringItem}><Text style={styles.monitoringValue}>85%</Text><Text style={styles.monitoringLabel}>Attendance</Text></View>
            <View style={styles.monitoringItem}><Text style={styles.monitoringValue}>4.5</Text><Text style={styles.monitoringLabel}>Rating</Text></View>
            <View style={styles.monitoringItem}><Text style={styles.monitoringValue}>{reports.filter(r=>r.status==='pending').length}</Text><Text style={styles.monitoringLabel}>Pending</Text></View>
          </View>
        </View>

        {/* All Stream Courses with Lectures */}
        <Text style={styles.sectionTitle}>All Stream Courses</Text>
        {filteredCourses.map(course => (
          <View key={course.id} style={styles.courseContainer}>
            <TouchableOpacity style={styles.courseHeaderRow} onPress={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)}>
              <View style={{flex:1}}>
                <Text style={styles.courseName}>{course.name} ({course.code})</Text>
                <Text style={styles.courseLecturer}>{course.lecturer}</Text>
              </View>
              <MaterialCommunityIcons name={expandedCourseId === course.id ? 'chevron-up' : 'chevron-down'} size={24} color={COLORS.textLight} />
            </TouchableOpacity>
            {expandedCourseId === course.id && (
              <View style={styles.lecturesContainer}>
                <Text style={styles.lecturesTitle}>Lectures</Text>
                {lectures[course.id]?.map((lec, idx) => (
                  <View key={idx} style={styles.lectureItem}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.lectureText}>{lec.day} {lec.time} - {lec.location}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Classes in Stream */}
        <Text style={styles.sectionTitle}>Classes in Stream</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {allClasses.map(cls => (
            <View key={cls.id} style={styles.classChip}>
              <Text style={styles.classChipCourse}>{cls.courseName}</Text>
              <Text style={styles.classChipTime}>{cls.time}</Text>
              <Text style={styles.classChipStudents}>{cls.studentCount} students</Text>
            </View>
          ))}
        </ScrollView>

        {/* Reports with Feedback */}
        <Text style={styles.sectionTitle}>Lecture Reports</Text>
        {reports.map(r => (
          <View key={r.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>{r.title}</Text>
              <View style={[styles.statusBadge,{backgroundColor: r.status==='pending'?COLORS.warning+'20':COLORS.success+'20'}]}>
                <Text style={{color: r.status==='pending'?COLORS.warning:COLORS.success}}>{r.status}</Text>
              </View>
            </View>
            <Text style={styles.reportAuthor}>From: {r.author}</Text>
            <TouchableOpacity style={styles.feedbackButton} onPress={() => Alert.alert('Feedback', 'Add feedback (demo)')}>
              <MaterialCommunityIcons name="message-reply-text" size={16} color={COLORS.primary} />
              <Text style={styles.feedbackButtonText}>Add Feedback</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
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
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.md, marginTop: SPACING.lg },
  monitoringCard: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.xl },
  monitoringTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: SPACING.md },
  monitoringRow: { flexDirection: 'row', justifyContent: 'space-around' },
  monitoringItem: { alignItems: 'center' },
  monitoringValue: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  monitoringLabel: { fontSize: 12, color: '#fff', opacity: 0.8 },
  courseContainer: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, ...SHADOWS.sm },
  courseHeaderRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  courseName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  courseLecturer: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  lecturesContainer: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  lecturesTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: SPACING.sm },
  lectureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  lectureText: { fontSize: 13, color: COLORS.textLight, marginLeft: SPACING.sm },
  horizontalScroll: { marginBottom: SPACING.xl },
  classChip: { backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginRight: SPACING.md, width: 150, ...SHADOWS.sm },
  classChipCourse: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  classChipTime: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  classChipStudents: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  reportCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  reportTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  reportAuthor: { fontSize: 14, color: COLORS.textLight, marginBottom: SPACING.md },
  feedbackButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: COLORS.primary+'10', borderRadius: 20 },
  feedbackButtonText: { marginLeft: 6, color: COLORS.primary, fontWeight: '500' },
});