import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Handles Microsoft OAuth2 redirect: /auth/microsoft?code=...
export default function MicrosoftAuthCallback() {
  const navigate = useNavigate();
  const { user, saveToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      navigate('/settings');
      return;
    }

    const exchange = async () => {
      try {
        const res = await fetch('/api/auth/microsoft/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, uid: user?.uid }),
        });
        const data = await res.json();

        if (data.access_token && user) {
          await saveToken(user.uid, 'microsoft', {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + data.expires_in * 1000,
          });
        }
      } catch (err) {
        console.error('Microsoft token exchange failed:', err);
      }
      navigate('/settings');
    };

    exchange();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 text-sm animate-pulse">
        Łączę z Microsoft Teams...
      </div>
    </div>
  );
}
