/**
 * Component tests for EnvironmentSelector
 * Tests environment selection and validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnvironmentSelector } from '../../../src/components/deployment/EnvironmentSelector';

const mockEnvironments = [
  {
    id: 'env-1',
    name: 'production',
    description: 'Production environment',
    priority: 1,
    auto_deploy: false,
    require_approval: true,
    max_concurrent_deployments: 1
  },
  {
    id: 'env-2',
    name: 'staging',
    description: 'Staging environment for testing',
    priority: 2,
    auto_deploy: true,
    require_approval: false,
    max_concurrent_deployments: 2
  },
  {
    id: 'env-3',
    name: 'preview',
    description: 'Preview environment for feature branches',
    priority: 3,
    auto_deploy: false,
    require_approval: false,
    max_concurrent_deployments: 5
  }
];

describe('EnvironmentSelector', () => {
  const defaultProps = {
    environments: mockEnvironments,
    value: '',
    onChange: jest.fn(),
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all environment options', () => {
    render(<EnvironmentSelector {...defaultProps} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('preview')).toBeInTheDocument();
  });

  it('shows environment descriptions on hover', async () => {
    const user = userEvent.setup();
    render(<EnvironmentSelector {...defaultProps} />);

    fireEvent.click(screen.getByRole('combobox'));

    await user.hover(screen.getByText('production'));

    await waitFor(() => {
      expect(screen.getByText('Production environment')).toBeInTheDocument();
      expect(screen.getByText('Requires approval')).toBeInTheDocument();
    });
  });

  it('calls onChange when environment is selected', async () => {
    const onChangeMock = jest.fn();
    render(<EnvironmentSelector {...defaultProps} onChange={onChangeMock} />);

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('staging'));

    expect(onChangeMock).toHaveBeenCalledWith('staging');
  });

  it('shows selected environment value', () => {
    render(<EnvironmentSelector {...defaultProps} value="production" />);

    expect(screen.getByDisplayValue('production')).toBeInTheDocument();
  });

  it('displays environment badges correctly', () => {
    render(<EnvironmentSelector {...defaultProps} />);

    fireEvent.click(screen.getByRole('combobox'));

    // Production should show approval required badge
    const productionOption = screen.getByText('production').closest('[role="option"]');
    expect(productionOption).toHaveTextContent('Approval Required');

    // Staging should show auto-deploy badge
    const stagingOption = screen.getByText('staging').closest('[role="option"]');
    expect(stagingOption).toHaveTextContent('Auto Deploy');
  });

  it('disables selector when disabled prop is true', () => {
    render(<EnvironmentSelector {...defaultProps} disabled={true} />);

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('shows loading state when environments are undefined', () => {
    render(<EnvironmentSelector {...defaultProps} environments={undefined} />);

    expect(screen.getByText('Loading environments...')).toBeInTheDocument();
  });

  it('shows empty state when no environments available', () => {
    render(<EnvironmentSelector {...defaultProps} environments={[]} />);

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('No environments available')).toBeInTheDocument();
  });

  it('filters environments based on search input', async () => {
    const user = userEvent.setup();
    render(<EnvironmentSelector {...defaultProps} searchable={true} />);

    const combobox = screen.getByRole('combobox');
    await user.type(combobox, 'prod');

    await waitFor(() => {
      expect(screen.getByText('production')).toBeInTheDocument();
      expect(screen.queryByText('staging')).not.toBeInTheDocument();
      expect(screen.queryByText('preview')).not.toBeInTheDocument();
    });
  });

  it('shows concurrent deployment limits', () => {
    render(<EnvironmentSelector {...defaultProps} showLimits={true} />);

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('Max 1 deployment')).toBeInTheDocument();
    expect(screen.getByText('Max 2 deployments')).toBeInTheDocument();
    expect(screen.getByText('Max 5 deployments')).toBeInTheDocument();
  });

  it('validates required selection', () => {
    const onValidationMock = jest.fn();
    render(
      <EnvironmentSelector
        {...defaultProps}
        required={true}
        onValidation={onValidationMock}
      />
    );

    // Trigger validation with empty value
    fireEvent.blur(screen.getByRole('combobox'));

    expect(onValidationMock).toHaveBeenCalledWith({
      isValid: false,
      error: 'Environment selection is required'
    });
  });

  it('sorts environments by priority', () => {
    const unsortedEnvironments = [
      { ...mockEnvironments[2], priority: 1 }, // preview
      { ...mockEnvironments[0], priority: 3 }, // production
      { ...mockEnvironments[1], priority: 2 }  // staging
    ];

    render(<EnvironmentSelector {...defaultProps} environments={unsortedEnvironments} />);

    fireEvent.click(screen.getByRole('combobox'));

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('preview');
    expect(options[1]).toHaveTextContent('staging');
    expect(options[2]).toHaveTextContent('production');
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<EnvironmentSelector {...defaultProps} />);

    const combobox = screen.getByRole('combobox');

    // Open with Enter
    await user.type(combobox, '{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Navigate with arrow keys
    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('production')).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(screen.getByText('staging')).toHaveAttribute('aria-selected', 'true');

    // Select with Enter
    await user.keyboard('{Enter}');
    expect(defaultProps.onChange).toHaveBeenCalledWith('staging');
  });

  it('shows environment status indicators', () => {
    const environmentsWithStatus = mockEnvironments.map(env => ({
      ...env,
      status: env.name === 'production' ? 'healthy' : 'degraded'
    }));

    render(
      <EnvironmentSelector
        {...defaultProps}
        environments={environmentsWithStatus}
        showStatus={true}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByTestId('status-healthy')).toBeInTheDocument();
    expect(screen.getAllByTestId('status-degraded')).toHaveLength(2);
  });
});
