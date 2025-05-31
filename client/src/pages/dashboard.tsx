import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ActionCard from '@/components/dashboard/ActionCard';
import RecommendationCard from '@/components/dashboard/RecommendationCard';
import ReceiptScanner from '@/components/receipt/ReceiptScanner';

import ProfileSetup from '@/components/profile/ProfileSetup';
import { useQuery } from '@tanstack/react-query';
import { User, Recommendation } from '@/lib/types';

const Dashboard: React.FC = () => {
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);

  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user/profile'],
  });

  const { data: recommendations, isLoading: loadingRecommendations } = useQuery<Recommendation[]>({
    queryKey: ['/api/recommendations'],
  });

  

  return (
    <div className="max-w-md sm:max-w-4xl mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto p-3 sm:p-4 pb-20">
        <div className="p-4 pb-20">

          {/* Shopping Recommendations */}
          <section className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">Recommended Purchases</h3>
              <a href="/recommendations" className="text-slate-600 text-sm font-medium hover:text-slate-800">View All</a>
            </div>

            <div className="space-y-3">
              {loadingRecommendations ? (
                // Loading state
                Array(2).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 animate-pulse">
                    <div className="flex justify-between items-start">
                      <div className="w-2/3">
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                      </div>
                      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center w-3/4">
                          <div className="h-8 w-8 bg-gray-200 rounded-full mr-2"></div>
                          <div className="w-full">
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-full"></div>
                          </div>
                        </div>
                        <div className="h-5 w-14 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-10 bg-gray-200 rounded-lg mt-3"></div>
                    </div>
                  </div>
                ))
              ) : recommendations && recommendations.length > 0 ? (
                recommendations.slice(0, 3).map((recommendation, index) => (
                  <RecommendationCard key={index} recommendation={recommendation} />
                ))
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center text-gray-500">
                  <p>No recommendations available yet</p>
                  <p className="text-sm">Scan more receipts to get personalized recommendations</p>
                </div>
              )}
            </div>
          </section>

          
        </div>

        {/* Conditional Modals */}
        {showReceiptScanner && <ReceiptScanner />}

        {showProfileSetup && <ProfileSetup />}
      </main>

      <BottomNavigation activeTab="home" />
    </div>
  );
};

export default Dashboard;