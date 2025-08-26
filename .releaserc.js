module.exports = {
  branches: [
    'main',
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true },
    { name: 'next', prerelease: true }
  ],
  plugins: [
    // Analyze commits to determine version bump
    ['@semantic-release/commit-analyzer', {
      preset: 'conventionalcommits',
      releaseRules: [
        { type: 'feat', release: 'minor' },
        { type: 'fix', release: 'patch' },
        { type: 'perf', release: 'patch' },
        { type: 'refactor', release: 'patch' },
        { type: 'security', release: 'patch' },
        { breaking: true, release: 'major' },
        { revert: true, release: 'patch' },
        { type: 'docs', scope: 'README', release: 'patch' },
        { type: 'style', release: false },
        { type: 'test', release: false },
        { type: 'build', release: false },
        { type: 'ci', release: false },
        { type: 'chore', release: false }
      ],
      parserOpts: {
        noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING']
      }
    }],
    
    // Generate release notes
    ['@semantic-release/release-notes-generator', {
      preset: 'conventionalcommits',
      presetConfig: {
        types: [
          { type: 'feat', section: '🚀 Features' },
          { type: 'fix', section: '🐛 Bug Fixes' },
          { type: 'perf', section: '⚡ Performance Improvements' },
          { type: 'security', section: '🔒 Security Updates' },
          { type: 'refactor', section: '♻️ Code Refactoring' },
          { type: 'docs', section: '📚 Documentation' },
          { type: 'test', section: '✅ Tests', hidden: true },
          { type: 'build', section: '📦 Build System', hidden: true },
          { type: 'ci', section: '🤖 Continuous Integration', hidden: true },
          { type: 'chore', section: '🧹 Miscellaneous', hidden: true },
          { type: 'revert', section: '⏪ Reverts' },
          { type: 'style', section: '💄 Code Style', hidden: true }
        ]
      },
      writerOpts: {
        groupBy: 'type',
        commitGroupsSort: 'title',
        commitsSort: ['scope', 'subject'],
        noteGroupsSort: 'title'
      }
    }],
    
    // Update changelog
    ['@semantic-release/changelog', {
      changelogFile: 'CHANGELOG.md',
      changelogTitle: '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).'
    }],
    
    // Update package.json version
    ['@semantic-release/npm', {
      npmPublish: false // Don't publish to npm automatically
    }],
    
    // Commit changes
    ['@semantic-release/git', {
      assets: [
        'CHANGELOG.md',
        'package.json',
        'package-lock.json',
        'pnpm-lock.yaml',
        'apps/*/package.json',
        'packages/*/package.json'
      ],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
    }],
    
    // Create GitHub release
    ['@semantic-release/github', {
      successComment: '🎉 This PR is included in version ${nextRelease.version} 🎉\n\nThe release is available on:\n- [GitHub releases](https://github.com/candlefish-ai/candlefish-ai/releases/tag/v${nextRelease.version})\n- Docker: `ghcr.io/candlefish-ai/security-dashboard:${nextRelease.version}`\n\nYour contribution has been released! 🚀',
      failComment: false,
      labels: ['released'],
      releasedLabels: ['released on @${nextRelease.channel}']
    }],
    
    // Custom plugin to save outputs
    ['@semantic-release/exec', {
      successCmd: 'echo \'{"version":"${nextRelease.version}","notes":${JSON.stringify(nextRelease.notes)}}\' > .semantic-release-output.json'
    }]
  ]
};