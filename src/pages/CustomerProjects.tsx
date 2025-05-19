import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Hammer, Calendar, DollarSign, Users, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { format } from 'date-fns';

export function CustomerProjects() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { projects, loading, error, loadProjects, publishProject, unpublishProject } = useProjectStore();

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Create New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Hammer className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
          <div className="mt-6">
            <Link
              to="/projects/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Create New Project
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {project.name}
                  <span className="ml-2 text-sm text-gray-500">
                    #{project.project_number}
                  </span>
                </h3>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{project.description}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {format(new Date(project.start_date), 'MMM d, yyyy')} -{' '}
                      {format(new Date(project.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span>
                      Budget: ${project.budget_min.toLocaleString()} - ${project.budget_max.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    project.status === 'published' ? 'bg-blue-100 text-blue-800' :
                    project.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    project.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}