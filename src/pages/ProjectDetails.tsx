import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { ProjectMilestones } from '../components/ProjectMilestones';
import { ProjectProposals } from '../components/ProjectProposals';
import { useAuthStore } from '../store/authStore';
import { Calendar, MapPin, DollarSign, Edit, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedProject, loading, error, loadProject, publishProject, unpublishProject } = useProjectStore();
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject(id);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !selectedProject) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 rounded-lg p-4 text-red-700">
          {error || 'Project not found'}
        </div>
      </div>
    );
  }

  const handlePublish = async () => {
    try {
      await publishProject(selectedProject.id);
      setShowConfirmPublish(false);
    } catch (error) {
      console.error('Error publishing project:', error);
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishProject(selectedProject.id);
    } catch (error) {
      console.error('Error unpublishing project:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedProject.name}
              <span className="ml-2 text-sm text-gray-500">
                #{selectedProject.project_number}
              </span>
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              selectedProject.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              selectedProject.status === 'published' ? 'bg-blue-100 text-blue-800' :
              selectedProject.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
              selectedProject.status === 'completed' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {selectedProject.status.charAt(0).toUpperCase() + selectedProject.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {selectedProject.customer_id === user?.id && (
            <>
              <button
                onClick={() => navigate(`/projects/${selectedProject.id}/edit`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Edit Project
              </button>
              {selectedProject.status === 'draft' ? (
                <button
                  onClick={() => setShowConfirmPublish(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Publish Project
                </button>
              ) : selectedProject.status === 'published' && (
                <button
                  onClick={handleUnpublish}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Unpublish
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-white rounded-lg shadow px-6 py-8 mb-8">
        <div className="prose max-w-none">
          <p className="text-gray-600">{selectedProject.description}</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Timeline</h3>
            <div className="mt-2 flex items-center text-sm text-gray-900">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              {format(new Date(selectedProject.start_date), 'MMM d, yyyy')} -{' '}
              {format(new Date(selectedProject.end_date), 'MMM d, yyyy')}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Location</h3>
            <div className="mt-2 flex items-center text-sm text-gray-900">
              <MapPin className="h-5 w-5 text-gray-400 mr-2" />
              {selectedProject.location}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Budget Range</h3>
            <div className="mt-2 flex items-center text-sm text-gray-900">
              <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
              ${selectedProject.budget_min.toLocaleString()} - ${selectedProject.budget_max.toLocaleString()}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Category</h3>
            <div className="mt-2 text-sm text-gray-900">
              {selectedProject.category}
            </div>
          </div>
        </div>
      </div>

      {/* Publish Confirmation */}
      {showConfirmPublish && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Publish Project?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Publishing your project will make it visible to providers matching your requirements. They will be able to submit proposals for your project.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmPublish(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="mb-8">
        <ProjectMilestones
          projectId={selectedProject.id}
          isCustomer={selectedProject.customer_id === user?.id}
        />
      </div>

      {/* Proposals */}
      {selectedProject.status === 'published' && selectedProject.customer_id === user?.id && (
        <div className="bg-white rounded-lg shadow px-6 py-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Proposals</h2>
          <ProjectProposals projectId={selectedProject.id} />
        </div>
      )}
    </div>
  );
}