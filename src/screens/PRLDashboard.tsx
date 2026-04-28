import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  fetchAllClasses,
  fetchAllCourses,
  fetchAllReports,
  fetchAttendanceByClass,
  fetchRatings,
  fetchUserProfile,
} from '../services/firestore';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../styles/theme';
import { type ClassItem, type Course, type Report, type UserProfile } from '../types';

export default function PRLDashboard() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

  const filteredCourses = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) =>
      `${course.name} ${course.code ?? ''} ${course.lecturer ?? ''}`.toLowerCase().includes(normalized)
    );
  }, [courses, searchTerm]);

  const classGroups = useMemo(() => {
    return classes.reduce<Record<string, ClassItem[]>>((acc, classItem) => {
      const key = classItem.courseId ?? classItem.courseName;
      if (!acc[key]) acc[key] = [];
      acc[key].push(classItem);
      return acc;
    }, {});
  }, [classes]);

  const loadData = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const [userProfile, courseData, classData, reportData, ratingData] = await Promise.all([
        fetchUserProfile(currentUser.uid),
        fetchAllCourses(),
        fetchAllClasses(),
        fetchAllReports(),
        fetchRatings(),
      ]);

      const attendanceSamples = await Promise.all(classData.slice(0, 12).map((classItem) => fetchAttendanceByClass(classItem.id)));
      const attendanceRecords = attendanceSamples.flat();
      const presentLike = attendanceRecords.filter((record) => record.status !== 'absent').length;

      setProfile(userProfile);
      setCourses(courseData);
      setClasses(classData);
      setReports(reportData.filter((report) => report.authorRole === 'lecturer' || report.authorRole === 'prl'));
      setAttendanceRate(attendanceRecords.length ? Math.round((presentLike / attendanceRecords.length) * 100) : 0);
      setAverageRating(
        ratingData.length
          ? Number((ratingData.reduce((sum, rating) => sum + rating.rating, 0) / ratingData.length).toFixed(1))
          : 0
      );
    } catch (error) {
      console.error('PRL dashboard load failed:', error);
      Alert.alert('Loading Error', 'Could not load the principal lecturer dashboard.');
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
          Classes: classGroups[course.id]?.length ?? 0,
        }))
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses');
      XLSX.writeFile(workbook, 'stream_courses.xlsx');
    } catch (error) {
      console.error('PRL export failed:', error);
      Alert.alert('Export Error', 'This export is not available on this device.');
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading principal lecturer dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Principal Lecturer</Text>
            <Text style={styles.name}>{profile?.name ?? 'Stream Lead'}</Text>
            <Text style={styles.subtitle}>{profile?.stream ?? 'Faculty stream overview'}</Text>
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
            placeholder="Search stream courses"
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
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{courses.length}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="calendar-check-outline" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>{attendanceRate}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="star-outline" size={24} color={COLORS.warning} />
            <Text style={styles.statNumber}>{averageRating || '-'}</Text>
            <Text style={styles.statLabel}>Avg rating</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Stream Courses</Text>
        <View style={[styles.courseGrid, compact && styles.courseGridCompact]}>
          {filteredCourses.map((course) => (
            <View key={course.id} style={[styles.courseCard, compact && styles.courseCardCompact]}>
              <Text style={styles.courseTitle}>{course.name}</Text>
              <Text style={styles.courseMeta}>{course.code ?? 'No code'}</Text>
              <Text style={styles.courseMeta}>{course.lecturer ?? 'Lecturer not assigned'}</Text>
              <View style={styles.chipRow}>
                {(classGroups[course.id] ?? []).map((classItem) => (
                  <View key={classItem.id} style={styles.classChip}>
                    <Text style={styles.classChipText}>{classItem.time}</Text>
                  </View>
                ))}
                {!classGroups[course.id]?.length && (
                  <View style={styles.classChip}>
                    <Text style={styles.classChipText}>No class schedule</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Reports</Text>
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No reports available</Text>
            <Text style={styles.emptyCopy}>Reports from lecturers and PRLs will appear here.</Text>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportStatus}>{report.status ?? 'pending'}</Text>
              </View>
              <Text style={styles.reportMeta}>
                {report.author ?? 'Unknown author'} • {report.authorRole ?? 'lecturer'}
              </Text>
              <Text style={styles.reportCopy}>{report.content || 'No details provided.'}</Text>
            </View>
          ))
        )}
      </ScrollView>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  classChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: `${COLORS.primary}10`,
  },
  classChipText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  emptyState: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.card,
    padding: SPACING.xl,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyCopy: { fontSize: 14, color: COLORS.textLight },
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
  reportMeta: { fontSize: 13, color: COLORS.textLight },
  reportCopy: { fontSize: 14, lineHeight: 20, color: COLORS.textLight },
});
