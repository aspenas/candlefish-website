import { useState } from 'react';
import { Plus, Search, Filter, MoreVertical, UserX, Eye, Mail } from 'lucide-react';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { InviteContractorDialog } from '@/components/contractors/invite-contractor-dialog';
import { ContractorTable } from '@/components/contractors/contractor-table';
import { ContractorStats } from '@/components/contractors/contractor-stats';
import { useContractors } from '@/hooks/use-contractors';
import { formatNumber, getStatusColor } from '@/lib/utils';

export default function ContractorsPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'REVOKED'>('all');
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);

  const {
    contractors,
    totalCount,
    loading,
    error,
    activeContractors,
    pendingContractors,
    expiredContractors,
    inviteContractor,
    revokeAccess,
    bulkRevokeAccess,
    inviting,
    revoking,
    bulkRevoking,
  } = useContractors({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  });

  const handleInviteContractor = async (data: any) => {
    await inviteContractor(data);
    setShowInviteDialog(false);
  };

  const handleRevokeAccess = async (contractorId: string) => {
    await revokeAccess(contractorId);
  };

  const handleBulkRevoke = async () => {
    if (selectedContractors.length > 0) {
      await bulkRevokeAccess(selectedContractors);
      setSelectedContractors([]);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status', count: totalCount },
    { value: 'ACTIVE', label: 'Active', count: activeContractors },
    { value: 'PENDING', label: 'Pending', count: pendingContractors },
    { value: 'EXPIRED', label: 'Expired', count: expiredContractors },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Contractors
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage temporary access for external contractors and partners
            </p>
          </div>
          <Button onClick={() => setShowInviteDialog(true)} disabled={inviting}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Contractor
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contractors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalCount)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatNumber(activeContractors)}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatNumber(pendingContractors)}</div>
              <p className="text-xs text-muted-foreground">Awaiting activation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatNumber(expiredContractors)}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search contractors..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex gap-2">
                  {statusOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={statusFilter === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(option.value as any)}
                    >
                      {option.label}
                      {option.count > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {option.count}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedContractors.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkRevoke}
                    disabled={bulkRevoking}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Revoke Access ({selectedContractors.length})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {loading && contractors.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" text="Loading contractors..." />
              </div>
            ) : error && contractors.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Failed to load contractors: {error.message}</p>
              </div>
            ) : contractors.length === 0 ? (
              <div className="text-center py-12">
                <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No contractors found
                </h3>
                <p className="text-gray-500 mb-4">
                  {search || statusFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Get started by inviting your first contractor.'
                  }
                </p>
                {!search && statusFilter === 'all' && (
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Contractor
                  </Button>
                )}
              </div>
            ) : (
              <ContractorTable
                contractors={contractors}
                selectedContractors={selectedContractors}
                onSelectionChange={setSelectedContractors}
                onRevokeAccess={handleRevokeAccess}
                loading={revoking}
              />
            )}
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <ContractorStats contractors={contractors} />
      </div>

      {/* Invite Dialog */}
      <InviteContractorDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={handleInviteContractor}
        loading={inviting}
      />
    </MainLayout>
  );
}
