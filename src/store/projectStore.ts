import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import toast from 'react-hot-toast';

type CustomerProject = Database['public']['Tables']['customer_projects']['Row'];
type ProjectProvider = Database['public']['Tables']['project_providers']['Row'];

interface ProjectState {
  projects: CustomerProject[];
  selectedProject: CustomerProject | null;
  loading: boolean;
  error: string | null;
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<CustomerProject | null>;
  createProject: (project: Omit<CustomerProject, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProject: (id: string, project: Partial<CustomerProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  publishProject: (projectId: string) => Promise<void>;
  unpublishProject: (projectId: string) => Promise<void>;
  getProjectProviders: (projectId: string) => Promise<ProjectProvider[]>;
  respondToProject: (projectId: string, status: 'accepted' | 'rejected') => Promise<void>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProject: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadProjects: async () => {
    try {
      set({ loading: true, error: null });

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('customer_projects')
        .select('*')
        .eq('customer_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ projects: data || [], error: null });
    } catch (error) {
      console.error('Error loading projects:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load projects';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  loadProject: async (id) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('customer_projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      set({ selectedProject: data, error: null });
      return data;
    } catch (error) {
      console.error('Error loading project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load project';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    } finally {
      set({ loading: false });
    }
  },

  createProject: async (project) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('customer_projects')
        .insert(project)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Project created successfully');
      await get().loadProjects();
      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateProject: async (id, project) => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase
        .from('customer_projects')
        .update(project)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Project updated successfully');
      await get().loadProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update project';
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteProject: async (id) => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase
        .from('customer_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Project deleted successfully');
      await get().loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete project';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  publishProject: async (projectId) => {
    try {
      set({ loading: true, error: null });
      
      // Get project details
      const { data: project } = await supabase
        .from('customer_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (!project) throw new Error('Project not found');

      // Find providers offering the required service
      const { data: providers } = await supabase
        .from('provider_services')
        .select('provider_id')
        .eq('service_category', project.category);

      if (!providers?.length) {
        toast.success('No providers found for this service category');
        return;
      }

      // Get existing project providers
      const { data: existingProviders } = await supabase
        .from('project_providers')
        .select('provider_id')
        .eq('project_id', projectId);

      const existingProviderIds = new Set(existingProviders?.map(p => p.provider_id) || []);

      // Filter out providers that are already linked to the project
      const newProviders = providers.filter(provider => !existingProviderIds.has(provider.provider_id));

      if (newProviders.length === 0) {
        toast.success('All eligible providers are already linked to this project');
        return;
      }

      // Update project status to published
      const { error: updateError } = await supabase
        .from('customer_projects')
        .update({ status: 'published' })
        .eq('id', projectId);

      if (updateError) throw updateError;

      // Create project_providers entries only for new providers
      const projectProviders = newProviders.map(provider => ({
        project_id: projectId,
        provider_id: provider.provider_id,
        status: 'pending'
      }));

      const { error: linkError } = await supabase
        .from('project_providers')
        .insert(projectProviders);

      if (linkError) throw linkError;

      toast.success(`Project published successfully! ${newProviders.length} providers notified.`);
      await get().loadProjects();
    } catch (error) {
      console.error('Error publishing project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish project';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  unpublishProject: async (projectId) => {
    try {
      set({ loading: true, error: null });
      
      // Delete all project_providers entries
      const { error: deleteError } = await supabase
        .from('project_providers')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) throw deleteError;

      // Update project status back to draft
      const { error: updateError } = await supabase
        .from('customer_projects')
        .update({ status: 'draft' })
        .eq('id', projectId);

      if (updateError) throw updateError;

      toast.success('Project unpublished successfully');
      await get().loadProjects();
    } catch (error) {
      console.error('Error unpublishing project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to unpublish project';
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  getProjectProviders: async (projectId) => {
    try {
      set({ error: null });
      const { data, error } = await supabase
        .from('project_providers')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading project providers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load project providers';
      set({ error: errorMessage });
      toast.error(errorMessage);
      return [];
    }
  },

  respondToProject: async (projectId, status) => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase
        .from('project_providers')
        .update({ status })
        .eq('project_id', projectId)
        .eq('provider_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;
      toast.success(`Project ${status} successfully`);
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