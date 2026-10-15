import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import LoginPage from './views/LoginPage';
import TodayView from './views/TodayView';
import Sidebar from './components/Sidebar';
import SettingsView from './views/SettingsView';
import CourseView from './views/CourseView';
import DiscordAuthCallback from './views/DiscordAuthCallback';
import MicrosoftAuthCallback from './views/MicrosoftAuthCallback';

import CalendarView from './views/CalendarView';
import TasksView from './views/TasksView';
import InboxView from './views/InboxView';
import FloatingDashboardWindow from './components/FloatingDashboardWindow';
import MobileBottomNav from './components/MobileBottomNav';
import NotificationManager from './components/NotificationManager';
import { useData } from './contexts/DataContext';
import { Menu, GraduationCap } from 'lucide-react';



function MobileTopBar({ onOpenMenu }) {
  return (
    <header className="flex md:hidden items-center justify-between px-3.5 py-2.5 bg-gray-900 border-b border-gray-800 z-20 flex-shrink-0 shadow-sm w-full max-w-full">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          className="p-1.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
          title="Otwórz menu i przedmioty"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-1.5 min-w-0">
          <GraduationCap size={18} className="text-white flex-shrink-0" />
          <span className="text-sm font-bold text-white truncate">StudyOrganizer</span>
        </div>
      </div>
    </header>
  );
}

function AppShell() {
  const { user, loading, selectedCourseId } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Ładowanie...</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <DataProvider>
      <NotificationManager />
      <div className="flex h-screen bg-gray-950 text-white overflow-hidden relative w-full max-w-full">
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <div className="flex-1 overflow-hidden flex flex-col relative w-full max-w-full min-w-0">
          <MobileTopBar onOpenMenu={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative pb-16 md:pb-0 w-full max-w-full min-w-0">
            <Routes>
              <Route path="/" element={<Navigate to="/today" replace />} />
              <Route path="/today" element={<TodayView />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/tasks" element={<TasksView />} />
              <Route path="/inbox" element={<InboxView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/course/:courseId" element={<CourseView />} />
            </Routes>
            <FloatingDashboardWindow />
          </main>
          <MobileBottomNav onOpenMobileMenu={() => setMobileOpen(true)} />
        </div>
      </div>
    </DataProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* OAuth callback routes — outside the authenticated shell */}
          <Route path="/auth/discord" element={<DiscordAuthCallback />} />
          <Route path="/auth/microsoft" element={<MicrosoftAuthCallback />} />
          {/* Everything else */}
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
