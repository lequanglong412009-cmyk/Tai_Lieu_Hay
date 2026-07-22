/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getProfile, signInWithGoogle, syncProfile } from '../services/marketplaceService';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut, signInWithRedirect, GoogleAuthProvider, getRedirectResult } from 'firebase/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for redirect result first
    getRedirectResult(auth).catch(err => console.error("Redirect login error:", err));

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let profile = await getProfile(firebaseUser.uid);
          if (!profile) {
             profile = await syncProfile(firebaseUser);
          }
          setUser(profile);
        } catch (error) {
          console.error("Failed to load profile", error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || undefined,
            isAdmin: false,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const normalizeError = (error: unknown) => {
    if (error instanceof Error) return { code: undefined, message: error.message };
    if (typeof error === 'object' && error !== null) {
      return {
        code: (error as { code?: string }).code,
        message: (error as { message?: string }).message,
      };
    }
    return { code: undefined, message: String(error) };
  };

  const login = async () => {
    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      const err = normalizeError(error);
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        // User closed the popup, do nothing silently
      } else if (err.code === 'auth/popup-blocked' || err.message?.includes('popup') || err.code === 'auth/web-storage-unsupported' || err.code === 'auth/unauthorized-domain') {
        // Fallback to redirect if popup is blocked or unsupported
        try {
           const provider = new GoogleAuthProvider();
           await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
           console.error("Redirect fallback failed:", redirectErr);
           alert("Không thể chuyển hướng đăng nhập. Vui lòng mở trang web bằng trình duyệt Safari hoặc Chrome.");
        }
      } else {
        console.error("Login failed:", error);
      }
      
      if (error && error.message && error.message.includes("In-app browser detected")) {
        // already alerted in signInWithGoogle
      } else if (error && (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user'))) {
        // User closed the popup, do nothing
      } else if (error && error.code === 'auth/missing-initial-state') {
         alert("⚠️ Lỗi trình duyệt: Không thể đăng nhập bằng trình duyệt Zalo/Facebook.\n\nVui lòng nhấn vào biểu tượng 3 chấm (⋮) ở góc phải màn hình và chọn 'Mở bằng trình duyệt' (Chrome/Safari) để có thể đăng nhập.");
      } else if (err.code !== 'auth/popup-blocked' && err.code !== 'auth/web-storage-unsupported' && err.code !== 'auth/unauthorized-domain') {
         alert(`Đăng nhập thất bại. Lỗi: ${err.message || 'Không xác định'}\n\n(Mã lỗi: ${err.code || 'unknown'})`);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
