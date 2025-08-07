#!/usr/bin/env node

/**
 * Component Documentation Generator
 * Creates comprehensive documentation for Tyler-Setup components
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

class DocumentationGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.components = [];
  }

  async run() {
    console.log('📚 Generating component documentation...');
    
    try {
      // Find all components
      await this.scanComponents();
      
      // Generate documentation
      await this.generateMarkdown();
      await this.generateStorybook();
      await this.generateAPIReference();
      
      console.log(`✅ Generated documentation for ${this.components.length} components`);
    } catch (error) {
      console.error('❌ Documentation generation failed:', error);
      process.exit(1);
    }
  }

  async scanComponents() {
    const componentFiles = await glob('components/**/*.tsx', {
      cwd: this.projectRoot,
      ignore: ['**/*.test.tsx', '**/*.stories.tsx']
    });
    
    for (const file of componentFiles) {
      const content = await fs.readFile(path.join(this.projectRoot, file), 'utf-8');
      const componentInfo = this.extractComponentInfo(content, file);
      if (componentInfo) {
        this.components.push(componentInfo);
      }
    }
  }

  extractComponentInfo(content, filePath) {
    const name = path.basename(filePath, '.tsx');
    
    // Extract props interface
    const propsMatch = content.match(/interface\s+(\w+Props)[\s\S]*?\{([\s\S]*?)\}/);
    const props = propsMatch ? this.parseProps(propsMatch[2]) : [];
    
    // Extract component description from comments
    const descMatch = content.match(/\/\*\*\s*\n([^*]|\*(?!\/))*\*\//);
    const description = descMatch ? this.parseJSDoc(descMatch[0]) : '';
    
    // Check for specific features
    const features = {
      themeable: content.includes('useTheme') || content.includes('ThemeProvider'),
      touchOptimized: content.includes('touch-manipulation') || content.includes('--touch-target'),
      accessible: content.includes('aria-') || content.includes('role='),
      responsive: content.includes('@media') || content.includes('lg:') || content.includes('md:')
    };
    
    return {
      name,
      path: filePath,
      description,
      props,
      features,
      examples: this.generateExamples(name, props)
    };
  }

  parseProps(propsString) {
    const props = [];
    const lines = propsString.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const match = line.match(/(\w+)(\?)?\s*:\s*([^;]+)/);
      if (match) {
        props.push({
          name: match[1],
          required: !match[2],
          type: match[3].trim(),
          description: '' // Would need to parse from comments
        });
      }
    }
    
    return props;
  }

  parseJSDoc(comment) {
    const lines = comment.split('\n');
    const description = [];
    
    for (const line of lines) {
      const cleaned = line.replace(/^\s*\*\s?/, '').trim();
      if (cleaned && !cleaned.startsWith('@')) {
        description.push(cleaned);
      }
    }
    
    return description.join(' ');
  }

  generateExamples(componentName, props) {
    const examples = [];
    
    // Basic example
    examples.push({
      title: 'Basic Usage',
      code: `<${componentName} />`
    });
    
    // With props example
    if (props.length > 0) {
      const propsExample = props
        .filter(p => p.required)
        .map(p => `  ${p.name}="${this.getExampleValue(p.type)}"`)
        .join('\n');
      
      examples.push({
        title: 'With Props',
        code: `<${componentName}\n${propsExample}\n/>`
      });
    }
    
    // Theme variants
    if (componentName.includes('Button') || componentName.includes('Card')) {
      examples.push({
        title: 'Variants',
        code: `<${componentName} variant="primary" />
<${componentName} variant="secondary" />
<${componentName} variant="outline" />`
      });
    }
    
    return examples;
  }

  getExampleValue(type) {
    if (type.includes('string')) return 'Example text';
    if (type.includes('number')) return '42';
    if (type.includes('boolean')) return 'true';
    if (type.includes('function')) return '() => {}';
    return 'value';
  }

  async generateMarkdown() {
    console.log('📝 Generating Markdown documentation...');
    
    let markdown = `# Tyler-Setup Component Library

## Overview

The Tyler-Setup design system provides a comprehensive set of React components built with accessibility, performance, and mobile-first design in mind.

## Features

- 🎨 **Theme Support**: Full light/dark theme with CSS variables
- 📱 **Touch Optimized**: 44px minimum touch targets for iPad
- ♿ **Accessible**: WCAG 2.1 Level AA compliant
- ⚡ **Performance**: Optimized with memoization and lazy loading
- 🔧 **TypeScript**: Full type safety with no \`any\` types

## Components

`;

    for (const component of this.components) {
      markdown += `### ${component.name}

${component.description || 'A Tyler-Setup component.'}

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
`;

      for (const prop of component.props) {
        markdown += `| ${prop.name} | \`${prop.type}\` | ${prop.required ? '✅' : '❌'} | ${prop.description} |\n`;
      }

      markdown += `
#### Examples

`;

      for (const example of component.examples) {
        markdown += `**${example.title}**

\`\`\`tsx
${example.code}
\`\`\`

`;
      }

      markdown += `#### Features

`;
      if (component.features.themeable) markdown += '- ✅ Theme support\n';
      if (component.features.touchOptimized) markdown += '- ✅ Touch optimized\n';
      if (component.features.accessible) markdown += '- ✅ Accessible\n';
      if (component.features.responsive) markdown += '- ✅ Responsive\n';
      
      markdown += '\n---\n\n';
    }

    markdown += `## Design Tokens

### Colors

\`\`\`css
/* Light Mode */
--primary: 271 91% 65%;
--secondary: 328 85% 63%;
--background: 0 0% 98%;
--foreground: 222.2 84% 4.9%;

/* Dark Mode */
--primary: 271 91% 70%;
--secondary: 328 85% 68%;
--background: 222.2 84% 4.9%;
--foreground: 210 40% 98%;
\`\`\`

### Spacing

\`\`\`css
--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 2rem;
\`\`\`

### Typography

\`\`\`css
--font-sans: Inter, system-ui, sans-serif;
--font-mono: 'Fira Code', monospace;
\`\`\`

## Best Practices

1. **Always use semantic HTML elements**
2. **Provide proper ARIA labels for screen readers**
3. **Test components in both light and dark modes**
4. **Ensure touch targets are at least 44x44 pixels**
5. **Use CSS variables for consistent theming**

## Migration Guide

### From Legacy Components

\`\`\`tsx
// Before
<button className="btn btn-primary">Click me</button>

// After
<Button variant="primary">Click me</Button>
\`\`\`

### Theming

\`\`\`tsx
// Wrap your app with ThemeProvider
import { ThemeProvider } from '@/lib/theme/ThemeProvider';

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      {/* Your app */}
    </ThemeProvider>
  );
}
\`\`\`
`;

    const docsDir = path.join(this.projectRoot, 'docs');
    await fs.mkdir(docsDir, { recursive: true });
    await fs.writeFile(path.join(docsDir, 'components.md'), markdown);
  }

  async generateStorybook() {
    console.log('📖 Generating Storybook stories...');
    
    for (const component of this.components) {
      const story = `import type { Meta, StoryObj } from '@storybook/react';
import { ${component.name} } from '@/components/${component.path}';

const meta = {
  title: 'Tyler-Setup/${component.name}',
  component: ${component.name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'outline', 'ghost', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
  },
} satisfies Meta<typeof ${component.name}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '${component.name}',
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary ${component.name}',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary ${component.name}',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large ${component.name}',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small ${component.name}',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled ${component.name}',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading ${component.name}',
  },
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div className="dark">
        <Story />
      </div>
    ),
  ],
  args: {
    children: 'Dark Mode ${component.name}',
  },
};`;

      const storyPath = component.path.replace('.tsx', '.stories.tsx');
      await fs.writeFile(path.join(this.projectRoot, storyPath), story);
    }
  }

  async generateAPIReference() {
    console.log('🔌 Generating API reference...');
    
    const api = {
      version: '1.0.0',
      components: this.components.map(c => ({
        name: c.name,
        path: c.path,
        props: c.props,
        methods: [],
        events: []
      }))
    };
    
    await fs.writeFile(
      path.join(this.projectRoot, 'docs', 'api-reference.json'),
      JSON.stringify(api, null, 2)
    );
  }
}

// Run the generator
const generator = new DocumentationGenerator();
generator.run().catch(console.error);