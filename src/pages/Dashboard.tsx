import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardNavigation } from '../components/DashboardNavigation';
import { ProjectSummaryCards } from '../components/ProjectSummaryCards';
import { ProjectsList } from '../components/ProjectsList';

export function Dashboard() {
  const { profile } = useAuthStore();
  const { projects, loading, error, loadProjects } = useProjectStore();
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      loadProjects();
    }
  }, [profile]);

  const stats = {
    pendingRequests: projects.filter(p => p.status === 'draft').length,
    activeProjects: projects.filter(p => p.status === 'in_progress').length,
    completedProjects: projects.filter(p => p.status === 'completed').length
  };

  const filteredProjects = activeFilter
    ? projects.filter(project => {
        switch (activeFilter) {
          case 'pending':
            return project.status === 'draft';
          case 'active':
            return project.status === 'in_progress';
          case 'completed':
            return project.status === 'completed';
          default:
            return true;
        }
      })
    : projects;

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <DashboardNavigation />

        <div className="w-full lg:ml-64 p-4 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <DashboardHeader 
              profile={profile}
              actionButton={{
                label: "New Project",
                href: "/projects/new"
              }}
            />

            <ProjectSummaryCards 
              isProvider={false}
              stats={stats}
              onFilterChange={setActiveFilter}
              activeFilter={activeFilter}
            />

            <ProjectsList 
              projects={filteredProjects}
              loading={loading}
              title={activeFilter ? `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Projects` : 'All Projects'}
              emptyMessage={activeFilter ? `No ${activeFilter} projects` : 'No projects yet'}
              showViewAll={!activeFilter}
            />
          </div>
        </div>
      </div>
    </div>
  );
}