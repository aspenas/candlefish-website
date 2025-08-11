import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatRelativeTime, getStatusColor } from '@/lib/utils';
import { UserX, Eye, Mail, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contractor {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  lastAccess?: string;
  remainingDays: number;
  isActive: boolean;
  accessCount: number;
}

interface ContractorTableProps {
  contractors: Contractor[];
  selectedContractors: string[];
  onSelectionChange: (selected: string[]) => void;
  onRevokeAccess: (id: string) => void;
  loading?: boolean;
}

export function ContractorTable({
  contractors,
  selectedContractors,
  onSelectionChange,
  onRevokeAccess,
  loading = false,
}: ContractorTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(contractors.map(c => c.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectContractor = (contractorId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedContractors, contractorId]);
    } else {
      onSelectionChange(selectedContractors.filter(id => id !== contractorId));
    }
  };

  const isAllSelected = contractors.length > 0 && selectedContractors.length === contractors.length;
  const isIndeterminate = selectedContractors.length > 0 && selectedContractors.length < contractors.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) input.indeterminate = isIndeterminate;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded"
              />
            </th>
            <th className="text-left p-3 font-medium">Contractor</th>
            <th className="text-left p-3 font-medium">Company</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Access</th>
            <th className="text-left p-3 font-medium">Expires</th>
            <th className="text-left p-3 font-medium">Last Access</th>
            <th className="text-left p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contractors.map((contractor) => (
            <tr key={contractor.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="p-3">
                <input
                  type="checkbox"
                  checked={selectedContractors.includes(contractor.id)}
                  onChange={(e) => handleSelectContractor(contractor.id, e.target.checked)}
                  className="rounded"
                />
              </td>

              <td className="p-3">
                <div>
                  <p className="font-medium">{contractor.name}</p>
                  <p className="text-sm text-muted-foreground">{contractor.email}</p>
                </div>
              </td>

              <td className="p-3">
                <p className="text-sm">{contractor.company}</p>
              </td>

              <td className="p-3">
                <Badge className={cn('text-xs', getStatusColor(contractor.status))}>
                  {contractor.status}
                </Badge>
              </td>

              <td className="p-3">
                <div>
                  <p className="text-sm font-medium">{contractor.accessCount} times</p>
                  <p className="text-xs text-muted-foreground">
                    {contractor.remainingDays} days left
                  </p>
                </div>
              </td>

              <td className="p-3">
                <p className="text-sm">{formatDate(contractor.expiresAt)}</p>
              </td>

              <td className="p-3">
                <p className="text-sm">
                  {contractor.lastAccess
                    ? formatRelativeTime(contractor.lastAccess)
                    : 'Never'
                  }
                </p>
              </td>

              <td className="p-3">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Mail className="h-4 w-4" />
                  </Button>
                  {contractor.status === 'ACTIVE' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRevokeAccess(contractor.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
