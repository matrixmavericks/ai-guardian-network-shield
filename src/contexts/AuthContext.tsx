
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, logout as logoutService, login as loginService, User } from '@/services/localStorageService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  login: (email: string, password: string, rememberMe: boolean) => User | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null, 
  isLoading: true,
  logout: () => {},
  login: () => null
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      setIsLoading(false);
    };

    loadUser();
    
    // Listen for storage events to handle logout from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aiConditioner_user' && e.newValue === null) {
        setUser(null);
      } else if (e.key === 'aiConditioner_user' && e.newValue) {
        setUser(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    logoutService();
    setUser(null);
  };

  const handleLogin = (email: string, password: string, rememberMe: boolean) => {
    const loggedInUser = loginService(email, password, rememberMe);
    if (loggedInUser) {
      setUser(loggedInUser);
    }
    return loggedInUser;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      logout: handleLogout,
      login: handleLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
