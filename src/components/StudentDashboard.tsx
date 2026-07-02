import { useState, useEffect } from 'react';
import { BookOpen, Calendar, Clock, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { DashboardStats } from '../types.ts';

interface StudentDashboardProps {
  token: string;
}

export default function StudentDashboard({ token }: StudentDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats', { headers });
      if (!res.ok) throw new Error('Failed to load student dashboard info');
      const data = await res.json();
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getAttendanceFeedback = (rate: number) => {
    if (rate >= 90) return { text: 'Excellent Attendance!', color: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: ShieldCheck };
    if (rate >= 75) return { text: 'Good Attendance. Keep it up!', color: 'text-indigo-700 bg-indigo-50 border-indigo-100', icon: ShieldCheck };
    return { text: 'Warning: Low Attendance Rate', color: 'text-red-700 bg-red-50 border-red-100', icon: AlertTriangle };
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Portal</h2>
        <p className="text-xs text-slate-500 mt-1">
          Review your enrolled classes, tracking logs, and attendance history in real-time.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        </div>
      ) : stats ? (
        <>
          {/* Statistics KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Enrolled Classes</span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.enrolledCount}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Your Attendance Rate</span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.attendanceRate}%</h3>
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              {(() => {
                const feedback = getAttendanceFeedback(stats.attendanceRate);
                const Icon = feedback.icon;
                return (
                  <div className={`p-4 h-full rounded-xl border flex items-center gap-3 ${feedback.color}`}>
                    <Icon className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Academic Standing</span>
                      <p className="text-xs font-semibold mt-0.5">{feedback.text}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Grid Layout: Enrolled classes list vs Attendance Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Class list */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4 h-fit">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Your Class Schedule</h4>
              <div className="space-y-2">
                {stats.enrolledClasses && stats.enrolledClasses.length > 0 ? (
                  stats.enrolledClasses.map((cls) => (
                    <div key={cls.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 block">{cls.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Faculty: Edna Krabappel</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded text-[9px] font-bold uppercase tracking-wide">
                        Enrolled
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    You aren't enrolled in any classes yet. Contact administration.
                  </div>
                )}
              </div>
            </div>

            {/* Attendance history logs */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden h-fit">
              <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Attendance History</h4>
                <span className="text-[10px] text-slate-400 font-mono">Recent Logs</span>
              </div>

              <div className="overflow-x-auto">
                {stats.history && stats.history.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase bg-slate-50/10">
                        <th className="px-5 py-3">Class/Course</th>
                        <th className="px-5 py-3">Session Date</th>
                        <th className="px-5 py-3 text-right">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                      {stats.history.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-5 py-3 font-semibold text-slate-950">{log.className}</td>
                          <td className="px-5 py-3 font-mono text-slate-500 text-[11px]">{log.date}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              log.status === 'present'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                : log.status === 'absent'
                                ? 'bg-red-50 text-red-800 border-red-100'
                                : 'bg-amber-50 text-amber-800 border-amber-100'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    No attendance records logged under your account yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 border rounded-xl">
          Roster states unavailable. Contact technical support.
        </div>
      )}
    </div>
  );
}
