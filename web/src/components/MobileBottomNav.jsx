import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, Calendar, CheckSquare, Settings, Menu } from 'lucide-react';
import { useData } from '../contexts/DataContext';

export default function MobileBottomNav({ onOpenMobileMenu }) {
  const { tasks } = useData();
  const unreadTasks = tasks.filter((t) => !t.done).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 px-2 py-1 flex items-center justify-around shadow-2xl safe-area-pb">
      <NavLink
        to="/today"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
            isActive ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        <CalendarDays size={18} />
        <span className="mt-0.5">Dziś</span>
      </NavLink>

      <NavLink
        to="/calendar"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
            isActive ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        <Calendar size={18} />
        <span className="mt-0.5">Plan</span>
      </NavLink>

      <NavLink
        to="/tasks"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all relative ${
            isActive ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        <div className="relative">
          <CheckSquare size={18} />
          {unreadTasks > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none shadow">
              {unreadTasks > 9 ? '9+' : unreadTasks}
            </span>
          )}
        </div>
        <span className="mt-0.5">Zadania</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-all ${
            isActive ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-200'
          }`
        }
      >
        <Settings size={18} />
        <span className="mt-0.5">Ustawienia</span>
      </NavLink>

      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold text-gray-400 hover:text-white transition-all"
      >
        <Menu size={18} />
        <span className="mt-0.5">Menu</span>
      </button>
    </nav>
  );
}
