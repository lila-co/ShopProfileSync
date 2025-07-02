import React from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ReceiptScanner from '@/components/receipt/ReceiptScanner';

const ScanPage: React.FC = () => {
  return (
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