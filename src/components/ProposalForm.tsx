import React, { useState } from 'react';
import { useProposalStore } from '../store/proposalStore';
import { Calendar, DollarSign, Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CustomerProject } from '../types/supabase';

interface ProposalFormProps {
  project: CustomerProject;
  providerId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProposalForm({ project, providerId, onSuccess, onCancel }: ProposalFormProps) {
  const { submitProposal, loading } = useProposalStore();
  const [formData, setFormData] = useState({
    quote_amount: project.budget_min,
    start_date: project.start_date,
    comments: '',
    portfolio_items: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await submitProposal({
        project_id: project.id,
        provider_id: providerId,
        ...formData
      });
      onSuccess?.();
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handlePortfolioSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setFormData(prev => ({
      ...prev,
      portfolio_items: selectedOptions
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Quote Amount</label>
        <div className="mt-1 relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="number"
            required
            min={project.budget_min}
            max={project.budget_max}
            value={formData.quote_amount}
            onChange={(e) => setFormData({ ...formData, quote_amount: parseFloat(e.target.value) })}
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Budget range: ${project.budget_min.toLocaleString()} - ${project.budget_max.toLocaleString()}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Earliest Start Date</label>
        <div className="mt-1 relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="date"
            required
            min={project.start_date}
            max={project.end_date}
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Project timeline: {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Comments</label>
        <textarea
          required
          rows={4}
          value={formData.comments}
          onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Describe your approach to this project..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Relevant Portfolio Items</label>
        <select
          multiple
          value={formData.portfolio_items}
          onChange={handlePortfolioSelect}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {/* Portfolio items will be populated from provider's portfolio */}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Hold Ctrl/Cmd to select multiple items
        </p>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Submitting...
            </>
          ) : (
            'Send Proposal'
          )}
        </button>
      </div>
    </form>
  );
}