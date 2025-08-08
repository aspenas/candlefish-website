import { response, validateAuth, logAudit } from '../utils/helpers.js';

// Claude prompt templates for copy/paste usage
const PROMPT_TEMPLATES = {
  onboarding: `You are an IT onboarding specialist for a small team (5-20 employees). Generate a comprehensive onboarding checklist for a new employee.

Employee Details:
- Name: [EMPLOYEE_NAME]
- Role: [JOB_TITLE]
- Department: [DEPARTMENT]
- Start Date: [START_DATE]
- Manager: [MANAGER_NAME]

Create a prioritized checklist with Pre-Day 1, Day 1, Week 1, and First Month tasks.`,

  setup: `You are creating personalized setup instructions for a new team member in a small organization.

User Profile:
- Name: [USER_NAME]
- Role: [ROLE]
- Technical Expertise: [LEVEL]
- Primary OS: [OS]

Generate step-by-step setup instructions tailored to their technical level.`,
};

export const handler = async (event) => {
  try {
    const user = await validateAuth(event);
    if (!user) {
      return response(401, { error: 'Unauthorized' });
    }

    const path = event.path;

    if (path.includes('/assist/onboarding')) {
      return await getOnboardingPrompt(JSON.parse(event.body), user);
    } else if (path.includes('/assist/setup')) {
      return await getSetupPrompt(JSON.parse(event.body), user);
    }

    return response(404, { error: 'Not found' });
  } catch (error) {
    console.error('Claude handler error:', error);
    return response(500, { error: 'Internal server error' });
  }
};

async function getOnboardingPrompt(data, user) {
  const { employeeName, jobTitle, department, startDate, managerName } = data;

  // Replace placeholders in template
  let prompt = PROMPT_TEMPLATES.onboarding
    .replace('[EMPLOYEE_NAME]', employeeName || 'New Employee')
    .replace('[JOB_TITLE]', jobTitle || 'Team Member')
    .replace('[DEPARTMENT]', department || 'Operations')
    .replace('[START_DATE]', startDate || 'Next Monday')
    .replace('[MANAGER_NAME]', managerName || 'Direct Manager');

  await logAudit({
    action: 'CLAUDE_PROMPT_GENERATED',
    userId: user.id,
    promptType: 'onboarding',
  });

  return response(200, {
    success: true,
    prompt,
    instructions: 'Copy this prompt and paste it into Claude.ai (your $200/month subscription)',
    note: 'No API costs - uses your existing Claude subscription',
  });
}

async function getSetupPrompt(data, user) {
  const { userName, role, technicalLevel, operatingSystem } = data;

  let prompt = PROMPT_TEMPLATES.setup
    .replace('[USER_NAME]', userName || 'New User')
    .replace('[ROLE]', role || 'Team Member')
    .replace('[LEVEL]', technicalLevel || 'Intermediate')
    .replace('[OS]', operatingSystem || 'Mac');

  await logAudit({
    action: 'CLAUDE_PROMPT_GENERATED',
    userId: user.id,
    promptType: 'setup',
  });

  return response(200, {
    success: true,
    prompt,
    instructions: 'Copy this prompt and paste it into Claude.ai',
    note: 'Customize the placeholders before submitting to Claude',
  });
}
