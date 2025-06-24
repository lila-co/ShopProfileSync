
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Wifi, WifiOff } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <Alert className="fixed top-4 left-4 right-4 z-50 bg-orange-100 border-orange-300">
      <WifiOff className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        You're offline. Your changes are being saved locally and will sync when you're back online.
      </AlertDescription>
    </Alert>
  );
};

export default OfflineIndicator;
