import { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, AlertCircle, Clock, Loader2, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Class, StudentWithAttendance, DashboardStats } from '../types.ts';

interface TeacherDashboardProps {
  token: string;
  activeView: 'dashboard' | 'attendance';
}

export default function TeacherDashboard({ token, activeView }: TeacherDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);

  // Loading & error states
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Fetch stats & classes on load
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/dashboard/stats', { headers });
      if (!res.ok) throw new Error('Failed to load dashboard metrics');
      const data = await res.json();
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch('/api/attendance/classes', { headers });
      if (!res.ok) throw new Error('Failed to load registered classes');
      const data = await res.json();
      setClasses(data);
      if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    setError(null);
    setSuccess(null);
    if (activeView === 'dashboard') {
      fetchStats();
    } else {
      fetchClasses();
    }
  }, [activeView]);

  // Fetch students for selected class and date
  const fetchClassStudents = async (classId: number, dateStr: string) => {
    setLoadingStudents(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/attendance/class/${classId}/students?date=${dateStr}`, { headers });
      if (!res.ok) throw new Error('Failed to load class roll');
      const data = await res.json();
      setStudents(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (activeView === 'attendance' && selectedClassId) {
      fetchClassStudents(Number(selectedClassId), selectedDate);
    }
  }, [selectedClassId, selectedDate, activeView]);

  // Set local attendance status for a student
  const handleSetStatus = (studentId: number, status: 'present' | 'absent' | 'late') => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, status } : student
      )
    );
  };

  // Bulk set all students to present
  const handleMarkAllPresent = () => {
    setStudents((prev) =>
      prev.map((student) => ({ ...student, status: 'present' }))
    );
    setSuccess('All students marked as Present in local drafts.');
  };

  // Submit attendance records
  const handleSubmitAttendance = async () => {
    if (!selectedClassId) return;

    // Check if any students are unmarked
    const unmarkedCount = students.filter((s) => s.status === null).length;
    if (unmarkedCount > 0) {
      if (!confirm(`You have ${unmarkedCount} student(s) left unmarked. They will default to Unmarked, but won't be saved. Proceed?`)) {
        return;
      }
    }

    setSavingAttendance(true);
    setError(null);
    setSuccess(null);

    const recordsToSubmit = students
      .filter((s) => s.status !== null)
      .map((s) => ({
        studentId: s.id,
        status: s.status!,
      }));

    try {
      const res = await fetch(`/api/attendance/class/${selectedClassId}/mark`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          date: selectedDate,
          records: recordsToSubmit,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit attendance roster');

      setSuccess(`Attendance roster for ${selectedDate} has been saved successfully.`);
      // Refresh list to pull updated state
      fetchClassStudents(Number(selectedClassId), selectedDate);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight capitalize">
          {activeView === 'dashboard' ? 'Teacher Dashboard' : 'Mark Session Attendance'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {activeView === 'dashboard'
            ? 'Track attendance rates and recent activity metrics across your classes.'
            : 'Select academic classes, choose dates, and log attendance statuses.'
          }
        </p>
      </div>

      {/* Toast Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      {/* 1. OVERVIEW VIEW */}
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            </div>
          ) : stats ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Classes Taught</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.classesCount}</h3>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Overall Average Attendance</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.attendanceRate}%</h3>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Staff Status</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verified Faculty
                    </h3>
                  </div>
                </div>
              </div>

              {/* Recent activity log */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Recent Logs</h4>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono">Faculty Logbook</span>
                </div>

                <div className="overflow-x-auto">
                  {stats.recentLogs && stats.recentLogs.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/20">
                          <th className="px-5 py-3">Student Name</th>
                          <th className="px-5 py-3">Class</th>
                          <th className="px-5 py-3">Session Date</th>
                          <th className="px-5 py-3 text-right">Logged Status</th>
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
                      You haven't logged any attendance recently. Use the "Mark Attendance" tab to begin.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 border rounded-xl">
              Unable to load stats. Check connection.
            </div>
          )}
        </div>
      )}

      {/* 2. ATTENDANCE ROSTER SHEET VIEW */}
      {activeView === 'attendance' && (
        <div className="space-y-6">
          {/* Roster Controls Selection */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2.5 focus:border-slate-800 focus:outline-none"
                disabled={loadingClasses}
              >
                <option value="">-- Choose Academic Class --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date of Session</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white text-xs border border-slate-200 rounded-lg p-2.5 focus:border-slate-800 focus:outline-none font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleMarkAllPresent}
                disabled={students.length === 0 || loadingStudents}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition disabled:opacity-50"
              >
                Mark All Present
              </button>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Class Roster</h3>
              <span className="text-[10px] text-slate-400 font-mono font-semibold">Total Students: {students.length}</span>
            </div>

            <div className="overflow-x-auto">
              {loadingStudents ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                </div>
              ) : students.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/10">
                      <th className="px-5 py-3">Student Profile</th>
                      <th className="px-5 py-3">Email Address</th>
                      <th className="px-5 py-3 text-center">Current Marked Status</th>
                      <th className="px-5 py-3 text-right">Roster Options</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/20 transition">
                        <td className="px-5 py-3">
                          <span className="font-semibold text-slate-950 block">{student.name}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">ID: #{student.id}</span>
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px] text-slate-500">{student.email}</td>
                        <td className="px-5 py-3 text-center">
                          {student.status ? (
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              student.status === 'present'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                : student.status === 'absent'
                                ? 'bg-red-50 text-red-800 border-red-100'
                                : 'bg-amber-50 text-amber-800 border-amber-100'
                            }`}>
                              {student.status}
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200">
                              Unmarked
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleSetStatus(student.id, 'present')}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer border transition ${
                                student.status === 'present'
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200'
                              }`}
                            >
                              P
                            </button>
                            <button
                              onClick={() => handleSetStatus(student.id, 'late')}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer border transition ${
                                student.status === 'late'
                                  ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-200'
                              }`}
                            >
                              L
                            </button>
                            <button
                              onClick={() => handleSetStatus(student.id, 'absent')}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer border transition ${
                                student.status === 'absent'
                                  ? 'bg-red-500 border-red-500 text-white shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-200'
                              }`}
                            >
                              A
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs">
                  {selectedClassId 
                    ? 'No students enrolled in this academic class yet.' 
                    : 'Select a class to load the student attendance roster.'
                  }
                </div>
              )}
            </div>

            {/* Bottom Submit controls */}
            {students.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                <button
                  onClick={handleSubmitAttendance}
                  disabled={savingAttendance}
                  className="px-6 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {savingAttendance ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving Roster...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      Submit Attendance
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
