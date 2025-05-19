import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import toast from 'react-hot-toast';

type ProjectProposal = Database['public']['Tables']['project_proposals']['Row'];
type CustomerProject = Database['public']['Tables']['customer_projects']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type ProviderProfile = Database['public']['Tables']['provider_profiles']['Row'];

export interface EnrichedProposal extends ProjectProposal {
  provider: ProviderProfile & {
    profile: Profile;
  };
}

interface ProposalState {
  proposals: EnrichedProposal[];
  loading: boolean;
  submitProposal: (proposal: Omit<ProjectProposal, 'id' | 'created_at' | 'updated_at' | 'status'>) => Promise<void>;
  loadProposals: () => Promise<void>;
  loadProjectProposals: (projectId: string) => Promise<EnrichedProposal[]>;
  acceptProposal: (proposalId: string, projectId: string) => Promise<void>;
  rejectProposal: (proposalId: string) => Promise<void>;
}

export const useProposalStore = create<ProposalState>((set, get) => ({
  proposals: [],
  loading: false,

  submitProposal: async (proposal) => {
    try {
      set({ loading: true });

      // Validate quote amount is within project budget
      const { data: project } = await supabase
        .from('customer_projects')
        .select('budget_min, budget_max')
        .eq('id', proposal.project_id)
        .single();

      if (!project) throw new Error('Project not found');

      if (proposal.quote_amount < project.budget_min || proposal.quote_amount > project.budget_max) {
        throw new Error('Quote amount must be within project budget range');
      }

      // Check if proposal already exists
      const { data: existingProposal } = await supabase
        .from('project_proposals')
        .select('id')
        .match({
          project_id: proposal.project_id,
          provider_id: proposal.provider_id
        })
        .single();

      if (existingProposal) {
        throw new Error('You have already submitted a proposal for this project');
      }

      const { error } = await supabase
        .from('project_proposals')
        .insert({
          ...proposal,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Proposal submitted successfully');
      await get().loadProposals();
    } catch (error) {
      console.error('Error submitting proposal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit proposal');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  loadProposals: async () => {
    try {
      set({ loading: true });
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('project_proposals')
        .select(`
          *,
          provider:provider_profiles!inner(
            *,
            profile:profiles(*)
          )
        `)
        .eq('provider_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ proposals: data as EnrichedProposal[] });
    } catch (error) {
      console.error('Error loading proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      set({ loading: false });
    }
  },

  loadProjectProposals: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('project_proposals')
        .select(`
          *,
          provider:provider_profiles!inner(
            *,
            profile:profiles(*)
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EnrichedProposal[];
    } catch (error) {
      console.error('Error loading project proposals:', error);
      toast.error('Failed to load project proposals');
      return [];
    }
  },

  acceptProposal: async (proposalId: string, projectId: string) => {
    try {
      set({ loading: true });

      // Start a transaction
      const { error: proposalError } = await supabase
        .from('project_proposals')
        .update({ status: 'accepted' })
        .eq('id', proposalId);

      if (proposalError) throw proposalError;

      // Update project status
      const { error: projectError } = await supabase
        .from('customer_projects')
        .update({ status: 'in_progress' })
        .eq('id', projectId);

      if (projectError) throw projectError;

      // Reject other proposals
      const { error: rejectError } = await supabase
        .from('project_proposals')
        .update({ status: 'rejected' })
        .eq('project_id', projectId)
        .neq('id', proposalId);

      if (rejectError) throw rejectError;

      toast.success('Proposal accepted successfully');
    } catch (error) {
      console.error('Error accepting proposal:', error);
      toast.error('Failed to accept proposal');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  rejectProposal: async (proposalId: string) => {
    try {
      set({ loading: true });

      const { error } = await supabase
        .from('project_proposals')
        .update({ status: 'rejected' })
        .eq('id', proposalId);

      if (error) throw error;

      toast.success('Proposal rejected');
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      toast.error('Failed to reject proposal');
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));