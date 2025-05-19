import React, { useState, useEffect } from 'react';
import { useProposalStore } from '../store/proposalStore';
import { format } from 'date-fns';
import { Star, DollarSign, Calendar, CheckCircle, XCircle, MessageCircle, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectProposalsProps {
  projectId: string;
}

type SortField = 'quote_amount' | 'start_date' | 'created_at';
type SortOrder = 'asc' | 'desc';

export function ProjectProposals({ projectId }: ProjectProposalsProps) {
  const { loadProjectProposals, acceptProposal, rejectProposal, loading } = useProposalStore();
  const [proposals, setProposals] = useState<EnrichedProposal[]>([]);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showConfirm, setShowConfirm] = useState<{ id: string; action: 'accept' | 'reject' } | null>(null);
  const [showMessageForm, setShowMessageForm] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProposals();
  }, [projectId]);

  const loadProposals = async () => {
    const data = await loadProjectProposals(projectId);
    setProposals(data);
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedProposals = [...proposals].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'quote_amount':
        return (a.quote_amount - b.quote_amount) * multiplier;
      case 'start_date':
        return (new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) * multiplier;
      case 'created_at':
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * multiplier;
      default:
        return 0;
    }
  });

  const handleAccept = async (proposalId: string) => {
    try {
      await acceptProposal(proposalId, projectId);
      await loadProposals();
      toast.success('Proposal accepted successfully');
    } catch (error) {
      toast.error('Failed to accept proposal');
    }
    setShowConfirm(null);
  };

  const handleReject = async (proposalId: string) => {
    try {
      await rejectProposal(proposalId);
      await loadProposals();
      toast.success('Proposal rejected');
    } catch (error) {
      toast.error('Failed to reject proposal');
    }
    setShowConfirm(null);
  };

  const handleSendMessage = async (providerId: string) => {
    try {
      // Message sending logic will be implemented here
      toast.success('Message sent successfully');
      setShowMessageForm(null);
      setMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-gray-700">Sort by:</span>
        <button
          onClick={() => handleSort('quote_amount')}
          className={`flex items-center space-x-1 ${sortField === 'quote_amount' ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Quote Amount</span>
          {sortField === 'quote_amount' && (
            <ArrowUpDown className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={() => handleSort('start_date')}
          className={`flex items-center space-x-1 ${sortField === 'start_date' ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <Calendar className="h-4 w-4" />
          <span>Start Date</span>
          {sortField === 'start_date' && (
            <ArrowUpDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {sortedProposals.map((proposal) => (
          <div
            key={proposal.id}
            className={`bg-white rounded-lg shadow-sm border ${
              proposal.status === 'accepted' ? 'border-green-200' :
              proposal.status === 'rejected' ? 'border-red-200' :
              'border-gray-200'
            }`}
          >
            <div className="p-6">
              {/* Provider Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {proposal.provider.business_name}
                  </h3>
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span>
                      {proposal.provider.average_rating?.toFixed(1) || 'Not rated'} ({proposal.provider.total_reviews || 0} reviews)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900">
                    ${proposal.quote_amount.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Starting {format(new Date(proposal.start_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Proposal Details */}
              <div className="mt-4">
                <p className="text-gray-700 whitespace-pre-line">{proposal.comments}</p>
              </div>

              {/* Portfolio Items */}
              {proposal.portfolio_items.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900">Relevant Portfolio Items</h4>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    {proposal.portfolio_items.map((item, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Form */}
              {showMessageForm === proposal.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    placeholder="Type your message..."
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowMessageForm(null);
                        setMessage('');
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSendMessage(proposal.provider.id)}
                      className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmation Dialog */}
              {showConfirm?.id === proposal.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">
                    {showConfirm.action === 'accept'
                      ? 'Are you sure you want to accept this proposal? This will reject all other proposals.'
                      : 'Are you sure you want to reject this proposal?'}
                  </p>
                  <div className="mt-3 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowConfirm(null)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (showConfirm.action === 'accept') {
                          handleAccept(proposal.id);
                        } else {
                          handleReject(proposal.id);
                        }
                      }}
                      className={`px-3 py-1.5 text-sm text-white rounded-md ${
                        showConfirm.action === 'accept'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {showConfirm.action === 'accept' ? 'Accept' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {proposal.status === 'pending' && (
                <div className="mt-6 flex items-center justify-end space-x-4">
                  <button
                    onClick={() => setShowMessageForm(proposal.id)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    Ask Question
                  </button>
                  <button
                    onClick={() => setShowConfirm({ id: proposal.id, action: 'reject' })}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => setShowConfirm({ id: proposal.id, action: 'accept' })}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Accept
                  </button>
                </div>
              )}

              {/* Status Badge */}
              {proposal.status !== 'pending' && (
                <div className="mt-6">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    proposal.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {proposals.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No proposals received yet</p>
          </div>
        )}
      </div>
    </div>
  );
}