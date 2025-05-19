import React from 'react';
import { Link } from 'react-router-dom';
import { ProjectCard } from './ProjectCard';
import type { CustomerProject } from '../types/supabase';

interface ProjectsListProps {
  projects: CustomerProject[];
  loading: boolean;
  title?: string;
  emptyMessage?: string;
  showViewAll?: boolean;
}

export function ProjectsList({ 
  projects, 
  loading, 
  title = "Recent Projects",
  emptyMessage = "No projects yet",
  showViewAll = true
}: ProjectsListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
      </div>
      
      <div className="divide-y divide-gray-200">
        {projects.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">{emptyMessage}</p>
            <p className="text-sm text-gray-400 mt-1">
              Projects will appear here once they are created
            </p>
          </div>
        ) : (
          <div className="grid gap-6 p-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {showViewAll && projects.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <Link
            to="/projects"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View all projects
          </Link>
        </div>
      )}
    </div>
  );
}