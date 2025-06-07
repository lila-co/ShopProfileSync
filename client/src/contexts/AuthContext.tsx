import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Verify token is valid by fetching user profile
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.token && data.user) {
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call server logout endpoint to invalidate session
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-current-user-id': user?.id?.toString() || '1',
          },
        });
      }
    } catch (error) {
      console.error('Server logout failed:', error);
      // Continue with client-side cleanup even if server call fails
    } finally {
      // Clear all client-side state and session data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('listGenerationShown');
      localStorage.removeItem('lastLoginTime');
      localStorage.removeItem('forceShowAnimation');
      localStorage.removeItem('browserSessionId');
      
      // Clear session storage to ensure new session detection works
      sessionStorage.removeItem('shoppingListSessionStart');
      sessionStorage.removeItem('currentBrowserSession');
      
      // Clear any other auth-related data
      localStorage.removeItem('user_preferences');
      localStorage.removeItem('shopping_cart');
      
      // Reset user state
      setUser(null);
      setIsLoading(false);
      
      // Force a page reload to ensure complete session cleanup
      window.location.href = '/';
    }
  };

  // Helper method to clear auth state completely (useful for debugging)
  const clearAuthState = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setIsLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      checkAuth,
      clearAuthState
    }}>
      {children}
    </AuthContext.Provider>
  );
};