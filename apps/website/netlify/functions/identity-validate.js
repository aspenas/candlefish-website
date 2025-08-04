// Netlify Function to validate and update roles on login
exports.handler = async (event, context) => {
  const { user } = JSON.parse(event.body);
  
  // This function runs on every login to ensure roles are up to date
  // It uses the same logic as identity-signup.js
  
  const ROLES = {
    ADMIN: 'admin',
    CORE_FAMILY: 'core-family',
    EXTENDED_FAMILY: 'extended-family',
    SENSITIVE_LEGAL: 'sensitive-legal'
  };
  
  // User mappings (same as signup)
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
  let roles = [ROLES.EXTENDED_FAMILY]; // Default role
  
  // Get user email and GitHub username
  const email = user.email?.toLowerCase();
  const githubUsername = user.app_metadata?.provider === 'github' 
    ? user.user_metadata?.login?.toLowerCase() 
    : null;
  
  // Assign roles
  if (ADMIN_USERS.emails.includes(email) || 
      (githubUsername && ADMIN_USERS.github.includes(githubUsername))) {
    roles.push(ROLES.ADMIN);
  }
  
  if (CORE_FAMILY_USERS.emails.includes(email) || 
      (githubUsername && CORE_FAMILY_USERS.github.includes(githubUsername))) {
    roles.push(ROLES.CORE_FAMILY);
  }
  
  if (SENSITIVE_LEGAL_USERS.emails.includes(email) || 
      (githubUsername && SENSITIVE_LEGAL_USERS.github.includes(githubUsername))) {
    roles.push(ROLES.SENSITIVE_LEGAL);
  }
  
  // @candlefish.ai domain handling
  if (email && email.endsWith('@candlefish.ai')) {
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
        ...user.app_metadata,
        roles: roles,
        authorization: {
          roles: roles
        }
      }
    })
  };
};