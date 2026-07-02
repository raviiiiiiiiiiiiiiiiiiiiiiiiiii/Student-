import bcrypt from 'bcrypt';
import { db } from './index.ts';
import { users, classes, enrollments, attendanceRecords } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  try {
    console.log('Checking database seed status...');
    
    // Check if users exist
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log('Database already has data. Skipping seed.');
      return;
    }

    console.log('Database is empty. Starting seed process...');

    // Hash passwords
    const saltRounds = 10;
    const adminHash = await bcrypt.hash('adminpassword', saltRounds);
    const teacherHash = await bcrypt.hash('teacherpassword', saltRounds);
    const studentHash = await bcrypt.hash('studentpassword', saltRounds);

    // Insert Users
    console.log('Inserting seed users...');
    const [adminUser] = await db.insert(users).values({
      name: 'Principal Skinner',
      email: 'admin@school.com',
      username: 'admin',
      passwordHash: adminHash,
      role: 'admin',
    }).returning();

    const [teacherUser] = await db.insert(users).values({
      name: 'Edna Krabappel',
      email: 'teacher@school.com',
      username: 'teacher',
      passwordHash: teacherHash,
      role: 'teacher',
    }).returning();

    const [studentBart] = await db.insert(users).values({
      name: 'Bart Simpson',
      email: 'student@school.com',
      username: 'student',
      passwordHash: studentHash,
      role: 'student',
    }).returning();

    const [studentLisa] = await db.insert(users).values({
      name: 'Lisa Simpson',
      email: 'student2@school.com',
      username: 'student2',
      passwordHash: studentHash,
      role: 'student',
    }).returning();

    console.log('Inserting seed classes...');
    // Create classes
    const [mathClass] = await db.insert(classes).values({
      name: 'Math 101',
      teacherId: teacherUser.id,
    }).returning();

    const [scienceClass] = await db.insert(classes).values({
      name: 'Science 202',
      teacherId: teacherUser.id,
    }).returning();

    console.log('Enrolling students...');
    // Enroll students
    await db.insert(enrollments).values([
      { studentId: studentBart.id, classId: mathClass.id },
      { studentId: studentLisa.id, classId: mathClass.id },
      { studentId: studentBart.id, classId: scienceClass.id },
      { studentId: studentLisa.id, classId: scienceClass.id },
    ]);

    console.log('Adding sample attendance records...');
    // Add some initial attendance
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    await db.insert(attendanceRecords).values([
      {
        studentId: studentBart.id,
        classId: mathClass.id,
        date: yesterdayStr,
        status: 'late',
        markedById: teacherUser.id,
      },
      {
        studentId: studentLisa.id,
        classId: mathClass.id,
        date: yesterdayStr,
        status: 'present',
        markedById: teacherUser.id,
      },
      {
        studentId: studentBart.id,
        classId: mathClass.id,
        date: todayStr,
        status: 'absent',
        markedById: teacherUser.id,
      },
      {
        studentId: studentLisa.id,
        classId: mathClass.id,
        date: todayStr,
        status: 'present',
        markedById: teacherUser.id,
      },
    ]);

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
