import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
}

const CourseCard: React.FC<CourseCardProps> = ({ course }) => (
  <View style={styles.card}>
    <Text style={styles.title}>{course.name}</Text>
    <Text style={styles.detail}>Code: {course.code || 'N/A'}</Text>
    <Text style={styles.detail}>Lecturer: {course.lecturer || 'TBA'}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    color: '#2c3e50',
  },
  detail: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
});

export default CourseCard;