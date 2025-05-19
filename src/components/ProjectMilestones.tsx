import React, { useState, useEffect } from 'react';
import { useMilestoneStore } from '../store/milestoneStore';
import { format } from 'date-fns';
import { Calendar, DollarSign, CheckCircle, Clock, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectMilestonesProps {
  projectId: string;
  isCustomer: boolean;
}

export function ProjectMilestones({ projectId, isCustomer }: ProjectMilestonesProps) {
  const { milestones, loading, loadMilestones, createMilestone, updateMilestone, deleteMilestone, updateMilestoneStatus } = useMilestoneStore();
  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    payment_percentage: 0
  });

  useEffect(() => {
    loadMilestones(projectId);
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingMilestone) {
        await updateMilestone(editingMilestone, formData);
      } else {
        await createMilestone({
          ...formData,
          project_id: projectId
        });
      }
      setShowForm(false);
      setEditingMilestone(null);
      setFormData({
        title: '',
        description: '',
        due_date: '',
        payment_percentage: 0
      });
    } catch (error) {
      console.error('Error saving milestone:', error);
    }
  };

  const handleEdit = (milestone: any) => {
    setFormData({
      title: milestone.title,
      description: milestone.description || '',
      due_date: milestone.due_date,
      payment_percentage: milestone.payment_percentage
    });
    setEditingMilestone(milestone.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this milestone?')) {
      await deleteMilestone(id);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    await updateMilestoneStatus(id, newStatus);
  };

  const totalPaymentPercentage = milestones.reduce((sum, m) => sum + m.payment_percentage, 0);
  const remainingPercentage = 100 - totalPaymentPercentage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Project Milestones</h2>
        {isCustomer && (
          <button
            onClick={() => setShowForm(true)}
            disabled={remainingPercentage <= 0}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Milestone
          </button>
        )}
      </div>

      {/* Payment Progress */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Payment Progress</span>
          <span className="text-sm font-medium text-gray-900">{totalPaymentPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${totalPaymentPercentage}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {remainingPercentage}% remaining to allocate
        </p>
      </div>

      {/* Milestone Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Percentage (Remaining: {remainingPercentage}%)
              </label>
              <input
                type="number"
                required
                min="0"
                max={editingMilestone ? undefined : remainingPercentage}
                value={formData.payment_percentage}
                onChange={(e) => setFormData({ ...formData, payment_percentage: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingMilestone(null);
                }}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                {editingMilestone ? 'Update' : 'Create'} Milestone
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className={`bg-white rounded-lg p-6 border ${
              milestone.status === 'completed' ? 'border-green-200' :
              milestone.status === 'in_progress' ? 'border-yellow-200' :
              'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{milestone.title}</h3>
                {milestone.description && (
                  <p className="mt-1 text-gray-600">{milestone.description}</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1.5" />
                    Due: {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <DollarSign className="h-4 w-4 mr-1.5" />
                    Payment: {milestone.payment_percentage}%
                  </div>
                </div>
              </div>

              {isCustomer ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(milestone)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(milestone.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStatusUpdate(milestone.id, 'pending')}
                    className={`p-1 ${
                      milestone.status === 'pending' ? 'text-gray-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <AlertCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(milestone.id, 'in_progress')}
                    className={`p-1 ${
                      milestone.status === 'in_progress' ? 'text-yellow-600' : 'text-gray-400 hover:text-yellow-600'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(milestone.id, 'completed')}
                    className={`p-1 ${
                      milestone.status === 'completed' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="mt-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                milestone.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                {milestone.completion_date && ` • Completed ${format(new Date(milestone.completion_date), 'MMM d, yyyy')}`}
              </span>
            </div>
          </div>
        ))}

        {milestones.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No milestones created yet</p>
            {isCustomer && (
              <p className="text-sm text-gray-400 mt-1">
                Create milestones to track project progress and payments
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}