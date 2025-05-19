import {
  createTestAccounts,
  createTestProjects,
  submitTestProposals,
  cleanupTestData
} from './testUtils';

async function runTests() {
  console.log('Starting end-to-end tests...\n');

  try {
    // Clean up any existing test data
    console.log('Cleaning up existing test data...');
    await cleanupTestData();
    console.log('✓ Test data cleaned up\n');

    // Create test accounts
    console.log('Creating test accounts...');
    const accounts = await createTestAccounts();
    if (!accounts.success) throw new Error(accounts.error || 'Failed to create test accounts');
    console.log('✓ Test accounts created');
    console.log(`  - ${accounts.customers.length} customers`);
    console.log(`  - ${accounts.providers.length} providers\n`);

    // Create test projects
    console.log('Creating test projects...');
    const projects = await createTestProjects(accounts.customers[0].id);
    if (!projects.success) throw new Error(projects.error || 'Failed to create test projects');
    console.log('✓ Test projects created');
    console.log(`  - ${projects.projects.length} projects published\n`);

    // Submit test proposals
    console.log('Submitting test proposals...');
    const proposals = await submitTestProposals(
      accounts.providers[0].id,
      projects.projects[0].id
    );
    if (!proposals.success) throw new Error(proposals.error || 'Failed to submit test proposals');
    console.log('✓ Test proposals submitted');
    console.log(`  - ${proposals.proposals.length} proposals submitted\n`);

    console.log('All tests completed successfully! 🎉\n');

    // Return test data for further testing
    return {
      accounts,
      projects,
      proposals
    };
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

export { runTests };