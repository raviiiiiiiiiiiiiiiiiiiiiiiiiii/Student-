import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Clock, Plus, Trash2, Edit2, Check, X, ShieldAlert, UserCheck, Key, GraduationCap, ArrowUpDown, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { User, Class, DashboardStats } from '../types.ts';

interface AdminDashboardProps {
  token: string;
  activeView: 'dashboard' | 'students' | 'teachers' | 'classes';
}

export default function AdminDashboard({ token, activeView }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classesList, setClassesList] = useState<Class[]>([]);
  
  // Loading and Error States
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forms states
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  // User input fields
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  
  // Class fields
  const [classNameInput, setClassNameInput] = useState('');
  const [classTeacherId, setClassTeacherId] = useState<number | ''>('');

  // Enrollments Drawer
  const [activeEnrollClass, setActiveEnrollClass] = useState<Class | null>(null);
  const [classEnrollments, setClassEnrollments] = useState<User[]>([]);
  const [selectedStudentForEnroll, setSelectedStudentForEnroll] = useState<number | ''>('');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Fetch stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/dashboard/stats', { headers });
      if (!res.ok) throw new Error('Failed to load system statistics');
      const data = await res.json();
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Students list
  const fetchStudents = async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/admin/students', { headers });
      if (!res.ok) throw new Error('Failed to fetch students list');
      const data = await res.json();
      setStudents(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch Teachers list
  const fetchTeachers = async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/admin/teachers', { headers });
      if (!res.ok) throw new Error('Failed to fetch teachers list');
      const data = await res.json();
      setTeachers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch Classes list
  const fetchClasses = async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/admin/classes', { headers });
      if (!res.ok) throw new Error('Failed to fetch classes list');
      const data = await res.json();
      setClassesList(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    setError(null);
    setSuccess(null);
    setIsAddingUser(false);
    setIsAddingClass(false);
    setEditingUser(null);
    setEditingClass(null);
    setActiveEnrollClass(null);

    if (activeView === 'dashboard') {
      fetchStats();
    } else if (activeView === 'students') {
      fetchStudents();
    } else if (activeView === 'teachers') {
      fetchTeachers();
    } else if (activeView === 'classes') {
      fetchClasses();
      fetchTeachers(); // need teachers for assignment dropdown
    }
  }, [activeView]);

  // Handle student / teacher creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userUsername || !userPassword) {
      setError('Please fill in all user profile details.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    const role = activeView === 'students' ? 'students' : 'teachers';

    try {
      const res = await fetch(`/api/admin/${role}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          username: userUsername,
          password: userPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register the new staff/student profile');

      setSuccess(`Profile for "${userName}" created successfully.`);
      setIsAddingUser(false);
      resetUserForm();
      
      if (activeView === 'students') fetchStudents();
      else fetchTeachers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (id: number, name: string) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete user "${name}"? This action cascades to all their records.`)) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    const role = activeView === 'students' ? 'students' : 'teachers';

    try {
      const res = await fetch(`/api/admin/${role}/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      setSuccess(`User "${name}" has been successfully removed.`);
      if (activeView === 'students') fetchStudents();
      else fetchTeachers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal
  const startEditUser = (user: User) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserUsername(user.username || '');
    setUserPassword(''); // keep empty unless updating
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    const role = activeView === 'students' ? 'students' : 'teachers';

    try {
      const res = await fetch(`/api/admin/${role}/${editingUser.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          username: userUsername,
          password: userPassword || undefined, // only update password if filled
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setSuccess(`Profile for "${userName}" updated successfully.`);
      setEditingUser(null);
      resetUserForm();

      if (activeView === 'students') fetchStudents();
      else fetchTeachers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Class Actions
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput || !classTeacherId) {
      setError('Class name and instructor assignment are required.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: classNameInput,
          teacherId: Number(classTeacherId),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to instantiate the class.');

      setSuccess(`Class "${classNameInput}" has been added to the register.`);
      setIsAddingClass(false);
      setClassNameInput('');
      setClassTeacherId('');
      fetchClasses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const startEditClass = (cls: Class) => {
    setEditingClass(cls);
    setClassNameInput(cls.name);
    setClassTeacherId(cls.teacherId || '');
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/classes/${editingClass.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: classNameInput,
          teacherId: Number(classTeacherId),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update class details');

      setSuccess(`Class updated to "${classNameInput}" successfully.`);
      setEditingClass(null);
      setClassNameInput('');
      setClassTeacherId('');
      fetchClasses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClass = async (id: number, name: string) => {
    if (!confirm(`Are you absolutely sure you want to delete class "${name}"? All student enrollments and historic attendance marks in this class will be purged.`)) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/classes/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) throw new Error('Failed to delete class');

      setSuccess(`Class "${name}" has been deleted.`);
      fetchClasses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Class enrollment drawer helpers
  const openEnrollments = async (cls: Class) => {
    setActiveEnrollClass(cls);
    setLoadingData(true);
    setError(null);
    setSuccess(null);
    setSelectedStudentForEnroll('');

    try {
      // 1. Get student users for enrolling dropdown
      const studentRes = await fetch('/api/admin/students', { headers });
      const studentsData = await studentRes.json();
      setStudents(studentsData);

      // 2. Get currently enrolled students
      const enrollRes = await fetch(`/api/admin/classes/${cls.id}/enrollments`, { headers });
      const enrollData = await enrollRes.json();
      setClassEnrollments(enrollData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleEnrollStudent = async () => {
    if (!activeEnrollClass || !selectedStudentForEnroll) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/classes/${activeEnrollClass.id}/enroll`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentId: Number(selectedStudentForEnroll) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enroll student');

      setSuccess('Student enrolled successfully.');
      setSelectedStudentForEnroll('');
      openEnrollments(activeEnrollClass); // refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnenrollStudent = async (studentId: number, studentName: string) => {
    if (!activeEnrollClass) return;
    if (!confirm(`Remove student "${studentName}" from "${activeEnrollClass.name}"?`)) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/classes/${activeEnrollClass.id}/unenroll`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentId }),
      });

      if (!res.ok) throw new Error('Failed to unenroll student');

      setSuccess('Student unenrolled successfully.');
      openEnrollments(activeEnrollClass); // refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const resetUserForm = () => {
    setUserName('');
    setUserEmail('');
    setUserUsername('');
    setUserPassword('');
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight capitalize">
            {activeView === 'dashboard' ? 'Overview' : `${activeView} Directory`}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {activeView === 'dashboard' 
              ? 'Institutional metrics, school metrics, and real-time attendance statistics.'
              : `Add, modify, delete, and list school ${activeView} from the registry.`
            }
          </p>
        </div>

        {/* Global Action Buttons */}
        {activeView === 'students' && !isAddingUser && !editingUser && (
          <button
            onClick={() => { setIsAddingUser(true); resetUserForm(); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-950 text-white rounded-lg hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Register Student
          </button>
        )}

        {activeView === 'teachers' && !isAddingUser && !editingUser && (
          <button
            onClick={() => { setIsAddingUser(true); resetUserForm(); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-950 text-white rounded-lg hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Register Teacher
          </button>
        )}

        {activeView === 'classes' && !isAddingClass && !editingClass && (
          <button
            onClick={() => { setIsAddingClass(true); setClassNameInput(''); setClassTeacherId(''); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-950 text-white rounded-lg hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Create Class
          </button>
        )}
      </div>

      {/* Global Toast Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl flex items-start gap-2">
          <UserCheck className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      {/* 1. MAIN OVERVIEW TAB */}
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            </div>
          ) : stats ? (
            <>
              {/* Stats KPIs Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Students</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.totalStudents}</h3>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Active Teachers</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.totalTeachers}</h3>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Classes Registered</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.totalClasses}</h3>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="w-full">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">School Attendance</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <h3 className="text-xl font-bold text-slate-900">{stats.attendanceRate}%</h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Attendance Logs */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recent Attendance Marks</h4>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono">Live Logs</span>
                </div>
                
                <div className="overflow-x-auto">
                  {stats.recentLogs && stats.recentLogs.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/20">
                          <th className="px-5 py-3">Student Name</th>
                          <th className="px-5 py-3">Class</th>
                          <th className="px-5 py-3">Session Date</th>
                          <th className="px-5 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                        {stats.recentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-5 py-3 font-semibold text-slate-950">{log.studentName}</td>
                            <td className="px-5 py-3 text-slate-500">{log.className}</td>
                            <td className="px-5 py-3 font-mono text-[11px]">{log.date}</td>
                            <td className="px-5 py-3 text-right">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                log.status === 'present' 
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : log.status === 'absent'
                                  ? 'bg-red-50 text-red-800'
                                  : 'bg-amber-50 text-amber-800'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No attendance has been marked in the system yet.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border">
              Failed to load stats. Ensure Cloud SQL is running.
            </div>
          )}
        </div>
      )}

      {/* 2. DIRECTORY (STUDENTS / TEACHERS CRUD VIEW) */}
      {(activeView === 'students' || activeView === 'teachers') && (
        <div className="space-y-6">
          {/* Create User Block */}
          {isAddingUser && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-slate-50 rounded-xl border border-slate-100 p-5 space-y-4"
            >
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <Plus className="w-4 h-4 text-slate-950" /> Add New {activeView === 'students' ? 'Student' : 'Teacher'} Profile
              </h3>
              
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ned Flanders"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2 focus:border-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ned@school.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2 focus:border-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">System Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ned_flanders"
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2 focus:border-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2 focus:border-slate-800 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                    disabled={actionLoading}
                  >
                    {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />} Save Profile
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Edit User Block */}
          {editingUser && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-amber-50/50 rounded-xl border border-amber-200 p-5 space-y-4"
            >
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" /> Modify Profile details: "{editingUser.name}"
              </h3>

              <form onSubmit={handleUpdateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2 focus:border-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2 focus:border-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">System Username</label>
                  <input
                    type="text"
                    required
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2 focus:border-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2 focus:border-slate-800 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                    disabled={actionLoading}
                  >
                    {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />} Update Profile
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Directory Listings */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loadingData ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                </div>
              ) : (activeView === 'students' ? students : teachers).length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/50">
                      <th className="px-5 py-3">Full Name</th>
                      <th className="px-5 py-3">Email Address</th>
                      <th className="px-5 py-3">System Username</th>
                      <th className="px-5 py-3 text-center">{activeView === 'students' ? 'Enrolled Classes' : 'Classes Taught'}</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {(activeView === 'students' ? students : teachers).map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-950">{user.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: #{user.id}</div>
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px]">{user.email}</td>
                        <td className="px-5 py-3 font-medium text-slate-500">{user.username || '-'}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                            {/* @ts-ignore */}
                            {user.classCount || 0}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEditUser(user)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Edit user details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No {activeView} registered in the system database yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. CLASSES MANAGEMENT VIEW */}
      {activeView === 'classes' && (
        <div className="space-y-6">
          {/* Create Class Block */}
          {isAddingClass && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-slate-50 rounded-xl border border-slate-100 p-5 space-y-4"
            >
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Create New Academic Class
              </h3>

              <form onSubmit={handleCreateClass} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Class Code/Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Physics II, Chemistry 101"
                    value={classNameInput}
                    onChange={(e) => setClassNameInput(e.target.value)}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2.5 focus:border-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assign Class Instructor</label>
                  <select
                    required
                    value={classTeacherId}
                    onChange={(e) => setClassTeacherId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2.5 focus:border-slate-800 focus:outline-none"
                  >
                    <option value="">-- Choose Instructor --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingClass(false)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                    disabled={actionLoading}
                  >
                    {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />} Create Class
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Edit Class Block */}
          {editingClass && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-amber-50/50 rounded-xl border border-amber-200 p-5 space-y-4"
            >
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Modify Class details: "{editingClass.name}"
              </h3>

              <form onSubmit={handleUpdateClass} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Class Code/Name</label>
                  <input
                    type="text"
                    required
                    value={classNameInput}
                    onChange={(e) => setClassNameInput(e.target.value)}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2.5 focus:border-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assign Class Instructor</label>
                  <select
                    required
                    value={classTeacherId}
                    onChange={(e) => setClassTeacherId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2.5 focus:border-slate-800 focus:outline-none"
                  >
                    <option value="">-- Choose Instructor --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingClass(null)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                    disabled={actionLoading}
                  >
                    {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />} Update Class
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Classes Registry List */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loadingData ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                </div>
              ) : classesList.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/50">
                      <th className="px-5 py-3">Class Name</th>
                      <th className="px-5 py-3">Assigned Teacher/Instructor</th>
                      <th className="px-5 py-3 text-center">Enrolled Students</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {classesList.map((cls) => (
                      <tr key={cls.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-950">{cls.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Class ID: #{cls.id}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-semibold text-slate-700">{cls.teacherName || 'None assigned'}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => openEnrollments(cls)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold hover:bg-indigo-100 transition cursor-pointer border border-indigo-100"
                          >
                            <span>{cls.studentCount || 0} enrolled</span>
                          </button>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEditClass(cls)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Edit class"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClass(cls.id, cls.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Delete class"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No academic classes created in the system registry yet.
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE ENROLLMENTS DRAWER MODAL */}
          {activeEnrollClass && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-xl overflow-hidden"
              >
                {/* Header */}
                <div className="bg-slate-900 text-white px-6 py-5 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm tracking-tight">Class Enrollment: {activeEnrollClass.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Instructor: {activeEnrollClass.teacherName}</p>
                  </div>
                  <button
                    onClick={() => setActiveEnrollClass(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Enroll Form */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Enroll Student</h4>
                    <div className="flex gap-2">
                      <select
                        value={selectedStudentForEnroll}
                        onChange={(e) => setSelectedStudentForEnroll(e.target.value ? Number(e.target.value) : '')}
                        className="flex-1 bg-white text-xs border border-slate-200 rounded-lg p-2 focus:border-slate-800 focus:outline-none"
                      >
                        <option value="">-- Choose Student --</option>
                        {students
                          .filter((st) => !classEnrollments.some((en) => en.id === st.id))
                          .map((st) => (
                            <option key={st.id} value={st.id}>{st.name} ({st.email})</option>
                          ))}
                      </select>
                      <button
                        onClick={handleEnrollStudent}
                        disabled={!selectedStudentForEnroll || actionLoading}
                        className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />} Enroll
                      </button>
                    </div>
                  </div>

                  {/* Enrollment List */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Enrolled Students ({classEnrollments.length})</h4>
                    <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto bg-white">
                      {classEnrollments.length > 0 ? (
                        classEnrollments.map((en) => (
                          <div key={en.id} className="p-3 flex justify-between items-center text-xs hover:bg-slate-50/50">
                            <div>
                              <span className="font-semibold text-slate-900 block">{en.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">{en.email}</span>
                            </div>
                            <button
                              onClick={() => handleUnenrollStudent(en.id, en.name)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Unenroll student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-slate-400 text-xs">
                          No students currently enrolled in this class.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 px-6 py-4 flex justify-end bg-slate-50">
                  <button
                    onClick={() => setActiveEnrollClass(null)}
                    className="px-4 py-1.5 bg-slate-950 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
