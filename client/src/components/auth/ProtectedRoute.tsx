import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user && !isLoading) {
      // Check if user needs onboarding
      const needsOnboarding = localStorage.getItem('needsOnboarding');

      if (needsOnboarding === 'true' && location !== '/onboarding') {
        navigate('/onboarding');
        return;
      }

      // If user is on onboarding page but doesn't need it, redirect to dashboard
      if (location === '/onboarding' && needsOnboarding !== 'true') {
        navigate('/dashboard');
        return;
      }
    }
  }, [user, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;