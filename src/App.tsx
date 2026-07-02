import { useState, useEffect } from 'react';
import Login from './components/Login.tsx';
import Navbar from './components/Navbar.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import TeacherDashboard from './components/TeacherDashboard.tsx';
import StudentDashboard from './components/StudentDashboard.tsx';
import ProfileSettings from './components/ProfileSettings.tsx';
import { User } from './types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [initializing, setInitializing] = useState<boolean>(true);

  // Restore session if available
  useEffect(() => {
    const savedToken = sessionStorage.getItem('edu_auth_token');
    const savedUser = sessionStorage.getItem('edu_auth_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Session restoration failed:', err);
        sessionStorage.removeItem('edu_auth_token');
        sessionStorage.removeItem('edu_auth_user');
      }
    }
    setInitializing(false);
  }, []);

  const handleLoginSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setActiveTab('dashboard');

    // Securely cache session for page refreshes
    sessionStorage.setItem('edu_auth_token', newToken);
    sessionStorage.setItem('edu_auth_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
    sessionStorage.removeItem('edu_auth_token');
    sessionStorage.removeItem('edu_auth_user');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-slate-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 selection:bg-slate-900 selection:text-white">
      {!token || !user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* Main Top Header */}
          <Navbar 
            user={user} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            onLogout={handleLogout} 
          />

          {/* Main Content Area */}
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                id={`tab-container-${activeTab}`}
              >
                {activeTab === 'settings' && (
                  <ProfileSettings user={user} token={token} />
                )}

                {user.role === 'admin' && activeTab !== 'settings' && (
                  <AdminDashboard 
                    token={token} 
                    activeView={activeTab as any} 
                  />
                )}

                {user.role === 'teacher' && activeTab !== 'settings' && (
                  <TeacherDashboard 
                    token={token} 
                    activeView={activeTab as any} 
                  />
                )}

                {user.role === 'student' && activeTab !== 'settings' && (
                  <StudentDashboard 
                    token={token} 
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Institutional Footer */}
          <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-mono">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
              <p>© 2026 EduMark Attendance Management System.</p>
              <p className="text-[10px] bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                Database: Cloud SQL (PostgreSQL) • API Secure
              </p>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
