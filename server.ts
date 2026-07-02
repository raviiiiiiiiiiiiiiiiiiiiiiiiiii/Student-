import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, and, or, sql } from 'drizzle-orm';

import { db } from './src/db/index.ts';
import { users, classes, enrollments, attendanceRecords } from './src/db/schema.ts';
import { requireAuth, requireRole, AuthRequest } from './src/middleware/auth.ts';
import { seedDatabase } from './src/db/seed.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'student-attendance-system-super-secret-key-123';
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Run database seeding on start
  await seedDatabase();

  // ==========================================
  // AUTHENTICATION API ROUTES
  // ==========================================

  // 1. Credentials Login (Email/Username + Password)
  app.post('/api/auth/login', async (req, res) => {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    try {
      // Find user by email or username
      const userList = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.email, usernameOrEmail),
            eq(users.username, usernameOrEmail)
          )
        )
        .limit(1);

      if (userList.length === 0) {
        return res.status(401).json({ error: 'Invalid email/username or password' });
      }

      const user = userList[0];

      if (!user.passwordHash) {
        return res.status(400).json({
          error: 'This account was created with Google Sign-In. Please sign in via Google.',
        });
      }

      // Verify password hash
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email/username or password' });
      }

      // Create JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  });

  // 2. Fetch authenticated Profile
  app.get('/api/auth/profile', requireAuth, async (req: AuthRequest, res) => {
    return res.json({ user: req.user });
  });

  // 3. Change Password
  app.post('/api/auth/change-password', requireAuth, async (req: AuthRequest, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    try {
      const userList = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
      if (userList.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userList[0];

      if (!user.passwordHash) {
        return res.status(400).json({
          error: 'Google Sign-In accounts cannot change passwords here. Please manage your Google settings.',
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }

      const saltRounds = 10;
      const newHash = await bcrypt.hash(newPassword, saltRounds);

      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

      return res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ error: 'Internal server error while changing password' });
    }
  });

  // ==========================================
  // DASHBOARD STATISTICS API ROUTE
  // ==========================================
  app.get('/api/dashboard/stats', requireAuth, async (req: AuthRequest, res) => {
    const { id, role } = req.user!;

    try {
      if (role === 'admin') {
        const studentCountRes = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.role, 'student'));
        const teacherCountRes = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.role, 'teacher'));
        const classCountRes = await db
          .select({ count: sql<number>`count(*)` })
          .from(classes);

        const attendanceStatsRes = await db
          .select({
            status: attendanceRecords.status,
            count: sql<number>`count(*)`,
          })
          .from(attendanceRecords)
          .groupBy(attendanceRecords.status);

        const totalRecords = attendanceStatsRes.reduce((sum, item) => sum + Number(item.count), 0);
        const presentOrLate = attendanceStatsRes.reduce(
          (sum, item) => (item.status === 'present' || item.status === 'late' ? sum + Number(item.count) : sum),
          0
        );

        const attendanceRate = totalRecords > 0 ? Math.round((presentOrLate / totalRecords) * 100) : 100;

        const recentLogs = await db
          .select({
            id: attendanceRecords.id,
            date: attendanceRecords.date,
            status: attendanceRecords.status,
            studentName: users.name,
            className: classes.name,
          })
          .from(attendanceRecords)
          .innerJoin(users, eq(attendanceRecords.studentId, users.id))
          .innerJoin(classes, eq(attendanceRecords.classId, classes.id))
          .orderBy(sql`attendance_records.created_at DESC`)
          .limit(6);

        return res.json({
          stats: {
            totalStudents: Number(studentCountRes[0]?.count || 0),
            totalTeachers: Number(teacherCountRes[0]?.count || 0),
            totalClasses: Number(classCountRes[0]?.count || 0),
            attendanceRate,
            recentLogs,
          },
        });
      } else if (role === 'teacher') {
        // Teacher stats: Classes taught, attendance rates per class
        const teacherClasses = await db.select().from(classes).where(eq(classes.teacherId, id));
        const classIds = teacherClasses.map((c) => c.id);

        let attendanceRate = 100;
        let recentLogs: any[] = [];

        if (classIds.length > 0) {
          const attendanceStatsRes = await db
            .select({
              status: attendanceRecords.status,
              count: sql<number>`count(*)`,
            })
            .from(attendanceRecords)
            .where(sql`class_id IN (${sql.join(classIds, sql`, `)})`)
            .groupBy(attendanceRecords.status);

          const totalRecords = attendanceStatsRes.reduce((sum, item) => sum + Number(item.count), 0);
          const presentOrLate = attendanceStatsRes.reduce(
            (sum, item) => (item.status === 'present' || item.status === 'late' ? sum + Number(item.count) : sum),
            0
          );
          attendanceRate = totalRecords > 0 ? Math.round((presentOrLate / totalRecords) * 100) : 100;

          recentLogs = await db
            .select({
              id: attendanceRecords.id,
              date: attendanceRecords.date,
              status: attendanceRecords.status,
              studentName: users.name,
              className: classes.name,
            })
            .from(attendanceRecords)
            .innerJoin(users, eq(attendanceRecords.studentId, users.id))
            .innerJoin(classes, eq(attendanceRecords.classId, classes.id))
            .where(sql`class_id IN (${sql.join(classIds, sql`, `)})`)
            .orderBy(sql`attendance_records.created_at DESC`)
            .limit(6);
        }

        return res.json({
          stats: {
            classesCount: teacherClasses.length,
            classes: teacherClasses,
            attendanceRate,
            recentLogs,
          },
        });
      } else {
        // Student stats: Enrolled classes, individual attendance rate
        const enrolledClasses = await db
          .select({
            id: classes.id,
            name: classes.name,
          })
          .from(enrollments)
          .innerJoin(classes, eq(enrollments.classId, classes.id))
          .where(eq(enrollments.studentId, id));

        const attendanceStatsRes = await db
          .select({
            status: attendanceRecords.status,
            count: sql<number>`count(*)`,
          })
          .from(attendanceRecords)
          .where(eq(attendanceRecords.studentId, id))
          .groupBy(attendanceRecords.status);

        const totalRecords = attendanceStatsRes.reduce((sum, item) => sum + Number(item.count), 0);
        const presentOrLate = attendanceStatsRes.reduce(
          (sum, item) => (item.status === 'present' || item.status === 'late' ? sum + Number(item.count) : sum),
          0
        );

        const attendanceRate = totalRecords > 0 ? Math.round((presentOrLate / totalRecords) * 100) : 100;

        const history = await db
          .select({
            id: attendanceRecords.id,
            date: attendanceRecords.date,
            status: attendanceRecords.status,
            className: classes.name,
          })
          .from(attendanceRecords)
          .innerJoin(classes, eq(attendanceRecords.classId, classes.id))
          .where(eq(attendanceRecords.studentId, id))
          .orderBy(sql`attendance_records.date DESC`)
          .limit(8);

        return res.json({
          stats: {
            enrolledCount: enrolledClasses.length,
            enrolledClasses,
            attendanceRate,
            history,
          },
        });
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
      return res.status(500).json({ error: 'Failed to retrieve stats from database' });
    }
  });

  // ==========================================
  // ATTENDANCE MODULE API ROUTES
  // ==========================================

  // Get active classes list
  app.get('/api/attendance/classes', requireAuth, async (req: AuthRequest, res) => {
    const { id, role } = req.user!;

    try {
      if (role === 'admin') {
        const allClasses = await db
          .select({
            id: classes.id,
            name: classes.name,
            teacherName: users.name,
          })
          .from(classes)
          .innerJoin(users, eq(classes.teacherId, users.id));
        return res.json(allClasses);
      } else if (role === 'teacher') {
        const teacherClasses = await db
          .select({
            id: classes.id,
            name: classes.name,
            teacherName: users.name,
          })
          .from(classes)
          .innerJoin(users, eq(classes.teacherId, users.id))
          .where(eq(classes.teacherId, id));
        return res.json(teacherClasses);
      } else {
        const studentClasses = await db
          .select({
            id: classes.id,
            name: classes.name,
            teacherName: users.name,
          })
          .from(enrollments)
          .innerJoin(classes, eq(enrollments.classId, classes.id))
          .innerJoin(users, eq(classes.teacherId, users.id))
          .where(eq(enrollments.studentId, id));
        return res.json(studentClasses);
      }
    } catch (error) {
      console.error('Get classes error:', error);
      return res.status(500).json({ error: 'Failed to fetch classes' });
    }
  });

  // Get students enrolled in a class along with today's status if marked
  app.get('/api/attendance/class/:classId/students', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
    const classId = parseInt(req.params.classId);
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

    try {
      // 1. Get enrolled students
      const enrolledStudents = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(enrollments)
        .innerJoin(users, eq(enrollments.studentId, users.id))
        .where(eq(enrollments.classId, classId));

      // 2. Get attendance records for this class and date
      const attendance = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.classId, classId),
            eq(attendanceRecords.date, dateStr)
          )
        );

      const statusMap = new Map(attendance.map((rec) => [rec.studentId, rec.status]));

      const studentsWithStatus = enrolledStudents.map((student) => ({
        ...student,
        status: statusMap.get(student.id) || null,
      }));

      return res.json(studentsWithStatus);
    } catch (error) {
      console.error('Get class students error:', error);
      return res.status(500).json({ error: 'Failed to fetch students attendance' });
    }
  });

  // Mark attendance for class
  app.post('/api/attendance/class/:classId/mark', requireAuth, requireRole(['admin', 'teacher']), async (req: AuthRequest, res) => {
    const classId = parseInt(req.params.classId);
    const { date, records } = req.body; // records: [{studentId: number, status: 'present'|'absent'|'late'}]

    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Date and records array are required' });
    }

    try {
      const markedById = req.user!.id;

      // Wrap in transaction or sequential upserts
      for (const record of records) {
        const { studentId, status } = record;

        // Check if there is already a record
        const existing = await db
          .select()
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.studentId, studentId),
              eq(attendanceRecords.classId, classId),
              eq(attendanceRecords.date, date)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update
          await db
            .update(attendanceRecords)
            .set({ status, markedById, createdAt: new Date() })
            .where(eq(attendanceRecords.id, existing[0].id));
        } else {
          // Insert
          await db.insert(attendanceRecords).values({
            studentId,
            classId,
            date,
            status,
            markedById,
          });
        }
      }

      return res.json({ message: 'Attendance updated successfully' });
    } catch (error) {
      console.error('Mark attendance error:', error);
      return res.status(500).json({ error: 'Failed to update attendance records' });
    }
  });

  // Get full attendance history (with filters)
  app.get('/api/attendance/history', requireAuth, async (req: AuthRequest, res) => {
    const { id, role } = req.user!;
    const classIdParam = req.query.classId ? parseInt(req.query.classId as string) : undefined;
    const dateParam = req.query.date as string | undefined;

    try {
      let conditions = [];

      if (role === 'student') {
        conditions.push(eq(attendanceRecords.studentId, id));
      } else if (role === 'teacher') {
        // Find teacher's classes
        const tClasses = await db.select().from(classes).where(eq(classes.teacherId, id));
        const cIds = tClasses.map((c) => c.id);
        if (cIds.length === 0) {
          return res.json([]);
        }
        conditions.push(sql`attendance_records.class_id IN (${sql.join(cIds, sql`, `)})`);
      }

      if (classIdParam) {
        conditions.push(eq(attendanceRecords.classId, classIdParam));
      }

      if (dateParam) {
        conditions.push(eq(attendanceRecords.date, dateParam));
      }

      const query = db
        .select({
          id: attendanceRecords.id,
          date: attendanceRecords.date,
          status: attendanceRecords.status,
          studentName: users.name,
          studentEmail: users.email,
          className: classes.name,
          markedBy: sql<string>`(SELECT name FROM users u WHERE u.id = attendance_records.marked_by_id)`,
        })
        .from(attendanceRecords)
        .innerJoin(users, eq(attendanceRecords.studentId, users.id))
        .innerJoin(classes, eq(attendanceRecords.classId, classes.id));

      const recordsList = conditions.length > 0 
        ? await query.where(and(...conditions)).orderBy(sql`attendance_records.date DESC`)
        : await query.orderBy(sql`attendance_records.date DESC`);

      return res.json(recordsList);
    } catch (error) {
      console.error('History fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
  });

  // ==========================================
  // ADMIN CRUD: STUDENTS, TEACHERS, CLASSES
  // ==========================================

  // 1. STUDENTS
  app.get('/api/admin/students', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const studentList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          username: users.username,
          createdAt: users.createdAt,
          classCount: sql<number>`(SELECT count(*) FROM enrollments e WHERE e.student_id = users.id)`,
        })
        .from(users)
        .where(eq(users.role, 'student'))
        .orderBy(users.name);
      return res.json(studentList);
    } catch (error) {
      console.error('Admin students list error:', error);
      return res.status(500).json({ error: 'Failed to fetch students' });
    }
  });

  app.post('/api/admin/students', requireAuth, requireRole(['admin']), async (req, res) => {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: 'All fields (name, email, username, password) are required' });
    }

    try {
      const existing = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.email, email),
            eq(users.username, username)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email or username already exists' });
      }

      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);

      const [newStudent] = await db
        .insert(users)
        .values({
          name,
          email,
          username,
          passwordHash: hash,
          role: 'student',
        })
        .returning();

      return res.json(newStudent);
    } catch (error) {
      console.error('Admin create student error:', error);
      return res.status(500).json({ error: 'Failed to create student' });
    }
  });

  app.put('/api/admin/students/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    const studentId = parseInt(req.params.id);
    const { name, email, username, password } = req.body;

    if (!name || !email || !username) {
      return res.status(400).json({ error: 'Name, email, and username are required' });
    }

    try {
      const updateData: any = { name, email, username };
      if (password) {
        const saltRounds = 10;
        updateData.passwordHash = await bcrypt.hash(password, saltRounds);
      }

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(and(eq(users.id, studentId), eq(users.role, 'student')))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Student not found' });
      }

      return res.json(updated);
    } catch (error) {
      console.error('Admin update student error:', error);
      return res.status(500).json({ error: 'Failed to update student' });
    }
  });

  app.delete('/api/admin/students/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    const studentId = parseInt(req.params.id);

    try {
      const [deleted] = await db
        .delete(users)
        .where(and(eq(users.id, studentId), eq(users.role, 'student')))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: 'Student not found' });
      }

      return res.json({ message: 'Student deleted successfully', student: deleted });
    } catch (error) {
      console.error('Admin delete student error:', error);
      return res.status(500).json({ error: 'Failed to delete student' });
    }
  });

  // 2. TEACHERS
  app.get('/api/admin/teachers', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const teacherList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          username: users.username,
          createdAt: users.createdAt,
          classCount: sql<number>`(SELECT count(*) FROM classes c WHERE c.teacher_id = users.id)`,
        })
        .from(users)
        .where(eq(users.role, 'teacher'))
        .orderBy(users.name);
      return res.json(teacherList);
    } catch (error) {
      console.error('Admin teachers list error:', error);
      return res.status(500).json({ error: 'Failed to fetch teachers' });
    }
  });

  app.post('/api/admin/teachers', requireAuth, requireRole(['admin']), async (req, res) => {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: 'All fields (name, email, username, password) are required' });
    }

    try {
      const existing = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.email, email),
            eq(users.username, username)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email or username already exists' });
      }

      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);

      const [newTeacher] = await db
        .insert(users)
        .values({
          name,
          email,
          username,
          passwordHash: hash,
          role: 'teacher',
        })
        .returning();

      return res.json(newTeacher);
    } catch (error) {
      console.error('Admin create teacher error:', error);
      return res.status(500).json({ error: 'Failed to create teacher' });
    }
  });

  app.put('/api/admin/teachers/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    const teacherId = parseInt(req.params.id);
    const { name, email, username, password } = req.body;

    if (!name || !email || !username) {
      return res.status(400).json({ error: 'Name, email, and username are required' });
    }

    try {
      const updateData: any = { name, email, username };
      if (password) {
        const saltRounds = 10;
        updateData.passwordHash = await bcrypt.hash(password, saltRounds);
      }

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(and(eq(users.id, teacherId), eq(users.role, 'teacher')))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      return res.json(updated);
    } catch (error) {
      console.error('Admin update teacher error:', error);
      return res.status(500).json({ error: 'Failed to update teacher' });
    }
  });

  app.delete('/api/admin/teachers/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    const teacherId = parseInt(req.params.id);

    try {
      const [deleted] = await db
        .delete(users)
        .where(and(eq(users.id, teacherId), eq(users.role, 'teacher')))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: 'Teacher not found' });
      }

      return res.json({ message: 'Teacher deleted successfully', teacher: deleted });
    } catch (error) {
      console.error('Admin delete teacher error:', error);
      return res.status(500).json({ error: 'Failed to delete teacher' });
    }
  });

  // 3. CLASSES
  app.get('/api/admin/classes', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const classList = await db
        .select({
          id: classes.id,
          name: classes.name,
          teacherId: classes.teacherId,
          teacherName: users.name,
          studentCount: sql<number>`(SELECT count(*) FROM enrollments e WHERE e.class_id = classes.id)`,
        })
        .from(classes)
        .innerJoin(users, eq(classes.teacherId, users.id))
        .orderBy(classes.name);
      return res.json(classList);
    } catch (error) {
      console.error('Admin classes list error:', error);
      return res.status(500).json({ error: 'Failed to fetch classes' });
    }
  });

  app.post('/api/admin/classes', requireAuth, requireRole(['admin']), async (req, res) => {
    const { name, teacherId } = req.body;

    if (!name || !teacherId) {
      return res.status(400).json({ error: 'Class name and teacherId are required' });
    }

    try {
      const [newClass] = await db
        .insert(classes)
        .values({
          name,
          teacherId,
        })
        .returning();

      return res.json(newClass);
    } catch (error) {
      console.error('Admin create class error:', error);
      return res.status(500).json({ error: 'Failed to create class' });
    }
  });

  app.put('/api/admin/classes/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    const classId = parseInt(req.params.id);
    const { name, teacherId } = req.body;

    if (!name || !teacherId) {
      return res.status(400).json({ error: 'Class name and teacherId are required' });
    }

    try {
      const [updated] = await db
        .update(classes)
        .set({ name, teacherId })
        .where(eq(classes.id, classId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Class not found' });
      }

      return res.json(updated);
    } catch (error) {
      console.error('Admin update class error:', error);
      return res.status(500).json({ error: 'Failed to update class' });
    }
  });

  app.delete('/api/admin/classes/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    const classId = parseInt(req.params.id);

    try {
      const [deleted] = await db
        .delete(classes)
        .where(eq(classes.id, classId))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: 'Class not found' });
      }

      return res.json({ message: 'Class deleted successfully', class: deleted });
    } catch (error) {
      console.error('Admin delete class error:', error);
      return res.status(500).json({ error: 'Failed to delete class' });
    }
  });

  // 4. ENROLLMENT MANAGEMENT
  app.get('/api/admin/classes/:classId/enrollments', requireAuth, requireRole(['admin']), async (req, res) => {
    const classId = parseInt(req.params.classId);

    try {
      const enrolled = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(enrollments)
        .innerJoin(users, eq(enrollments.studentId, users.id))
        .where(eq(enrollments.classId, classId));

      return res.json(enrolled);
    } catch (error) {
      console.error('Get enrolled students error:', error);
      return res.status(500).json({ error: 'Failed to fetch enrolled students' });
    }
  });

  app.post('/api/admin/classes/:classId/enroll', requireAuth, requireRole(['admin']), async (req, res) => {
    const classId = parseInt(req.params.classId);
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    try {
      // Avoid duplicate enrollment
      const existing = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, studentId),
            eq(enrollments.classId, classId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Student is already enrolled in this class' });
      }

      await db.insert(enrollments).values({
        studentId,
        classId,
      });

      return res.json({ message: 'Student enrolled successfully' });
    } catch (error) {
      console.error('Enroll student error:', error);
      return res.status(500).json({ error: 'Failed to enroll student' });
    }
  });

  app.post('/api/admin/classes/:classId/unenroll', requireAuth, requireRole(['admin']), async (req, res) => {
    const classId = parseInt(req.params.classId);
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    try {
      await db
        .delete(enrollments)
        .where(
          and(
            eq(enrollments.studentId, studentId),
            eq(enrollments.classId, classId)
          )
        );

      return res.json({ message: 'Student unenrolled successfully' });
    } catch (error) {
      console.error('Unenroll student error:', error);
      return res.status(500).json({ error: 'Failed to unenroll student' });
    }
  });


  // ==========================================
  // VITE & FRONTEND DISPATCH MIDDLEWARE
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[Server] Failed to start:', error);
});
