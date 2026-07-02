import { pgTable, serial, text, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (Admins, Teachers, Students)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID (for Google sign-in)
  email: text('email').notNull().unique(),
  username: text('username').unique(), // For local password sign-in
  name: text('name').notNull(),
  passwordHash: text('password_hash'), // For local password sign-in
  role: text('role').$type<'admin' | 'teacher' | 'student'>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Classes table (e.g., Math 101)
export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  teacherId: integer('teacher_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
});

// Enrollments table (links Students to Classes)
export const enrollments = pgTable('enrollments', {
  studentId: integer('student_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  classId: integer('class_id')
    .references(() => classes.id, { onDelete: 'cascade' })
    .notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.studentId, table.classId] }),
}));

// Attendance Records table
export const attendanceRecords = pgTable('attendance_records', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  classId: integer('class_id')
    .references(() => classes.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(), // Format: YYYY-MM-DD
  status: text('status').$type<'present' | 'absent' | 'late'>().notNull(),
  markedById: integer('marked_by_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  classesTaught: many(classes, { relationName: 'teacherClasses' }),
  enrollments: many(enrollments),
  attendanceRecords: many(attendanceRecords, { relationName: 'studentAttendance' }),
  markedAttendance: many(attendanceRecords, { relationName: 'markedByAttendance' }),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
    relationName: 'teacherClasses',
  }),
  enrollments: many(enrollments),
  attendanceRecords: many(attendanceRecords),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  student: one(users, {
    fields: [attendanceRecords.studentId],
    references: [users.id],
    relationName: 'studentAttendance',
  }),
  class: one(classes, {
    fields: [attendanceRecords.classId],
    references: [classes.id],
  }),
  markedBy: one(users, {
    fields: [attendanceRecords.markedById],
    references: [users.id],
    relationName: 'markedByAttendance',
  }),
}));
