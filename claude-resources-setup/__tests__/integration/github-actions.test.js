import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

describe('GitHub Actions Workflows Integration', () => {
  const workflowsDir = path.join(process.cwd(), '.github/workflows')

  describe('Workflow Files Validation', () => {
    let workflowFiles = []

    beforeAll(() => {
      if (fs.existsSync(workflowsDir)) {
        workflowFiles = fs.readdirSync(workflowsDir)
          .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
      }
    })

    it('should have Claude deployment workflow files', () => {
      const expectedWorkflows = [
        'claude-org-setup.yml',
        'claude-team-setup.yml',
        'claude-agents-sync.yml'
      ]

      expectedWorkflows.forEach(workflow => {
        expect(workflowFiles).toContain(workflow)
      })
    })

    it('should have valid YAML syntax in all workflow files', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')

        expect(() => {
          yaml.load(content)
        }).not.toThrow()
      })
    })

    it('should have required workflow structure', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const workflow = yaml.load(content)

        expect(workflow).toHaveProperty('name')
        expect(workflow).toHaveProperty('on')
        expect(workflow).toHaveProperty('jobs')
        expect(typeof workflow.jobs).toBe('object')
      })
    })
  })

  describe('Claude Organization Setup Workflow', () => {
    let workflow

    beforeAll(() => {
      const workflowPath = path.join(workflowsDir, 'claude-org-setup.yml')
      if (fs.existsSync(workflowPath)) {
        const content = fs.readFileSync(workflowPath, 'utf8')
        workflow = yaml.load(content)
      }
    })

    it('should trigger on repository dispatch and manual trigger', () => {
      expect(workflow?.on).toMatchObject({
        repository_dispatch: {
          types: ['setup-organization']
        },
        workflow_dispatch: {
          inputs: expect.objectContaining({
            organization: expect.any(Object),
            dry_run: expect.any(Object)
          })
        }
      })
    })

    it('should have setup-repos job with correct steps', () => {
      const setupJob = workflow?.jobs?.['setup-repos']

      expect(setupJob).toBeDefined()
      expect(setupJob['runs-on']).toBe('ubuntu-latest')

      const stepNames = setupJob.steps?.map(step => step.name) || []
      expect(stepNames).toContain('Checkout repository')
      expect(stepNames).toContain('Setup Node.js')
      expect(stepNames).toContain('Install dependencies')
      expect(stepNames).toContain('Run organization setup')
    })

    it('should use required environment variables', () => {
      const setupJob = workflow?.jobs?.['setup-repos']

      expect(setupJob?.env).toMatchObject({
        GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
        CLAUDE_API_KEY: '${{ secrets.CLAUDE_API_KEY }}'
      })
    })

    it('should have proper permissions', () => {
      expect(workflow?.permissions).toMatchObject({
        contents: 'write',
        'pull-requests': 'write',
        actions: 'write'
      })
    })
  })

  describe('Claude Team Setup Workflow', () => {
    let workflow

    beforeAll(() => {
      const workflowPath = path.join(workflowsDir, 'claude-team-setup.yml')
      if (fs.existsSync(workflowPath)) {
        const content = fs.readFileSync(workflowPath, 'utf8')
        workflow = yaml.load(content)
      }
    })

    it('should trigger on team member addition', () => {
      expect(workflow?.on).toMatchObject({
        repository_dispatch: {
          types: ['add-team-member']
        }
      })
    })

    it('should have member onboarding steps', () => {
      const onboardingJob = workflow?.jobs?.['onboard-member']

      expect(onboardingJob).toBeDefined()

      const stepNames = onboardingJob.steps?.map(step => step.name) || []
      expect(stepNames).toContain('Create member branch')
      expect(stepNames).toContain('Setup Claude resources')
      expect(stepNames).toContain('Create onboarding PR')
      expect(stepNames).toContain('Send welcome email')
    })

    it('should handle different member roles', () => {
      const onboardingJob = workflow?.jobs?.['onboard-member']

      // Should have conditional steps based on member role
      const conditionalSteps = onboardingJob.steps?.filter(step =>
        step.if && step.if.includes('github.event.client_payload.role')
      ) || []

      expect(conditionalSteps.length).toBeGreaterThan(0)
    })
  })

  describe('Claude Agents Sync Workflow', () => {
    let workflow

    beforeAll(() => {
      const workflowPath = path.join(workflowsDir, 'claude-agents-sync.yml')
      if (fs.existsSync(workflowPath)) {
        const content = fs.readFileSync(workflowPath, 'utf8')
        workflow = yaml.load(content)
      }
    })

    it('should run on schedule and manual trigger', () => {
      expect(workflow?.on).toMatchObject({
        schedule: expect.arrayContaining([
          expect.objectContaining({
            cron: expect.any(String)
          })
        ]),
        workflow_dispatch: expect.any(Object)
      })
    })

    it('should have sync job with matrix strategy', () => {
      const syncJob = workflow?.jobs?.['sync-repositories']

      expect(syncJob).toBeDefined()
      expect(syncJob.strategy?.matrix).toBeDefined()
      expect(syncJob.strategy.matrix.repository).toBeDefined()
    })

    it('should include failure handling', () => {
      const syncJob = workflow?.jobs?.['sync-repositories']

      const stepNames = syncJob.steps?.map(step => step.name) || []
      expect(stepNames).toContain('Handle sync failure')
      expect(stepNames).toContain('Create failure issue')
    })
  })

  describe('Workflow Script Dependencies', () => {
    it('should have setup scripts referenced in workflows', () => {
      const scriptsDir = path.join(process.cwd(), 'scripts')
      const expectedScripts = [
        'setup-claude-org-wide.sh',
        'setup-claude-worktrees.sh'
      ]

      expectedScripts.forEach(script => {
        const scriptPath = path.join(scriptsDir, script)
        expect(fs.existsSync(scriptPath)).toBe(true)
      })
    })

    it('should have executable permissions on shell scripts', () => {
      const scriptsDir = path.join(process.cwd(), 'scripts')
      const shellScripts = fs.readdirSync(scriptsDir)
        .filter(file => file.endsWith('.sh'))

      shellScripts.forEach(script => {
        const scriptPath = path.join(scriptsDir, script)
        const stats = fs.statSync(scriptPath)

        // Check if file has execute permissions (owner execute bit)
        expect(stats.mode & parseInt('100', 8)).toBeTruthy()
      })
    })
  })

  describe('Environment Variables and Secrets', () => {
    it('should document required secrets', () => {
      const readmePath = path.join(process.cwd(), 'README.md')

      if (fs.existsSync(readmePath)) {
        const readmeContent = fs.readFileSync(readmePath, 'utf8')

        const requiredSecrets = [
          'GITHUB_TOKEN',
          'CLAUDE_API_KEY'
        ]

        requiredSecrets.forEach(secret => {
          expect(readmeContent).toContain(secret)
        })
      }
    })

    it('should validate secrets usage in workflows', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')

        // Check that secrets are properly referenced
        const secretReferences = content.match(/\$\{\{\s*secrets\.\w+\s*\}\}/g) || []

        secretReferences.forEach(secretRef => {
          // Should follow proper format
          expect(secretRef).toMatch(/\$\{\{\s*secrets\.[A-Z_]+\s*\}\}/)
        })
      })
    })
  })

  describe('Workflow Concurrency and Resource Management', () => {
    it('should have proper concurrency controls', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const workflow = yaml.load(content)

        if (workflow.name?.includes('sync') || workflow.name?.includes('setup')) {
          expect(workflow.concurrency).toBeDefined()
          expect(workflow.concurrency.group).toBeDefined()
          expect(workflow.concurrency['cancel-in-progress']).toBeDefined()
        }
      })
    })

    it('should have timeout settings for long-running jobs', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const workflow = yaml.load(content)

        Object.values(workflow.jobs || {}).forEach(job => {
          if (job.steps?.some(step =>
            step.name?.includes('setup') ||
            step.name?.includes('sync')
          )) {
            expect(job['timeout-minutes']).toBeDefined()
            expect(job['timeout-minutes']).toBeGreaterThan(0)
          }
        })
      })
    })
  })

  describe('Error Handling and Notifications', () => {
    it('should have failure notification steps', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const workflow = yaml.load(content)

        Object.values(workflow.jobs || {}).forEach(job => {
          const hasFailureHandling = job.steps?.some(step =>
            step.if?.includes('failure()') ||
            step.name?.toLowerCase().includes('failure') ||
            step.name?.toLowerCase().includes('error')
          )

          if (job.steps?.length > 5) { // For complex jobs
            expect(hasFailureHandling).toBe(true)
          }
        })
      })
    })

    it('should create issues for critical failures', () => {
      const syncWorkflowPath = path.join(workflowsDir, 'claude-agents-sync.yml')

      if (fs.existsSync(syncWorkflowPath)) {
        const content = fs.readFileSync(syncWorkflowPath, 'utf8')
        const workflow = yaml.load(content)

        const syncJob = workflow.jobs?.['sync-repositories']
        const stepNames = syncJob.steps?.map(step => step.name) || []

        expect(stepNames).toContain('Create failure issue')
      }
    })
  })

  describe('Integration with External Services', () => {
    it('should handle GitHub API rate limits', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')

        if (content.includes('github.com/api') || content.includes('gh api')) {
          // Should have retry logic or rate limit handling
          expect(
            content.includes('retry') ||
            content.includes('sleep') ||
            content.includes('rate-limit')
          ).toBe(true)
        }
      })
    })

    it('should validate Claude API integration', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')

        if (content.includes('CLAUDE_API_KEY')) {
          // Should have proper error handling for API failures
          expect(
            content.includes('curl') &&
            content.includes('--fail')
          ).toBe(true)
        }
      })
    })
  })

  describe('Repository Structure Validation', () => {
    it('should validate Claude resources directory structure', () => {
      const validationSteps = []

      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const workflow = yaml.load(content)

        Object.values(workflow.jobs || {}).forEach(job => {
          job.steps?.forEach(step => {
            if (step.name?.includes('validate') || step.run?.includes('validate')) {
              validationSteps.push(step)
            }
          })
        })
      })

      expect(validationSteps.length).toBeGreaterThan(0)
    })

    it('should check for required files in setup workflows', () => {
      const setupWorkflowPath = path.join(workflowsDir, 'claude-org-setup.yml')

      if (fs.existsSync(setupWorkflowPath)) {
        const content = fs.readFileSync(setupWorkflowPath, 'utf8')

        const requiredFiles = [
          'CLAUDE.md',
          'claude_desktop_config.json',
          '.claude'
        ]

        requiredFiles.forEach(file => {
          expect(content).toContain(file)
        })
      }
    })
  })

  describe('Performance and Optimization', () => {
    it('should use caching for dependencies', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const workflow = yaml.load(content)

        Object.values(workflow.jobs || {}).forEach(job => {
          const hasNodeSetup = job.steps?.some(step =>
            step.uses?.includes('actions/setup-node')
          )

          if (hasNodeSetup) {
            const hasCache = job.steps?.some(step =>
              step.uses?.includes('actions/cache') ||
              step.with?.['cache']
            )

            expect(hasCache).toBe(true)
          }
        })
      })
    })

    it('should have efficient matrix strategies', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const workflow = yaml.load(content)

        Object.values(workflow.jobs || {}).forEach(job => {
          if (job.strategy?.matrix) {
            // Matrix should not be too large to avoid excessive resource usage
            const matrixSize = Object.values(job.strategy.matrix)
              .reduce((acc, values) => acc * (Array.isArray(values) ? values.length : 1), 1)

            expect(matrixSize).toBeLessThanOrEqual(20)
          }
        })
      })
    })
  })

  describe('Security Considerations', () => {
    it('should not expose sensitive information in logs', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')

        // Should not contain hardcoded secrets
        expect(content).not.toMatch(/sk-[a-zA-Z0-9]{48}/) // Claude API key pattern
        expect(content).not.toMatch(/ghp_[a-zA-Z0-9]{36}/) // GitHub token pattern
        expect(content).not.toMatch(/password\s*:\s*[^$]/) // Hardcoded passwords
      })
    })

    it('should use secure action versions', () => {
      workflowFiles.forEach(file => {
        const filePath = path.join(workflowsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const workflow = yaml.load(content)

        Object.values(workflow.jobs || {}).forEach(job => {
          job.steps?.forEach(step => {
            if (step.uses) {
              // Should pin to specific versions (not @main or @master)
              expect(step.uses).not.toMatch(/@main$|@master$/)

              // Should use specific version tags or commit SHAs
              expect(step.uses).toMatch(/@v\d+|@[a-f0-9]{40}/)
            }
          })
        })
      })
    })
  })
})
