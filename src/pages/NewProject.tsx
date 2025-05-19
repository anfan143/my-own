import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { Calendar, MapPin, DollarSign } from 'lucide-react';
import type { ServiceCategory } from '../types/supabase';
import { supabase } from '../lib/supabase';

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

interface ProjectForm {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  category: ServiceCategory;
  budget_min: number;
  budget_max: number;
}

export function NewProject() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createProject, publishProject } = useProjectStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectForm>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    category: 'General Renovation',
    budget_min: 0,
    budget_max: 0
  });
  const [publishOnCreate, setPublishOnCreate] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

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

      const { data: projectData, error: submitError } = await supabase
        .from('customer_projects')
        .insert({
          customer_id: user.id,
          ...formData,
          status: 'draft'
        })
        .select()
        .single();

      if (submitError) {
        throw submitError;
      }

      if (projectData && publishOnCreate) {
        await publishProject(projectData.id);
      }

      navigate('/projects');
    } catch (err) {
      console.error('Error creating project:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : (err as { message?: string })?.message || 'Failed to create project'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Define Your Project</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

          <div className="flex items-center">
            <input
              type="checkbox"
              id="publishOnCreate"
              checked={publishOnCreate}
              onChange={(e) => setPublishOnCreate(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="publishOnCreate" className="ml-2 block text-sm text-gray-900">
              Publish project immediately
            </label>
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
              {loading ? 'Creating...' : publishOnCreate ? 'Create & Publish Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}