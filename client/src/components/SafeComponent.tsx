
import React, { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface SafeComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

const SafeComponent: React.FC<SafeComponentProps> = ({ 
  children, 
  fallback,
  name = 'Component'
}) => {
  return (
    <ErrorBoundary 
      level="component"
      fallback={fallback}
      onError={(error, errorInfo) => {
        console.error(`Error in ${name}:`, error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default SafeComponent;
