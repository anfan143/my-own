import React from 'react';
import { useAuthStore } from '../store/authStore';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardNavigation } from '../components/DashboardNavigation';
import { ProviderProfileForm } from '../components/ProviderProfileForm';
import toast from 'react-hot-toast';

export function ProviderProfile() {
  const { profile } = useAuthStore();

  React.useEffect(() => {
    if (profile?.user_type === 'provider') {
      toast.success('Please complete your provider profile information below');
    }
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <DashboardNavigation />
        
        <div className="w-full lg:ml-64 p-4 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <DashboardHeader profile={profile} />
            <ProviderProfileForm />
          </div>
        </div>
      </div>
    </div>
  );
}