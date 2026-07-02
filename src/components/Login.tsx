import React, { useState } from 'react';
import { Shield, BookOpen, User as UserIcon, Lock, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please check your credentials.');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden"
      >
        {/* Top Accent Header */}
        <div className="bg-slate-900 px-6 py-8 text-center text-white relative">
          <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono text-slate-300">
            <Sparkles className="w-3 h-3 text-amber-400" /> Secure
          </div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-3">
            <BookOpen className="w-6 h-6 text-slate-100" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance System</h1>
          <p className="text-xs text-slate-400 mt-1">
            Student Attendance Management Portal
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. admin or bart@school.com"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition bg-slate-50/50"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition bg-slate-50/50"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-medium rounded-lg text-sm transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-6 p-3 rounded-lg bg-slate-50 text-[11px] text-slate-500 leading-relaxed border border-slate-100 text-center">
            <span className="font-semibold text-slate-600 block mb-1">Demo Credentials:</span>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div>
                <span className="font-medium text-slate-700">Admin</span>
                <p className="font-mono">admin / adminpassword</p>
              </div>
              <div>
                <span className="font-medium text-slate-700">Teacher</span>
                <p className="font-mono">teacher / teacherpassword</p>
              </div>
              <div>
                <span className="font-medium text-slate-700">Student</span>
                <p className="font-mono">student / studentpassword</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
