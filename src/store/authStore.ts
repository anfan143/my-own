import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database, UserType, RoleType } from '../types/supabase';
import toast from 'react-hot-toast';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProviderProfile = Database['public']['Tables']['provider_profiles']['Row'];

interface AuthState {
  user: any | null;
  profile: Profile | null;
  providerProfile: ProviderProfile | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  loadProfile: () => Promise<void>;
  signUp: (email: string, password: string, userType: UserType, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  switchRole: () => Promise<{ redirectTo?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  providerProfile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user || null });

      if (session?.user) {
        await get().loadProfile();
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        set({ user: session?.user || null });
        
        if (session?.user) {
          await get().loadProfile();
        } else {
          set({ profile: null, providerProfile: null });
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  loadProfile: async () => {
    const { user } = get();
    if (!user) {
      set({ profile: null, providerProfile: null, loading: false });
      return;
    }

    try {
      set({ loading: true });
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_type, role_type, name, email, phone, location, created_at, updated_at')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      let providerProfile = null;
      if (profile.user_type === 'provider' || profile.role_type === 'both') {
        const { data: provider } = await supabase
          .from('provider_profiles')
          .select('id, business_name, business_description, profile_completion_percentage, available')
          .eq('id', user.id)
          .maybeSingle();

        providerProfile = provider;
      }

      set({ profile, providerProfile });
    } catch (error) {
      console.error('Error in loadProfile:', error);
      toast.error('Failed to load profile');
      set({ profile: null, providerProfile: null });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, userType, name) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            user_type: userType,
            role_type: 'single',
            name,
            email,
            phone: '',
            location: '',
          });

        if (profileError) throw profileError;

        if (userType === 'provider') {
          const { error: providerProfileError } = await supabase
            .from('provider_profiles')
            .insert({
              id: data.user.id,
              available: true,
              profile_completion_percentage: 0
            });

          if (providerProfileError) throw providerProfileError;
        }
        
        set({ user: data.user });
        await get().loadProfile();
        toast.success('Account created successfully!');
      }
    } catch (error) {
      console.error('Error in signUp:', error);
      toast.error('Failed to create account');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({ user: data.user });
      await get().loadProfile();
      toast.success('Signed in successfully!');
    } catch (error) {
      console.error('Error in signIn:', error);
      toast.error('Invalid email or password');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, profile: null, providerProfile: null });
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error in signOut:', error);
      toast.error('Failed to sign out');
    } finally {
      set({ loading: false });
    }
  },

  resetPassword: async (email) => {
    try {
      set({ loading: true });
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset instructions sent');
    } catch (error) {
      console.error('Error in resetPassword:', error);
      toast.error('Failed to send reset instructions');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  switchRole: async () => {
    const { user, profile } = get();
    if (!user || !profile) return { redirectTo: '/login' };

    try {
      set({ loading: true });

      const newUserType = profile.user_type === 'customer' ? 'provider' : 'customer';

      // If switching to provider, check if provider profile exists and is complete
      if (newUserType === 'provider') {
        const { data: existingProfile } = await supabase
          .from('provider_profiles')
          .select('id, business_name, business_description, profile_completion_percentage')
          .eq('id', user.id)
          .maybeSingle();

        // If provider profile doesn't exist, update profile first then create provider profile
        if (!existingProfile) {
          // First update the profile to provider
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              user_type: newUserType,
              role_type: 'both'
            })
            .eq('id', user.id);

          if (updateError) throw updateError;

          // Then create the provider profile
          const { error: createError } = await supabase
            .from('provider_profiles')
            .insert({
              id: user.id,
              available: true,
              profile_completion_percentage: 0
            })
            .select()
            .single();

          if (createError) throw createError;

          // Update local state
          set({ profile: { ...profile, user_type: newUserType, role_type: 'both' } });
          await get().loadProfile();
          
          return { redirectTo: '/provider-profile' };
        }

        // Check if the existing profile is complete
        if (!existingProfile.business_name || 
            !existingProfile.business_description || 
            existingProfile.profile_completion_percentage < 60) {
          return { redirectTo: '/provider-profile' };
        }
      }

      // Update profile type
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          user_type: newUserType,
          role_type: 'both'
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state and reload profile
      set({ profile: { ...profile, user_type: newUserType, role_type: 'both' } });
      await get().loadProfile();
      
      toast.success(`Switched to ${newUserType} role`);
      return {};
    } catch (error: any) {
      console.error('Error switching role:', error);
      const errorMessage = error.message || 'Failed to switch role. Please try again.';
      toast.error(errorMessage);
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));