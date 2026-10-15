import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// This page handles the Discord OAuth2 redirect: /auth/discord?code=...
export default function DiscordAuthCallback() {
  const navigate = useNavigate();
  const { user, saveToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      navigate('/settings');
      return;
    }

    // Exchange code for token via Cloud Function
    // The Cloud Function keeps the client_secret safe server-side
    const exchange = async () => {
      try {
        const res = await fetch('/api/auth/discord/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, uid: user?.uid }),
        });
        const data = await res.json();

        if (data.access_token && user) {
          await saveToken(user.uid, 'discord', {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + data.expires_in * 1000,
            username: data.user?.username,
          });
        }
      } catch (err) {
        console.error('Discord token exchange failed:', err);
      }
      navigate('/settings');
    };

    exchange();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 text-sm animate-pulse">
        Łączę z Discordem...
      </div>
    </div>
  );
}
