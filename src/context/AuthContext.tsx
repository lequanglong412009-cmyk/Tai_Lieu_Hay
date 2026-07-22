import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getProfile, signInWithGoogle } from '../services/marketplaceService';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

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
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getProfile(firebaseUser.uid);
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

  const login = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error && (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user'))) {
        // User closed the popup, do nothing silently
      } else {
        console.error("Login failed:", error);
      }
      
      if (error && error.message && error.message.includes("In-app browser detected")) {
        // already alerted in signInWithGoogle
      } else if (error && (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user'))) {
        // User closed the popup, do nothing
      } else if (error && error.code === 'auth/missing-initial-state') {
         alert("⚠️ Lỗi trình duyệt: Không thể đăng nhập bằng trình duyệt Zalo/Facebook.\n\nVui lòng nhấn vào biểu tượng 3 chấm (⋮) ở góc phải màn hình và chọn 'Mở bằng trình duyệt' (Chrome/Safari) để có thể đăng nhập.");
      } else {
         alert("Đăng nhập thất bại. Vui lòng mở trang web bằng trình duyệt Safari hoặc Chrome và thử lại.");
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
