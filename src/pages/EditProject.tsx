import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { Calendar, MapPin, DollarSign, Users } from 'lucide-react';
import { ProjectProposals } from '../components/ProjectProposals';
import type { ServiceCategory } from '../types/supabase';
import { format } from 'date-fns';

const PROJECT_CATEGORIES: ServiceCategory[] = [
  'General Renovation',
  'Kitchen Remodeling',
  'Bathroom Remodeling',
  'Room Addition',
  'Outdoor Space',
  'Roofing',
  'Electrical Work',
  'Plumbing',
  'Flooring',
  'Painting',
  'Windows and Doors',
  'HVAC',
  'Other'
];

export function EditProject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadProject, updateProject, loading } = useProjectStore();
  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    category: 'General Renovation' as ServiceCategory,
    budget_min: 0,
    budget_max: 0,
    status: 'draft' as 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled'
  });

  useEffect(() => {
    if (id) {
      loadProjectData();
    }
  }, [id]);

  const loadProjectData = async () => {
    if (!id) return;
    const project = await loadProject(id);
    if (project) {
      setFormData({
        project_name: project.project_name,
        description: project.description || '',
        start_date: format(new Date(project.start_date), 'yyyy-MM-dd'),
        end_date: format(new Date(project.end_date), 'yyyy-MM-dd'),
        location: project.location,
        category: project.category,
        budget_min: project.budget_min,
        budget_max: project.budget_max,
        status: project.status
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      // Validate dates
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) {
        throw new Error('End date must be after start date');
      }

      // Validate budget
      if (formData.budget_max < formData.budget_min) {
        throw new Error('Maximum budget must be greater than minimum budget');
      }

      await updateProject(id, formData);
      navigate('/projects');
    } catch (err) {
      console.error('Error updating project:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Project Form */}
        <div className="bg-white rounded-lg shadow px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit Project</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Name</label>
              <input
                type="text"
                required
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Describe your project in detail..."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <div className="mt-1 relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <div className="mt-1 relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <div className="mt-1 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter project location"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Project Category</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceCategory })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {PROJECT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Budget Range</label>
              <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.budget_min}
                    onChange={(e) => setFormData({ ...formData, budget_min: parseInt(e.target.value) })}
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Minimum"
                  />
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.budget_max}
                    onChange={(e) => setFormData({ ...formData, budget_max: parseInt(e.target.value) })}
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Maximum"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Proposals Section */}
        {formData.status === 'published' && (
          <div className="bg-white rounded-lg shadow px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Proposals</h2>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <ProjectProposals projectId={id} />
          </div>
        )}
      </div>
    </div>
  );
}