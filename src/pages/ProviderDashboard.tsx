import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useProjectRequestStore } from '../store/projectRequestStore';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardNavigation } from '../components/DashboardNavigation';
import { ProjectSummaryCards } from '../components/ProjectSummaryCards';
import { ProjectsList } from '../components/ProjectsList';
import { AvailabilityManager } from '../components/AvailabilityManager';

export function ProviderDashboard() {
  const { profile, providerProfile } = useAuthStore();
  const { requests, stats, loading, loadRequests } = useProjectRequestStore();
  const [activeTab, setActiveTab] = React.useState<'overview' | 'availability'>('overview');
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (profile?.user_type === 'provider') {
      loadRequests();
    }
  }, [profile]);

  const filteredRequests = activeFilter
    ? requests.filter(request => {
        switch (activeFilter) {
          case 'pending':
            return request.status === 'pending';
          case 'active':
            return request.status === 'accepted';
          case 'completed':
            return request.status === 'completed';
          default:
            return true;
        }
      })
    : requests;

  if (!profile || !providerProfile) {
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

            <div className="border-b border-gray-200 mb-8">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`
                    whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('availability')}
                  className={`
                    whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === 'availability'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  Availability
                </button>
              </nav>
            </div>

            {activeTab === 'overview' ? (
              <>
                <ProjectSummaryCards 
                  isProvider={true}
                  stats={stats}
                  onFilterChange={setActiveFilter}
                  activeFilter={activeFilter}
                />

                <ProjectsList 
                  projects={filteredRequests.map(request => request.project)}
                  loading={loading}
                  title={activeFilter ? `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Projects` : 'All Projects'}
                  emptyMessage={activeFilter ? `No ${activeFilter} projects` : 'No project requests yet'}
                  showViewAll={!activeFilter}
                />
              </>
            ) : (
              <AvailabilityManager />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}