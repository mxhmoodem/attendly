import { useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext, type User } from './AuthContext';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // TODO: Implement login logic
      console.log('Login:', email, password);
      // setUser({ email, uid: 'example' }); // When implementing real auth
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setLoading(true);
    try {
      // TODO: Implement registration logic
      console.log('Register:', email, password);
      // setUser({ email, uid: 'example' });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // TODO: Implement logout logic
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value = { user, login, register, logout, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}