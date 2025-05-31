Applying mobile-first design and optimizing scan results display for mobile devices in the ScanPage component.
```
```replit_final_file
import React from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ReceiptScanner from '@/components/receipt/ReceiptScanner';

const ScanPage: React.FC = () => {
  return (
    <div className="container mx-auto p-3 sm:p-4 min-h-screen flex flex-col max-w-md sm:max-w-none">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Receipt Scanner</h1>
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header title="Scan Receipt" />

      <main className="flex-1 overflow-y-auto">
        <ReceiptScanner />
      </main>

      <BottomNavigation activeTab="scan" />
    </div>
  );
};

export default ScanPage;