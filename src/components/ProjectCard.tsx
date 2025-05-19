import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, DollarSign } from 'lucide-react';
import type { CustomerProject } from '../types/supabase';

interface ProjectCardProps {
  project: CustomerProject;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0">
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900">
              {project.name}
              <span className="ml-2 text-sm text-gray-500">
                #{project.project_number}
              </span>
            </h3>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {project.description}
            </p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">{new Date(project.start_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
          <div className="flex items-center sm:col-span-2">
            <DollarSign className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">
              ${project.budget_min.toLocaleString()} - ${project.budget_max.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}