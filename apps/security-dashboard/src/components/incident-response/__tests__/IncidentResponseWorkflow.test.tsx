import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/test-utils';
import IncidentResponseWorkflow from '../IncidentResponseWorkflow';

const mockIncident = {
  id: 'inc-123',
  title: 'Critical Security Breach - Data Exfiltration',
  description: 'Unauthorized access detected with potential data exfiltration',
  severity: 'CRITICAL' as const,
  status: 'INVESTIGATING' as const,
  assignee: 'security-team@company.com',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T14:30:00Z',
  events: [
    {
      id: 'evt-1',
      timestamp: '2024-01-15T10:00:00Z',
      type: 'MALWARE_DETECTED',
      severity: 'HIGH',
      source: '192.168.1.100',
      description: 'Malware detected on critical server',
    },
    {
      id: 'evt-2',
      timestamp: '2024-01-15T10:15:00Z',
      type: 'DATA_EXFILTRATION',
      severity: 'CRITICAL',
      source: '192.168.1.100',
      description: 'Large volume of data transferred to external IP',
    },
  ],
  assets_affected: ['SERVER-DB-001', 'WORKSTATION-042'],
  tags: ['data-breach', 'malware', 'critical'],
  priority: 1,
  timeline: [
    {
      timestamp: '2024-01-15T10:00:00Z',
      action: 'Incident Created',
      user: 'SOC Analyst',
      details: 'Automatic incident creation from security event correlation',
    },
    {
      timestamp: '2024-01-15T10:05:00Z',
      action: 'Investigation Started',
      user: 'John Doe',
      details: 'Senior analyst assigned to investigate the incident',
    },
  ],
};

const mockPlaybooks = [
  {
    id: 'playbook-1',
    name: 'Data Breach Response',
    description: 'Standard procedures for handling data breach incidents',
    steps: [
      { id: 'step-1', title: 'Immediate Containment', status: 'completed' },
      { id: 'step-2', title: 'Evidence Collection', status: 'in_progress' },
      { id: 'step-3', title: 'Forensic Analysis', status: 'pending' },
      { id: 'step-4', title: 'Legal Notification', status: 'pending' },
    ],
  },
  {
    id: 'playbook-2',
    name: 'Malware Incident Response',
    description: 'Procedures for malware detection and remediation',
    steps: [
      { id: 'step-1', title: 'Isolate Affected Systems', status: 'pending' },
      { id: 'step-2', title: 'Malware Analysis', status: 'pending' },
      { id: 'step-3', title: 'System Remediation', status: 'pending' },
    ],
  },
];

// Mock GraphQL queries
const mockIncidentQuery = {
  request: {
    query: expect.any(Object),
    variables: { id: 'inc-123' },
  },
  result: {
    data: {
      incident: mockIncident,
    },
  },
};

const mockPlaybooksQuery = {
  request: {
    query: expect.any(Object),
  },
  result: {
    data: {
      playbooks: mockPlaybooks,
    },
  },
};

const mockUpdateIncidentMutation = {
  request: {
    query: expect.any(Object),
    variables: {
      id: 'inc-123',
      input: expect.any(Object),
    },
  },
  result: {
    data: {
      updateIncident: {
        ...mockIncident,
        status: 'RESOLVED',
        updated_at: new Date().toISOString(),
      },
    },
  },
};

describe('IncidentResponseWorkflow', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders incident details correctly', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Critical Security Breach - Data Exfiltration')).toBeInTheDocument();
    });

    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('INVESTIGATING')).toBeInTheDocument();
    expect(screen.getByText('security-team@company.com')).toBeInTheDocument();
  });

  it('displays incident timeline', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Incident Timeline')).toBeInTheDocument();
    });

    expect(screen.getByText('Incident Created')).toBeInTheDocument();
    expect(screen.getByText('Investigation Started')).toBeInTheDocument();
    expect(screen.getByText('SOC Analyst')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows related security events', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Related Events')).toBeInTheDocument();
    });

    expect(screen.getByText('MALWARE_DETECTED')).toBeInTheDocument();
    expect(screen.getByText('DATA_EXFILTRATION')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
  });

  it('displays affected assets', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Affected Assets')).toBeInTheDocument();
    });

    expect(screen.getByText('SERVER-DB-001')).toBeInTheDocument();
    expect(screen.getByText('WORKSTATION-042')).toBeInTheDocument();
  });

  it('allows playbook selection and execution', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Response Playbooks')).toBeInTheDocument();
    });

    const playbookSelect = screen.getByRole('combobox', { name: /select playbook/i });
    await user.click(playbookSelect);
    await user.selectOptions(playbookSelect, 'playbook-1');

    await waitFor(() => {
      expect(screen.getByText('Data Breach Response')).toBeInTheDocument();
      expect(screen.getByText('Immediate Containment')).toBeInTheDocument();
      expect(screen.getByText('Evidence Collection')).toBeInTheDocument();
    });
  });

  it('tracks playbook step completion', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Data Breach Response')).toBeInTheDocument();
    });

    // Check that completed step is marked as done
    const completedStep = screen.getByText('Immediate Containment').closest('[data-testid="playbook-step"]');
    expect(completedStep).toHaveClass('step-completed');

    // Check that in-progress step is highlighted
    const inProgressStep = screen.getByText('Evidence Collection').closest('[data-testid="playbook-step"]');
    expect(inProgressStep).toHaveClass('step-in-progress');
  });

  it('allows incident status updates', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery, mockUpdateIncidentMutation],
    });

    await waitFor(() => {
      expect(screen.getByText('INVESTIGATING')).toBeInTheDocument();
    });

    const statusSelect = screen.getByRole('combobox', { name: /status/i });
    await user.click(statusSelect);
    await user.selectOptions(statusSelect, 'RESOLVED');

    const updateButton = screen.getByRole('button', { name: /update status/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('RESOLVED')).toBeInTheDocument();
    });
  });

  it('handles incident assignment', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('security-team@company.com')).toBeInTheDocument();
    });

    const assignButton = screen.getByRole('button', { name: /reassign/i });
    await user.click(assignButton);

    await waitFor(() => {
      expect(screen.getByText('Assign Incident')).toBeInTheDocument();
    });

    const assigneeInput = screen.getByRole('textbox', { name: /assignee/i });
    await user.type(assigneeInput, 'senior-analyst@company.com');

    const confirmButton = screen.getByRole('button', { name: /confirm assignment/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('senior-analyst@company.com')).toBeInTheDocument();
    });
  });

  it('supports adding timeline entries', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Incident Timeline')).toBeInTheDocument();
    });

    const addTimelineButton = screen.getByRole('button', { name: /add timeline entry/i });
    await user.click(addTimelineButton);

    await waitFor(() => {
      expect(screen.getByText('Add Timeline Entry')).toBeInTheDocument();
    });

    const actionInput = screen.getByRole('textbox', { name: /action/i });
    await user.type(actionInput, 'Forensic evidence collected');

    const detailsInput = screen.getByRole('textbox', { name: /details/i });
    await user.type(detailsInput, 'Memory dump and disk images captured from affected systems');

    const saveButton = screen.getByRole('button', { name: /save entry/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Forensic evidence collected')).toBeInTheDocument();
    });
  });

  it('displays communication templates', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Communication')).toBeInTheDocument();
    });

    const communicationTab = screen.getByRole('tab', { name: /communication/i });
    await user.click(communicationTab);

    await waitFor(() => {
      expect(screen.getByText('Stakeholder Notification')).toBeInTheDocument();
      expect(screen.getByText('Legal Team Alert')).toBeInTheDocument();
      expect(screen.getByText('Customer Notification')).toBeInTheDocument();
    });
  });

  it('handles incident escalation', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Priority: 1')).toBeInTheDocument();
    });

    const escalateButton = screen.getByRole('button', { name: /escalate/i });
    await user.click(escalateButton);

    await waitFor(() => {
      expect(screen.getByText('Escalate Incident')).toBeInTheDocument();
      expect(screen.getByText('Escalation Reason')).toBeInTheDocument();
    });
  });

  it('generates incident report', async () => {
    render(<IncidentResponseWorkflow incidentId="inc-123" />, {
      apolloMocks: [mockIncidentQuery, mockPlaybooksQuery],
    });

    await waitFor(() => {
      expect(screen.getByText('Critical Security Breach - Data Exfiltration')).toBeInTheDocument();
    });

    const generateReportButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateReportButton);

    await waitFor(() => {
      expect(screen.getByText('Incident Report Preview')).toBeInTheDocument();
      expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      expect(screen.getByText('Lessons Learned')).toBeInTheDocument();
    });
  });
});