import { supabase } from '../lib/supabase';
import { testCustomers, testProviders, testProjects, testProposals } from './testData';

export async function createTestAccounts() {
  const results = {
    customers: [] as any[],
    providers: [] as any[],
    success: true,
    error: null as string | null
  };

  try {
    // Create customer accounts
    for (const customer of testCustomers) {
      // Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: customer.email,
        password: customer.password
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user!.id,
          ...customer.profile
        });

      if (profileError) throw profileError;

      results.customers.push({
        id: authData.user!.id,
        ...customer
      });
    }

    // Create provider accounts
    for (const provider of testProviders) {
      // Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: provider.email,
        password: provider.password
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user!.id,
          ...provider.profile
        });

      if (profileError) throw profileError;

      // Create provider profile
      const { error: providerError } = await supabase
        .from('provider_profiles')
        .insert({
          id: authData.user!.id,
          ...provider.provider_profile
        });

      if (providerError) throw providerError;

      // Create services
      const { error: servicesError } = await supabase
        .from('provider_services')
        .insert(
          provider.provider_profile.services.map(service => ({
            provider_id: authData.user!.id,
            ...service
          }))
        );

      if (servicesError) throw servicesError;

      // Create service areas
      const { error: areasError } = await supabase
        .from('service_areas')
        .insert(
          provider.provider_profile.service_areas.map(area => ({
            provider_id: authData.user!.id,
            ...area
          }))
        );

      if (areasError) throw areasError;

      results.providers.push({
        id: authData.user!.id,
        ...provider
      });
    }
  } catch (error) {
    results.success = false;
    results.error = error instanceof Error ? error.message : 'Unknown error occurred';
  }

  return results;
}

export async function createTestProjects(customerId: string) {
  const results = {
    projects: [] as any[],
    success: true,
    error: null as string | null
  };

  try {
    for (const project of testProjects) {
      const { data, error } = await supabase
        .from('customer_projects')
        .insert({
          customer_id: customerId,
          ...project,
          status: 'published'
        })
        .select()
        .single();

      if (error) throw error;
      results.projects.push(data);
    }
  } catch (error) {
    results.success = false;
    results.error = error instanceof Error ? error.message : 'Unknown error occurred';
  }

  return results;
}

export async function submitTestProposals(providerId: string, projectId: string) {
  const results = {
    proposals: [] as any[],
    success: true,
    error: null as string | null
  };

  try {
    for (const proposal of testProposals) {
      const { data, error } = await supabase
        .from('project_proposals')
        .insert({
          provider_id: providerId,
          project_id: projectId,
          ...proposal,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      results.proposals.push(data);
    }
  } catch (error) {
    results.success = false;
    results.error = error instanceof Error ? error.message : 'Unknown error occurred';
  }

  return results;
}

export async function cleanupTestData() {
  const testEmails = [...testCustomers, ...testProviders].map(user => user.email);
  
  try {
    // Get user IDs
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', testEmails);

    if (!users?.length) return;

    const userIds = users.map(user => user.id);

    // Delete all related data
    await Promise.all([
      supabase.from('project_proposals').delete().in('provider_id', userIds),
      supabase.from('provider_services').delete().in('provider_id', userIds),
      supabase.from('service_areas').delete().in('provider_id', userIds),
      supabase.from('customer_projects').delete().in('customer_id', userIds),
      supabase.from('provider_profiles').delete().in('id', userIds),
      supabase.from('profiles').delete().in('id', userIds)
    ]);

    // Delete auth users
    for (const email of testEmails) {
      await supabase.auth.admin.deleteUser(email);
    }
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}