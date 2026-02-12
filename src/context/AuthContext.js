import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'tyariwale_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    } catch (e) {
      console.warn('AuthContext: failed to read session from localStorage', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (email, password) => {
    const dummyUser = {
      id: '1',
      name: 'Demo User',
      email: email || 'demo@example.com',
    };
    setUser(dummyUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dummyUser));
    } catch (e) {
      console.warn('AuthContext: failed to persist session', e);
    }
  };

  const signup = (name, email, password) => {
    const dummyUser = {
      id: '1',
      name: name || 'Demo User',
      email: email || 'demo@example.com',
    };
    setUser(dummyUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dummyUser));
    } catch (e) {
      console.warn('AuthContext: failed to persist session', e);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('AuthContext: failed to clear session', e);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
