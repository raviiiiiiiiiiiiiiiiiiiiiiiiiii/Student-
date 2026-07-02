import { LogOut, User as UserIcon, BookOpen, Settings, BarChart2 } from 'lucide-react';
import { User } from '../types.ts';

interface NavbarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Navbar({ user, activeTab, setActiveTab, onLogout }: NavbarProps) {
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'teacher':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-950 flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 tracking-tight text-sm sm:text-base block">
                EduMark Attendance
              </span>
              <span className="text-[10px] text-slate-400 font-mono block -mt-1 leading-none">
                System Active
              </span>
            </div>
          </div>

          {/* Navigation Links based on role */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-950'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard
            </button>

            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('students')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                    activeTab === 'students'
                      ? 'bg-slate-100 text-slate-950'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Students
                </button>
                <button
                  onClick={() => setActiveTab('teachers')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                    activeTab === 'teachers'
                      ? 'bg-slate-100 text-slate-950'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Teachers
                </button>
                <button
                  onClick={() => setActiveTab('classes')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                    activeTab === 'classes'
                      ? 'bg-slate-100 text-slate-950'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Classes
                </button>
              </>
            )}

            {(user.role === 'teacher' || user.role === 'admin') && (
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'bg-slate-100 text-slate-950'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Mark Attendance
              </button>
            )}

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-slate-100 text-slate-950'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Profile
            </button>
          </nav>

          {/* User Controls and Mobile Toggles */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-slate-800 block">
                  {user.name}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <UserIcon className="w-4 h-4" />
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Submenu for tabs */}
      <div className="flex md:hidden bg-slate-50 border-t border-slate-100 px-4 py-2 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
            activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Dashboard
        </button>
        {user.role === 'admin' && (
          <>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
                activeTab === 'students' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setActiveTab('teachers')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
                activeTab === 'teachers' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Teachers
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
                activeTab === 'classes' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Classes
            </button>
          </>
        )}
        {(user.role === 'teacher' || user.role === 'admin') && (
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
              activeTab === 'attendance' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Mark
          </button>
        )}
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 ${
            activeTab === 'settings' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Profile
        </button>
      </div>
    </header>
  );
}
