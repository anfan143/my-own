import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import toast from 'react-hot-toast';

type ProjectProvider = Database['public']['Tables']['project_providers']['Row'];
type CustomerProject = Database['public']['Tables']['customer_projects']['Row'];
type ProjectProposal = Database['public']['Tables']['project_proposals']['Row'];

interface ProjectRequest extends ProjectProvider {
  project: CustomerProject & {
    customer: {
      name: string;
      email: string;
    };
  };
}

interface ProjectRequestState {
  requests: ProjectRequest[];
  stats: {
    pendingRequests: number;
    activeProjects: number;
    completedProjects: number;
  };
  loading: boolean;
  error: string | null;
  loadRequests: () => Promise<void>;
  respondToRequest: (projectId: string, status: 'accepted' | 'rejected') => Promise<void>;
}

export const useProjectRequestStore = create<ProjectRequestState>((set, get) => ({
  requests: [],
  stats: {
    pendingRequests: 0,
    activeProjects: 0,
    completedProjects: 0
  },
  loading: false,
  error: null,

  loadRequests: async () => {
    try {
      set({ loading: true, error: null });

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!sessionData.session?.user) {
        throw new Error('Please log in to view project requests');
      }

      const { data, error } = await supabase
        .from('project_providers')
        .select(`
          *,
          project:customer_projects(
            *,
            customer:profiles(
              name,
              email
            )
          )
        `)
        .eq('provider_id', sessionData.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out requests where project is null (unpublished)
      const validRequests = (data as unknown as ProjectRequest[]).filter(
        request => request.project !== null
      );
      
      set({
        requests: validRequests,
        stats: {
          pendingRequests: validRequests.filter(r => r.status === 'pending').length,
          activeProjects: validRequests.filter(r => r.status === 'accepted').length,
          completedProjects: validRequests.filter(r => r.status === 'completed').length,
        },
        error: null
      });
    } catch (error) {
      console.error('Error loading project requests:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load project requests';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  respondToRequest: async (projectId, status) => {
    try {
      set({ loading: true });
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session?.user) {
        throw new Error('Please log in to respond to project requests');
      }

      const { error } = await supabase
        .from('project_providers')
        .update({ status })
        .eq('project_id', projectId)
        .eq('provider_id', sessionData.session.user.id);

      if (error) throw error;
      toast.success(`Project ${status} successfully`);
      await get().loadRequests();
    } catch (error) {
      console.error('Error responding to project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to respond to project';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },
}));