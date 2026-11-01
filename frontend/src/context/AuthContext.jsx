import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  auth,
  isFirebaseConfigured,
  loginWithGoogle,
  loginAsGuest,
  logoutUser
} from '../lib/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { setTokenProvider, api } from '../lib/api.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [lockedActionNotice, setLockedActionNotice] = useState('');

  // Fetch or sync user profile from backend
  const syncProfile = useCallback(async () => {
    try {
      const res = await api.getMe();
      if (res && res.user) {
        setProfile(res.user);
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to sync profile:', err.message);
    }
  }, []);

  useEffect(() => {
    // Configure API token getter
    setTokenProvider(async () => {
      if (auth && auth.currentUser) {
        return await auth.currentUser.getIdToken();
      }
      const devUser = localStorage.getItem('unimate_dev_user');
      if (devUser) {
        const parsed = JSON.parse(devUser);
        return parsed.isAnonymous ? `dev-guest:${parsed.uid}` : `dev-user:${parsed.uid}`;
      }
      return null;
    });

    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          await syncProfile();
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Local development fallback
      const storedDevUser = localStorage.getItem('unimate_dev_user');
      if (storedDevUser) {
        try {
          const parsed = JSON.parse(storedDevUser);
          setCurrentUser(parsed);
          syncProfile();
        } catch {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    }
  }, [syncProfile]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const user = await loginWithGoogle();
      setCurrentUser(user);
      setShowGoogleModal(false);
      await syncProfile();
      return user;
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      const guest = await loginAsGuest();
      setCurrentUser(guest);
      setShowGoogleModal(false);
      await syncProfile();
      return guest;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setProfile(null);
  };

  /**
   * Guards non-anonymous actions: if user is guest or not signed in,
   * opens friendly modal and preserves their current place/view.
   */
  const guardNonAnonymous = (actionNotice = 'Sign in with Google to use this feature.') => {
    if (!currentUser || currentUser.isAnonymous) {
      setLockedActionNotice(actionNotice);
      setShowGoogleModal(true);
      return false;
    }
    return true;
  };

  const isGuest = Boolean(currentUser && currentUser.isAnonymous);
  const isAuthenticated = Boolean(currentUser);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        isAuthenticated,
        isGuest,
        showGoogleModal,
        setShowGoogleModal,
        lockedActionNotice,
        guardNonAnonymous,
        loginWithGoogle: handleGoogleLogin,
        loginAsGuest: handleGuestLogin,
        logout: handleLogout,
        refreshProfile: syncProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

