import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ClassItem, Course, Report } from '../types';

export const seedFirestore = async () => {
  const batch = writeBatch(db);

  const courses: Omit<Course, 'id'>[] = [
    // FABE Stream
    { name: 'Structural Design', code: 'FABE101', lecturer: 'Mr. Teboho Ntsaba', program: 'FABE', stream: 'FABE' },
    { name: 'Construction Management', code: 'FABE102', lecturer: 'Ms. Mapallo Monoko', program: 'FABE', stream: 'FABE' },
    { name: 'Building Materials', code: 'FABE103', lecturer: 'Mr. Ramohlaboli Khotle', program: 'FABE', stream: 'FABE' },
    
    // FBMG Stream
    { name: 'Financial Accounting', code: 'FBMG201', lecturer: 'Mr. Hlabathe Posholi', program: 'FBMG', stream: 'FBMG' },
    { name: 'Business Strategy', code: 'FBMG202', lecturer: 'Ms. Khopotso Molati', program: 'FBMG', stream: 'FBMG' },
    { name: 'Marketing Management', code: 'FBMG203', lecturer: 'Adv. Kelebone Fosa', program: 'FBMG', stream: 'FBMG' },
    
    // FCTH Stream
    { name: 'Hospitality Operations', code: 'FCTH301', lecturer: 'Mr. Sebinane Lekoekoe', program: 'FCTH', stream: 'FCTH' },
    { name: 'Tourism Planning', code: 'FCTH302', lecturer: 'Ms. Maletela Lehaha', program: 'FCTH', stream: 'FCTH' },
    { name: 'Event Management', code: 'FCTH303', lecturer: 'Dr. Ngonidzashe Makwindi', program: 'FCTH', stream: 'FCTH' },
    
    // FDI Stream
    { name: 'Graphic Design', code: 'FDI401', lecturer: 'Mr. Molemo Tsoeu', program: 'FDI', stream: 'FDI' },
    { name: 'Interior Design', code: 'FDI402', lecturer: 'Mrs. Maseabata Telite', program: 'FDI', stream: 'FDI' },
    { name: 'Fashion Design', code: 'FDI403', lecturer: 'Mrs. Makamohelo Liname', program: 'FDI', stream: 'FDI' },
    
    // FICT Stream
    { name: 'Mobile App Development', code: 'FICT501', lecturer: 'Mrs. Diana Moopisa', program: 'FICT', stream: 'FICT' },
    { name: 'Database Systems', code: 'FICT502', lecturer: 'Mr. Kapela Morutwa', program: 'FICT', stream: 'FICT' },
    { name: 'Network Security', code: 'FICT503', lecturer: 'Mr. Tsietsi Matjele', program: 'FICT', stream: 'FICT' },
  ];

  courses.forEach((course) => {
    const ref = doc(collection(db, 'courses'));
    batch.set(ref, course);
  });

  const classes: Omit<ClassItem, 'id'>[] = [
    // FABE
    { courseName: 'Structural Design', time: 'Mon 09:00 AM', studentCount: 25, lecturerId: 'Ntsaba' },
    { courseName: 'Construction Management', time: 'Tue 11:00 AM', studentCount: 30, lecturerId: 'Monoko' },
    // FBMG
    { courseName: 'Financial Accounting', time: 'Wed 10:00 AM', studentCount: 40, lecturerId: 'Posholi' },
    { courseName: 'Business Strategy', time: 'Thu 02:00 PM', studentCount: 35, lecturerId: 'Molati' },
    // FCTH
    { courseName: 'Hospitality Operations', time: 'Mon 01:00 PM', studentCount: 20, lecturerId: 'Lekoekoe' },
    { courseName: 'Event Management', time: 'Fri 09:00 AM', studentCount: 28, lecturerId: 'Makwindi' },
    // FDI
    { courseName: 'Graphic Design', time: 'Tue 03:00 PM', studentCount: 22, lecturerId: 'Tsoeu' },
    // FICT
    { courseName: 'Mobile App Development', time: 'Wed 01:00 PM', studentCount: 45, lecturerId: 'Moopisa' },
    { courseName: 'Database Systems', time: 'Thu 10:00 AM', studentCount: 50, lecturerId: 'Morutwa' },
  ];

  classes.forEach(cls => {
    const ref = doc(collection(db, 'classes'));
    batch.set(ref, cls);
  });

  const reports: Omit<Report, 'id'>[] = [
    {
      title: 'Weekly Lecture Report - Structural Design',
      content: 'Covered beam analysis and design. Students engaged well.',
      status: 'pending',
      author: 'Mr. Teboho Ntsaba',
      authorRole: 'prl',
      createdAt: new Date('2025-04-15'),
    },
    {
      title: 'Monthly Assessment - Business Strategy',
      content: 'All groups submitted their case studies. Marks pending.',
      status: 'reviewed',
      author: 'Ms. Khopotso Molati',
      authorRole: 'pl',
      createdAt: new Date('2025-04-10'),
    },
    {
      title: 'Course Progress - Mobile App Development',
      content: 'Completed Firebase integration module. Next: Deployment.',
      status: 'pending',
      author: 'Mrs. Diana Moopisa',
      authorRole: 'prl',
      createdAt: new Date('2025-04-18'),
    },
    {
      title: 'Equipment Request - Hospitality Operations',
      content: 'Need additional kitchen utensils for practicals.',
      status: 'approved',
      author: 'Mr. Sebinane Lekoekoe',
      authorRole: 'prl',
      createdAt: new Date('2025-04-12'),
    },
    {
      title: 'Student Feedback - Database Systems',
      content: 'Positive feedback on recent lab sessions.',
      status: 'pending',
      author: 'Mr. Kapela Morutwa',
      authorRole: 'pl',
      createdAt: new Date('2025-04-17'),
    },
  ];

  reports.forEach(report => {
    const ref = doc(collection(db, 'reports'));
    batch.set(ref, report);
  });

  await batch.commit();
  console.log('Firestore seeded with LUCT faculty data!');
};


export const clearSeededData = async () => {
  console.warn('Manual deletion recommended via Firebase Console.');
};
