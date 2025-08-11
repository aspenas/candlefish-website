/**
 * Finds the Figma file key for Candlefish by scanning projects in a team.
 * Inputs:
 *  - FIGMA_TOKEN (required)
 *  - TEAM_ID (optional, defaults to Candlefish team id if provided via CLI arg)
 *  - CLI arg[2]: Team ID override
 * Output: prints the file key to stdout on success; exits non-zero otherwise.
 */

const token = process.env.FIGMA_TOKEN;
const teamId = process.env.TEAM_ID || process.argv[2] || '1535668811882545162';

if (!token) {
  console.error('Missing FIGMA_TOKEN');
  process.exit(1);
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: { 'X-Figma-Token': token as string },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

async function main() {
  const projectsResp = await fetchJson(`https://api.figma.com/v1/teams/${teamId}/projects`);
  const projects: Array<{ id: string; name: string }> = projectsResp.projects || [];
  let foundKey = '';

  for (const project of projects) {
    try {
      const filesResp = await fetchJson(`https://api.figma.com/v1/projects/${project.id}/files`);
      const files: Array<{ key: string; name: string }> = filesResp.files || [];
      const match = files.find((f) => /Candlefish\s*—\s*Brand System/i.test(f.name) || /Candlefish/i.test(f.name));
      if (match?.key) {
        foundKey = match.key;
        break;
      }
    } catch {
      // skip project on error
    }
  }

  if (!foundKey) {
    process.exit(2);
  }

  process.stdout.write(foundKey);
}

main().catch(() => process.exit(1));
