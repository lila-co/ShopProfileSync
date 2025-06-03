
import React from 'react';
import { useLocation } from 'wouter';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

const OnboardingPage: React.FC = () => {
  const [, navigate] = useLocation();

  const handleOnboardingComplete = () => {
    // Clear the onboarding flag
    localStorage.removeItem('needsOnboarding');
    // Navigate to dashboard
    navigate('/dashboard');
  };

  return <OnboardingFlow onComplete={handleOnboardingComplete} />;
};

export default OnboardingPage;
