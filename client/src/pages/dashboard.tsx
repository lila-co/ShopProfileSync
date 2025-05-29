import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import BottomNavigation from '@/components/layout/BottomNavigation';
import ActionCard from '@/components/dashboard/ActionCard';
import WeeklyDeals from '@/components/dashboard/WeeklyDeals';
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

  const { data: monthlySavings } = useQuery<number>({
    queryKey: ['/api/insights/monthly-savings'],
  });

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 pb-20">
          {/* Welcome Section */}
          <section className="mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">Hello, {user?.firstName || 'there'}</h2>
                <p className="text-gray-600 text-sm">Your shopping assistance is ready</p>
              </div>
              {monthlySavings !== undefined && monthlySavings > 0 && (
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium text-sm">
                  ${monthlySavings} saved this month
                </div>
              )}
            </div>
          </section>

          {/* Shopping Recommendations */}
          <section className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">Recommended Purchases</h3>
              <a href="/recommendations" className="text-primary text-sm font-medium">View All</a>
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

          {/* Weekly Deals */}
          <WeeklyDeals />

          {/* Quick Actions */}
          <section className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <ActionCard 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 9.5 14.5 14.5"/>
                    <path d="M14.5 9.5 9.5 14.5"/>
                    <rect width="16" height="16" x="4" y="4" rx="2"/>
                    <path d="M4 15h16"/>
                    <path d="M15 4v6"/>
                    <path d="M9 4v2"/>
                  </svg>
                }
                title="Add Receipt"
                subtitle="Scan or upload"
                onClick={() => setShowReceiptScanner(true)}
                iconBgColor="bg-primary/10"
              />

              <ActionCard 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                }
                title="View Profile"
                subtitle="Settings & preferences"
                onClick={() => window.location.href = '/profile'}
                iconBgColor="bg-accent/10"
              />
            </div>
          </section>

          {/* Quick Link to Shopping List */}
          <section className="mb-6">
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-primary mb-1">Shopping List</h3>
                  <p className="text-sm text-gray-600">Manage your shopping list and optimize your trips</p>
                </div>
                <a 
                  href="/shopping-list"
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  View List
                </a>
              </div>
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