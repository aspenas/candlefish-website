#!/usr/bin/env node

/**
 * Eggshell Design System - Accessibility Compliance Audit
 * Validates WCAG AA compliance for all color combinations
 */

// Color palette from the Eggshell design system
const colors = {
  eggshell: {
    primary: '#fefaee',
    50: '#fffef2',
    100: '#fefbec',
    200: '#fefaed',
    300: '#fdfaee',
    400: '#fdfbf0'
  },
  brown: {
    primary: '#6d634f',
    50: '#f7f5f2',
    100: '#e8e1d7',
    200: '#9a8b78',
    300: '#8a7a64',
    400: '#6d634f',
    500: '#5a5142',
    600: '#4a4335',
    700: '#3a3529',
    800: '#2a261d'
  },
  neutral: {
    white: '#ffffff',
    black: '#2d2d2d'
  },
  semantic: {
    success: '#065f46', // Darker green for AA compliance
    warning: '#92400e', // Darker amber for AA compliance
    error: '#dc2626',
    info: '#0369a1'
  }
}

// WCAG contrast ratio calculation
function getContrastRatio(color1, color2) {
  const getRGB = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return [r, g, b]
  }

  const getLuminance = (rgb) => {
    const [r, g, b] = rgb.map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const lum1 = getLuminance(getRGB(color1))
  const lum2 = getLuminance(getRGB(color2))
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)

  return (brightest + 0.05) / (darkest + 0.05)
}

// Test cases for WCAG compliance
const testCases = [
  {
    name: 'Primary Text on Eggshell Background',
    foreground: colors.brown[700], // #3a3529
    background: colors.eggshell.primary,
    requirement: 'AA Normal',
    minRatio: 4.5
  },
  {
    name: 'Secondary Text on Eggshell Background',
    foreground: colors.brown[500], // #5a5142
    background: colors.eggshell.primary,
    requirement: 'AA Normal',
    minRatio: 4.5
  },
  {
    name: 'Primary Button (White on Brown)',
    foreground: colors.neutral.white,
    background: colors.brown.primary,
    requirement: 'AA Normal',
    minRatio: 4.5
  },
  {
    name: 'Tertiary Text (Brown 300 on Eggshell)',
    foreground: colors.brown[300], // #8a7a64
    background: colors.eggshell.primary,
    requirement: 'AA Large',
    minRatio: 3.0
  },
  {
    name: 'Link Text on Eggshell Background',
    foreground: colors.brown[600], // #4a4335
    background: colors.eggshell.primary,
    requirement: 'AA Normal',
    minRatio: 4.5
  },
  {
    name: 'Border Elements (Non-text)',
    foreground: colors.brown[200], // #b8a990
    background: colors.eggshell.primary,
    requirement: 'AA Non-text',
    minRatio: 3.0
  },
  {
    name: 'Success State',
    foreground: colors.semantic.success,
    background: colors.eggshell.primary,
    requirement: 'AA Normal',
    minRatio: 4.5
  },
  {
    name: 'Warning State',
    foreground: colors.semantic.warning,
    background: colors.eggshell.primary,
    requirement: 'AA Normal',
    minRatio: 4.5
  },
  {
    name: 'Error State',
    foreground: colors.semantic.error,
    background: colors.eggshell.primary,
    requirement: 'AA Normal',
    minRatio: 4.5
  },
  {
    name: 'High Contrast Text',
    foreground: colors.brown[800], // #2a261d
    background: colors.eggshell.primary,
    requirement: 'AAA Normal',
    minRatio: 7.0
  }
]

console.log('🥚 Eggshell Design System - Accessibility Audit\n')
console.log('Testing WCAG AA compliance for all color combinations...\n')

let passCount = 0
let totalTests = testCases.length

testCases.forEach((test, index) => {
  const ratio = getContrastRatio(test.foreground, test.background)
  const passes = ratio >= test.minRatio
  const grade = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'A' : 'FAIL'

  if (passes) passCount++

  const status = passes ? '✅' : '❌'
  const ratioFormatted = ratio.toFixed(1)

  console.log(`${status} ${test.name}`)
  console.log(`   Contrast: ${ratioFormatted}:1 (${grade}) | Required: ${test.minRatio}:1`)
  console.log(`   Colors: ${test.foreground} on ${test.background}`)
  console.log('')
})

// Summary
console.log('📊 AUDIT SUMMARY')
console.log('================')
console.log(`Total Tests: ${totalTests}`)
console.log(`Passed: ${passCount}`)
console.log(`Failed: ${totalTests - passCount}`)
console.log(`Success Rate: ${Math.round((passCount / totalTests) * 100)}%`)

if (passCount === totalTests) {
  console.log('\n🎉 ALL TESTS PASSED! The Eggshell Design System is fully WCAG AA compliant.')
} else {
  console.log('\n⚠️  Some tests failed. Please review color combinations above.')
}

// Additional recommendations
console.log('\n💡 ACCESSIBILITY RECOMMENDATIONS')
console.log('=================================')
console.log('• Minimum touch target size: 44px')
console.log('• Focus indicators: 3px outline with sufficient contrast')
console.log('• Support for reduced motion preferences')
console.log('• Semantic HTML with proper ARIA labels')
console.log('• Keyboard navigation support')
console.log('• Screen reader compatibility')

console.log('\n🔍 COMPONENT-SPECIFIC GUIDELINES')
console.log('=================================')
console.log('• Primary buttons: Use brown-primary (#9b8b73) background')
console.log('• Secondary buttons: Use white background with brown border')
console.log('• Form inputs: Ensure 3px focus ring with brown-400 color')
console.log('• Error states: Use warm red (#dc2626) with sufficient contrast')
console.log('• Disabled states: Use brown-200 (#d4c7b5) for muted appearance')

console.log('\n✨ Design system audit complete!')

// Export results for CI/CD integration
if (process.env.CI) {
  const results = {
    timestamp: new Date().toISOString(),
    totalTests,
    passCount,
    failCount: totalTests - passCount,
    successRate: Math.round((passCount / totalTests) * 100),
    allPassed: passCount === totalTests,
    testResults: testCases.map(test => ({
      name: test.name,
      ratio: getContrastRatio(test.foreground, test.background),
      required: test.minRatio,
      passed: getContrastRatio(test.foreground, test.background) >= test.minRatio
    }))
  }

  require('fs').writeFileSync('accessibility-audit-results.json', JSON.stringify(results, null, 2))
  console.log('Results exported to accessibility-audit-results.json')
}
