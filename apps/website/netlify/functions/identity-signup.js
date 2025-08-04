// Netlify Function to handle role assignment on signup
exports.handler = async (event, context) => {
  const { user } = JSON.parse(event.body);
  
  // Role definitions
  const ROLES = {
    ADMIN: 'admin',
    CORE_FAMILY: 'core-family',
    EXTENDED_FAMILY: 'extended-family',
    SENSITIVE_LEGAL: 'sensitive-legal'
  };
  
  // User mappings
  const ADMIN_USERS = {
    emails: ['patrick@candlefish.ai'],
    github: ['aspenas']
  };
  
  const CORE_FAMILY_USERS = {
    emails: [
      'patrick@candlefish.ai',
      'karen@candlefish.ai',
      'tyler@candlefish.ai',
      'kendall@candlefish.ai',
      'trevor@candlefish.ai'
    ],
    github: ['aspenas', 'tyler812']
  };
  
  const SENSITIVE_LEGAL_USERS = {
    emails: [
      'patrick@candlefish.ai',
      'karen@candlefish.ai',
      'mike.mcintosh@candlefish.ai',
      'mmcintosh@candlefish.ai'
    ],
    github: ['aspenas']
  };
  
  // Initialize roles array
  let roles = [ROLES.EXTENDED_FAMILY]; // Default role for all authenticated users
  
  // Get user email and GitHub username
  const email = user.email?.toLowerCase();
  const githubUsername = user.user_metadata?.provider_data?.github?.login?.toLowerCase();
  
  // Assign roles based on email or GitHub username
  
  // Admin check
  if (ADMIN_USERS.emails.includes(email) || 
      (githubUsername && ADMIN_USERS.github.includes(githubUsername))) {
    roles.push(ROLES.ADMIN);
  }
  
  // Core family check
  if (CORE_FAMILY_USERS.emails.includes(email) || 
      (githubUsername && CORE_FAMILY_USERS.github.includes(githubUsername))) {
    roles.push(ROLES.CORE_FAMILY);
  }
  
  // Sensitive legal check
  if (SENSITIVE_LEGAL_USERS.emails.includes(email) || 
      (githubUsername && SENSITIVE_LEGAL_USERS.github.includes(githubUsername))) {
    roles.push(ROLES.SENSITIVE_LEGAL);
  }
  
  // Special handling for @candlefish.ai domain
  if (email && email.endsWith('@candlefish.ai')) {
    // All @candlefish.ai emails get at least core-family access
    if (!roles.includes(ROLES.CORE_FAMILY)) {
      roles.push(ROLES.CORE_FAMILY);
    }
  }
  
  // Remove duplicates
  roles = [...new Set(roles)];
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      app_metadata: {
        roles: roles,
        authorization: {
          roles: roles
        }
      },
      user_metadata: {
        ...user.user_metadata,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0]
      }
    })
  };
};