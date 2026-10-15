import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-lg">
            <GraduationCap size={34} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">StudyOrganizer</h1>
            <p className="text-sm text-gray-400 mt-1">Teleinformatyka AGH — wszystko w jednym miejscu</p>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {['USOS iCal', 'Google Calendar', 'Microsoft Teams', 'Discord', 'Powiadomienia GPS'].map(
            (f) => (
              <span
                key={f}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700"
              >
                {f}
              </span>
            )
          )}
        </div>

        {/* Login button */}
        <div className="space-y-3">
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-medium text-sm transition-colors shadow-lg"
          >
            {/* Google SVG icon */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.6 29.3 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.3 5.1 29.4 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 19.5-7.6 20.7-18H43.6z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.3 5.1 29.4 3 24 3 16.3 3 9.7 7.7 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 45c5.2 0 10-1.9 13.6-5l-6.3-5.3C29.4 36.4 26.8 37 24 37c-5.2 0-9.6-3.3-11.3-8H6.4C9.7 38.8 16.3 45 24 45z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3C41 35.3 44 30 44 24c0-1.4-.1-2.7-.4-4z"/>
            </svg>
            Zaloguj się przez Google
          </button>

          <p className="text-xs text-gray-600">
            Raz kliknij — aplikacja pozostaje zalogowana na stałe.<br />
            Teams i Discord połączysz po zalogowaniu w Ustawieniach.
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-700">
          Twoje dane są przechowywane wyłącznie na Twoim koncie Firebase.<br />
          Żadne dane nie są udostępniane stronom trzecim.
        </p>
      </div>
    </div>
  );
}
