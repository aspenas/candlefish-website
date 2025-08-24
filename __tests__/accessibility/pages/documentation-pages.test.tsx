/**
 * Accessibility tests for documentation pages
 * Tests WCAG 2.1 AA compliance for documentation site pages
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';

// Mock documentation page components
const DocumentationLayout = ({ children, title, navigation, breadcrumbs }) => (
  <div className="documentation-layout">
    <header>
      <h1>{title}</h1>
      {breadcrumbs && <nav aria-label="Breadcrumb">{breadcrumbs}</nav>}
    </header>

    <div className="content-wrapper">
      <aside className="sidebar" aria-label="Documentation navigation">
        {navigation}
      </aside>

      <main id="main-content" tabIndex="-1">
        {children}
      </main>
    </div>
  </div>
);

const NavigationTree = ({ items, level = 1 }) => (
  <ul role={level === 1 ? 'tree' : 'group'} aria-label={level === 1 ? 'Documentation sections' : undefined}>
    {items.map((item, index) => (
      <li key={index} role="treeitem">
        <a
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          aria-expanded={item.children ? item.expanded : undefined}
        >
          {item.label}
        </a>
        {item.children && item.expanded && (
          <NavigationTree items={item.children} level={level + 1} />
        )}
      </li>
    ))}
  </ul>
);

const CodeBlock = ({ children, language = 'javascript', filename, copyable = true }) => (
  <div className="code-block-container">
    {filename && (
      <div className="code-filename" aria-label={`Code file: ${filename}`}>
        {filename}
      </div>
    )}
    <pre className="code-block">
      <code lang={language} aria-label={`${language} code example`}>
        {children}
      </code>
    </pre>
    {copyable && (
      <button
        className="copy-button"
        aria-label={`Copy ${language} code to clipboard`}
        onClick={() => navigator.clipboard.writeText(children)}
      >
        Copy
      </button>
    )}
  </div>
);

const TableOfContents = ({ headings }) => (
  <nav className="table-of-contents" aria-label="Table of contents">
    <h2>Contents</h2>
    <ul>
      {headings.map((heading, index) => (
        <li key={index} className={`toc-level-${heading.level}`}>
          <a href={`#${heading.id}`} aria-label={`Jump to ${heading.text}`}>
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);

const DocumentationPage = ({ title, content, headings, codeExamples }) => (
  <DocumentationLayout title={title}>
    <div className="doc-page-content">
      <TableOfContents headings={headings} />

      <article className="main-content">
        <h1 id="main-heading">{title}</h1>

        <section aria-labelledby="overview-heading">
          <h2 id="overview-heading">Overview</h2>
          <p>{content.overview}</p>
        </section>

        <section aria-labelledby="usage-heading">
          <h2 id="usage-heading">Usage</h2>
          <p>{content.usage}</p>

          {codeExamples.map((example, index) => (
            <div key={index} className="example-section">
              <h3 id={`example-${index}`}>{example.title}</h3>
              <CodeBlock language={example.language} filename={example.filename}>
                {example.code}
              </CodeBlock>
            </div>
          ))}
        </section>

        <section aria-labelledby="api-heading">
          <h2 id="api-heading">API Reference</h2>
          <table className="api-table" summary="API methods and their descriptions">
            <caption>Available API Methods</caption>
            <thead>
              <tr>
                <th scope="col">Method</th>
                <th scope="col">Parameters</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">authenticate()</th>
                <td>credentials: Object</td>
                <td>Authenticates user with provided credentials</td>
              </tr>
              <tr>
                <th scope="row">getDocuments()</th>
                <td>filters?: Object</td>
                <td>Retrieves documents based on optional filters</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section aria-labelledby="related-heading">
          <h2 id="related-heading">Related Documentation</h2>
          <ul>
            <li><a href="/docs/auth" aria-label="Learn more about authentication">Authentication Guide</a></li>
            <li><a href="/docs/api" aria-label="View full API reference">Complete API Reference</a></li>
          </ul>
        </section>
      </article>
    </div>
  </DocumentationLayout>
);

const SearchResultsPage = ({ query, results, totalResults }) => (
  <DocumentationLayout title="Search Results">
    <div className="search-results-page">
      <header className="search-header">
        <h1>Search Results</h1>
        <p aria-live="polite">
          {totalResults > 0
            ? `Found ${totalResults} results for "${query}"`
            : `No results found for "${query}"`
          }
        </p>
      </header>

      <main>
        {totalResults > 0 ? (
          <div className="results-list" role="region" aria-label="Search results">
            {results.map((result, index) => (
              <article key={index} className="search-result">
                <h2>
                  <a
                    href={result.url}
                    aria-label={`Go to ${result.title} - ${result.category}`}
                  >
                    {result.title}
                  </a>
                </h2>
                <p className="result-category">{result.category}</p>
                <p className="result-snippet">{result.snippet}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="no-results" role="region" aria-label="No results found">
            <h2>No Results Found</h2>
            <p>Try adjusting your search terms or browse our categories:</p>
            <ul>
              <li><a href="/docs/getting-started">Getting Started</a></li>
              <li><a href="/docs/api">API Reference</a></li>
              <li><a href="/docs/guides">Guides</a></li>
            </ul>
          </div>
        )}
      </main>
    </div>
  </DocumentationLayout>
);

expect.extend(toHaveNoViolations);

describe('Documentation Pages Accessibility', () => {

  const mockNavigationItems = [
    {
      label: 'Getting Started',
      href: '/docs/getting-started',
      active: false,
      expanded: true,
      children: [
        { label: 'Installation', href: '/docs/installation' },
        { label: 'Quick Start', href: '/docs/quick-start' }
      ]
    },
    {
      label: 'API Reference',
      href: '/docs/api',
      active: true,
      expanded: false
    }
  ];

  const mockHeadings = [
    { level: 2, text: 'Overview', id: 'overview-heading' },
    { level: 2, text: 'Usage', id: 'usage-heading' },
    { level: 3, text: 'Basic Example', id: 'example-0' },
    { level: 2, text: 'API Reference', id: 'api-heading' },
    { level: 2, text: 'Related Documentation', id: 'related-heading' }
  ];

  const mockCodeExamples = [
    {
      title: 'Basic Authentication',
      language: 'javascript',
      filename: 'auth.js',
      code: 'const auth = await authenticate({ email, password });'
    }
  ];

  describe('Documentation Layout', () => {
    test('should be accessible', async () => {
      const { container } = render(
        <DocumentationLayout title="Test Documentation">
          <p>Content here</p>
        </DocumentationLayout>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper document structure', () => {
      render(
        <DocumentationLayout title="Test Documentation">
          <p>Content here</p>
        </DocumentationLayout>
      );

      // Check for main landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument(); // aside

      // Check main content has skip target
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'main-content');
      expect(main).toHaveAttribute('tabindex', '-1');
    });

    test('should have accessible navigation', () => {
      render(
        <DocumentationLayout
          title="Test Documentation"
          navigation={<NavigationTree items={mockNavigationItems} />}
        >
          <p>Content here</p>
        </DocumentationLayout>
      );

      const sidebar = screen.getByLabelText('Documentation navigation');
      expect(sidebar).toBeInTheDocument();

      const tree = screen.getByRole('tree');
      expect(tree).toHaveAttribute('aria-label', 'Documentation sections');
    });
  });

  describe('Navigation Tree', () => {
    test('should be accessible', async () => {
      const { container } = render(
        <NavigationTree items={mockNavigationItems} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper tree structure', () => {
      render(<NavigationTree items={mockNavigationItems} />);

      const tree = screen.getByRole('tree');
      const treeItems = screen.getAllByRole('treeitem');

      expect(tree).toBeInTheDocument();
      expect(treeItems.length).toBeGreaterThan(0);

      // Check for current page indication
      const currentLink = screen.getByText('API Reference');
      expect(currentLink.closest('a')).toHaveAttribute('aria-current', 'page');

      // Check for expandable items
      const expandableLink = screen.getByText('Getting Started');
      expect(expandableLink.closest('a')).toHaveAttribute('aria-expanded', 'true');
    });

    test('should be keyboard navigable', async () => {
      const user = userEvent.setup();

      render(<NavigationTree items={mockNavigationItems} />);

      const firstLink = screen.getByText('Getting Started');
      firstLink.focus();

      // Test arrow key navigation
      await user.keyboard('{ArrowDown}');
      // Note: Full tree navigation would require more complex implementation
    });
  });

  describe('Code Block Component', () => {
    test('should be accessible', async () => {
      const { container } = render(
        <CodeBlock language="javascript" filename="example.js">
          const example = 'test';
        </CodeBlock>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper code semantics', () => {
      render(
        <CodeBlock language="javascript" filename="example.js">
          const example = 'test';
        </CodeBlock>
      );

      const code = screen.getByLabelText('javascript code example');
      expect(code).toHaveAttribute('lang', 'javascript');

      const filename = screen.getByLabelText('Code file: example.js');
      expect(filename).toBeInTheDocument();

      const copyButton = screen.getByLabelText('Copy javascript code to clipboard');
      expect(copyButton).toBeInTheDocument();
    });

    test('should handle copy functionality accessibly', async () => {
      const user = userEvent.setup();

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      });

      render(
        <CodeBlock language="javascript">
          const example = 'test';
        </CodeBlock>
      );

      const copyButton = screen.getByLabelText('Copy javascript code to clipboard');
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("const example = 'test';");
    });
  });

  describe('Table of Contents', () => {
    test('should be accessible', async () => {
      const { container } = render(
        <TableOfContents headings={mockHeadings} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper navigation structure', () => {
      render(<TableOfContents headings={mockHeadings} />);

      const toc = screen.getByLabelText('Table of contents');
      expect(toc).toBeInTheDocument();

      const tocHeading = screen.getByText('Contents');
      expect(tocHeading.tagName).toBe('H2');

      // Check for proper linking
      const overviewLink = screen.getByLabelText('Jump to Overview');
      expect(overviewLink).toHaveAttribute('href', '#overview-heading');
    });
  });

  describe('Full Documentation Page', () => {
    const mockContent = {
      overview: 'This is the overview content.',
      usage: 'This explains how to use the feature.'
    };

    test('should be accessible', async () => {
      const { container } = render(
        <DocumentationPage
          title="Authentication Guide"
          content={mockContent}
          headings={mockHeadings}
          codeExamples={mockCodeExamples}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper heading hierarchy', () => {
      render(
        <DocumentationPage
          title="Authentication Guide"
          content={mockContent}
          headings={mockHeadings}
          codeExamples={mockCodeExamples}
        />
      );

      // Check heading hierarchy (should be h1 -> h2 -> h3)
      const h1 = screen.getByRole('heading', { level: 1, name: 'Authentication Guide' });
      const h2Overview = screen.getByRole('heading', { level: 2, name: 'Overview' });
      const h2Usage = screen.getByRole('heading', { level: 2, name: 'Usage' });
      const h3Example = screen.getByRole('heading', { level: 3, name: 'Basic Authentication' });

      expect(h1).toBeInTheDocument();
      expect(h2Overview).toBeInTheDocument();
      expect(h2Usage).toBeInTheDocument();
      expect(h3Example).toBeInTheDocument();
    });

    test('should have accessible data table', () => {
      render(
        <DocumentationPage
          title="Authentication Guide"
          content={mockContent}
          headings={mockHeadings}
          codeExamples={mockCodeExamples}
        />
      );

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('summary', 'API methods and their descriptions');

      const caption = screen.getByText('Available API Methods');
      expect(caption.tagName).toBe('CAPTION');

      // Check for proper header structure
      const methodHeader = screen.getByRole('columnheader', { name: 'Method' });
      const parametersHeader = screen.getByRole('columnheader', { name: 'Parameters' });
      const descriptionHeader = screen.getByRole('columnheader', { name: 'Description' });

      expect(methodHeader).toHaveAttribute('scope', 'col');
      expect(parametersHeader).toHaveAttribute('scope', 'col');
      expect(descriptionHeader).toHaveAttribute('scope', 'col');

      // Check for row headers
      const methodCells = screen.getAllByRole('rowheader');
      expect(methodCells.length).toBeGreaterThan(0);
      methodCells.forEach(cell => {
        expect(cell).toHaveAttribute('scope', 'row');
      });
    });
  });

  describe('Search Results Page', () => {
    const mockResults = [
      {
        title: 'Authentication Guide',
        url: '/docs/auth',
        category: 'Guides',
        snippet: 'Learn how to authenticate users in your application.'
      },
      {
        title: 'Login API',
        url: '/docs/api/login',
        category: 'API Reference',
        snippet: 'API endpoint for user authentication.'
      }
    ];

    test('should be accessible with results', async () => {
      const { container } = render(
        <SearchResultsPage
          query="authentication"
          results={mockResults}
          totalResults={2}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should be accessible with no results', async () => {
      const { container } = render(
        <SearchResultsPage
          query="nonexistent"
          results={[]}
          totalResults={0}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should announce results to screen readers', () => {
      render(
        <SearchResultsPage
          query="authentication"
          results={mockResults}
          totalResults={2}
        />
      );

      const announcement = screen.getByText('Found 2 results for "authentication"');
      const liveRegion = announcement.closest('[aria-live]');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    test('should have accessible result links', () => {
      render(
        <SearchResultsPage
          query="authentication"
          results={mockResults}
          totalResults={2}
        />
      );

      const firstResultLink = screen.getByLabelText('Go to Authentication Guide - Guides');
      expect(firstResultLink).toHaveAttribute('href', '/docs/auth');

      const secondResultLink = screen.getByLabelText('Go to Login API - API Reference');
      expect(secondResultLink).toHaveAttribute('href', '/docs/api/login');
    });
  });

  describe('Keyboard Navigation Flow', () => {
    test('should support skip links', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <DocumentationPage
            title="Test Page"
            content={{ overview: 'Overview', usage: 'Usage' }}
            headings={mockHeadings}
            codeExamples={mockCodeExamples}
          />
        </div>
      );

      const skipLink = screen.getByText('Skip to main content');
      const mainContent = screen.getByRole('main');

      await user.click(skipLink);
      expect(mainContent).toHaveFocus();
    });
  });

  describe('Screen Reader Experience', () => {
    test('should provide proper page announcements', () => {
      render(
        <DocumentationPage
          title="Authentication Guide"
          content={{ overview: 'Overview', usage: 'Usage' }}
          headings={mockHeadings}
          codeExamples={mockCodeExamples}
        />
      );

      // Check for proper landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Table of contents' })).toBeInTheDocument();
    });
  });
});
