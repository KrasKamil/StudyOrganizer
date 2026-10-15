import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Tokens for connected services
  const [microsoftToken, setMicrosoftToken] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);

  useEffect(() => {
    // Set Firebase to persist login forever (localStorage)
    setPersistence(auth, browserLocalPersistence).then(() => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          // Load stored OAuth tokens for other services
          await loadLinkedTokens(firebaseUser.uid);
        } else {
          setUser(null);
          setMicrosoftToken(null);
          setGoogleToken(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    });
  }, []);

  const loadLinkedTokens = async (uid) => {
    try {
      const tokenDoc = await getDoc(doc(db, 'tokens', uid));
      if (tokenDoc.exists()) {
        const data = tokenDoc.data();
        if (data.discord) setDiscordToken(data.discord);
        if (data.microsoft) setMicrosoftToken(data.microsoft);
        if (data.googleCalendar) {
          const tok = typeof data.googleCalendar === 'string' 
            ? data.googleCalendar 
            : data.googleCalendar.accessToken;
          setGoogleToken(tok);
        }
      }
    } catch (err) {
      console.warn('Failed to load linked tokens:', err);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Save Google Calendar access token for Calendar API calls
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || result._tokenResponse?.oauthAccessToken;

      if (accessToken) {
        try {
          await saveToken(result.user.uid, 'googleCalendar', {
            accessToken: accessToken,
            email: result.user.email,
          });
          setGoogleToken(accessToken);
        } catch (tokenErr) {
          console.warn('Could not save calendar token to Firestore (check rules):', tokenErr);
          setGoogleToken(accessToken);
        }
      }

      // Upsert user profile in Firestore (wrapped in try/catch so missing Firestore doesn't brick login)
      try {
        await setDoc(
          doc(db, 'users', result.user.uid),
          {
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (firestoreErr) {
        console.warn('Firestore user profile write failed (is Firestore created in test mode?):', firestoreErr);
      }

      return result.user;
    } catch (err) {
      console.error('Login error:', err);
      alert('Błąd logowania: ' + (err.message || err.code));
      throw err;
    }
  };

  const refreshGoogleToken = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || result._tokenResponse?.oauthAccessToken;
      if (accessToken && user) {
        setGoogleToken(accessToken);
        await saveToken(user.uid, 'googleCalendar', {
          accessToken: accessToken,
          email: user.email,
        });
        return accessToken;
      }
    } catch (err) {
      console.warn('Could not refresh Google token:', err);
      throw err;
    }
  };

  const saveToken = async (uid, service, tokenData) => {
    await setDoc(
      doc(db, 'tokens', uid),
      { [service]: tokenData, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  // Microsoft OAuth — redirect flow (MSAL-lite)
  const connectMicrosoft = () => {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common';
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/microsoft`);
    const scopes = encodeURIComponent(
      'User.Read Calendars.Read Team.ReadBasic.All Channel.ReadBasic.All Files.Read.All ChannelMessage.Read.All offline_access'
    );
    window.location.href = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scopes}&response_mode=query`;
  };

  const logout = () => signOut(auth);

  const isMicrosoftConnected = !!microsoftToken;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        googleToken,
        microsoftToken,
        isMicrosoftConnected,
        loginWithGoogle,
        refreshGoogleToken,
        connectMicrosoft,
        saveToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
