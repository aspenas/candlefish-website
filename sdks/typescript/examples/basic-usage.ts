/**
 * Basic Usage Example for Candlefish Claude Config SDK
 * 
 * This example demonstrates the fundamental operations:
 * - Creating a client
 * - Managing configuration profiles
 * - Error handling
 */

import { createClientWithApiKey, formatError, validateProfile } from '@candlefish/claude-config';

async function main() {
  // Initialize the client with your API key
  const client = createClientWithApiKey(
    process.env.CANDLEFISH_API_KEY || 'your-api-key-here'
  );

  try {
    // Check API health
    const health = await client.healthCheck();
    console.log('API Health:', health);

    // Create a new configuration profile
    const newProfile = {
      name: 'Development Environment',
      version: '1.0.0',
      description: 'Configuration for local development',
      settings: {
        languages: ['typescript', 'javascript'],
        tools: ['npm', 'vite', 'eslint'],
        environment: {
          NODE_ENV: 'development',
          DEBUG: true
        }
      },
      metadata: {
        tags: ['development', 'typescript']
      }
    };

    // Validate the profile before creating
    const validation = validateProfile(newProfile);
    if (validation) {
      console.error('Validation failed:', formatError(validation));
      return;
    }

    // Create the profile
    console.log('Creating profile...');
    const createdProfile = await client.createProfile(newProfile);
    console.log('Created profile:', createdProfile.profile_id);

    // List all profiles
    console.log('Fetching all profiles...');
    const profiles = await client.listProfiles();
    console.log(`Found ${profiles.length} profiles`);

    // Get specific profile
    if (createdProfile.profile_id) {
      const fetchedProfile = await client.getProfile(createdProfile.profile_id);
      console.log('Fetched profile:', fetchedProfile.name);

      // Update the profile
      const updatedProfile = {
        ...fetchedProfile,
        description: 'Updated configuration for local development',
        settings: {
          ...fetchedProfile.settings,
          tools: [...(fetchedProfile.settings?.tools || []), 'prettier']
        }
      };

      const updated = await client.updateProfile(updatedProfile);
      console.log('Profile updated:', updated.profile_id);

      // Delete the profile (optional)
      // await client.deleteProfile(createdProfile.profile_id);
      // console.log('Profile deleted');
    }

  } catch (error) {
    console.error('Error:', formatError(error as Error));
  }
}

// Run the example
main().catch(console.error);