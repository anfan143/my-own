import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string;
  payment_percentage: number;
  status: 'pending' | 'in_progress' | 'completed';
  completion_date: string | null;
  created_at: string;
  updated_at: string;
}

interface MilestoneState {
  milestones: Milestone[];
  loading: boolean;
  error: string | null;
  loadMilestones: (projectId: string) => Promise<void>;
  createMilestone: (milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at' | 'completion_date' | 'status'>) => Promise<void>;
  updateMilestone: (id: string, milestone: Partial<Milestone>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  updateMilestoneStatus: (id: string, status: Milestone['status']) => Promise<void>;
}

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  milestones: [],
  loading: false,
  error: null,

  loadMilestones: async (projectId) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      set({ milestones: data || [], error: null });
    } catch (error) {
      console.error('Error loading milestones:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load milestones';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  createMilestone: async (milestone) => {
    try {
      set({ loading: true, error: null });

      // Check total payment percentage
      const { data: existingMilestones } = await supabase
        .from('project_milestones')
        .select('payment_percentage')
        .eq('project_id', milestone.project_id);

      const totalPercentage = (existingMilestones || [])
        .reduce((sum, m) => sum + (m.payment_percentage || 0), 0);

      if (totalPercentage + milestone.payment_percentage > 100) {
        throw new Error('Total payment percentage cannot exceed 100%');
      }

      const { error } = await supabase
        .from('project_milestones')
        .insert(milestone);

      if (error) throw error;
      
      toast.success('Milestone created successfully');
      await get().loadMilestones(milestone.project_id);
    } catch (error) {
      console.error('Error creating milestone:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create milestone';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  updateMilestone: async (id, milestone) => {
    try {
      set({ loading: true, error: null });

      if (milestone.payment_percentage) {
        // Check total payment percentage
        const { data: currentMilestone } = await supabase
          .from('project_milestones')
          .select('project_id, payment_percentage')
          .eq('id', id)
          .single();

        if (currentMilestone) {
          const { data: existingMilestones } = await supabase
            .from('project_milestones')
            .select('payment_percentage')
            .eq('project_id', currentMilestone.project_id)
            .neq('id', id);

          const totalPercentage = (existingMilestones || [])
            .reduce((sum, m) => sum + (m.payment_percentage || 0), 0);

          if (totalPercentage + milestone.payment_percentage > 100) {
            throw new Error('Total payment percentage cannot exceed 100%');
          }
        }
      }

      const { error } = await supabase
        .from('project_milestones')
        .update(milestone)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Milestone updated successfully');
      const { data: updated } = await supabase
        .from('project_milestones')
        .select('project_id')
        .eq('id', id)
        .single();

      if (updated) {
        await get().loadMilestones(updated.project_id);
      }
    } catch (error) {
      console.error('Error updating milestone:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update milestone';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  deleteMilestone: async (id) => {
    try {
      set({ loading: true, error: null });

      // Get project_id before deletion
      const { data: milestone } = await supabase
        .from('project_milestones')
        .select('project_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('project_milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Milestone deleted successfully');
      if (milestone) {
        await get().loadMilestones(milestone.project_id);
      }
    } catch (error) {
      console.error('Error deleting milestone:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete milestone';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  updateMilestoneStatus: async (id, status) => {
    try {
      set({ loading: true, error: null });

      const updates: any = {
        status,
        completion_date: status === 'completed' ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('project_milestones')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Milestone status updated successfully');
      const { data: updated } = await supabase
        .from('project_milestones')
        .select('project_id')
        .eq('id', id)
        .single();

      if (updated) {
        await get().loadMilestones(updated.project_id);
      }
    } catch (error) {
      console.error('Error updating milestone status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update milestone status';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  }
}));